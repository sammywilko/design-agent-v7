
import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Loader2, Sparkles, Upload, X, Settings, User, Save, Plus, Trash2, Library, Copy, ScanEye, Folder, ChevronDown, Globe, Film, Square, Star, BookOpen, Wand2, Zap, FileText, Palette } from 'lucide-react';
import { consultDirector, generateImage, extractStyleDNA, enhancePrompt } from '../services/gemini';
import { db } from '../services/db';
import { Message, GeneratedImage, DirectorResponse, AspectRatio, ImageResolution, ReferenceAsset, ReferenceType, SavedEntity, Campaign, Project, SavedPrompt, CharacterProfile, ProductionDesign } from '../types';
import ReactMarkdown from 'react-markdown';
import CoverageModal from './CoverageModal';

interface StageOneProps {
  onImageSelect: (image: GeneratedImage) => void;
  showNotification: (msg: string) => void;
  onImageGenerated?: (images: GeneratedImage[]) => void;
  currentProject: Project;
  onLibraryUpdate: () => void;
  incomingPrompt?: { prompt: string, refs: any[] } | null;
  onClearIncomingPrompt?: () => void;
  onSendToScript?: (image: GeneratedImage) => void;
  onSendToStoryboard?: (image: GeneratedImage) => void; // Quick add to storyboard
  bibleCharacters?: CharacterProfile[];
  productionDesign?: ProductionDesign; // Lookbook style injection
}

const DEFAULT_CAMPAIGN: Campaign = { id: 'default', name: 'General Workspace' };
const MAX_REFERENCES = 14;

// Nano Banana Power Tool Templates
const NANO_POWER_TOOLS = [
    { 
        id: 'infographic', 
        label: 'Deep-Dive Infographic', 
        icon: '📊', 
        placeholder: 'Topic (e.g., History of LLMs)',
        prompt: 'Create a dense, professional infographic about [TOPIC]. First, use Gemini reasoning to research key milestones and facts. Then, generate a visual layout that includes a timeline, a clear legend, color-coded sections, and accurate terminology. Ensure all text is perfectly legible and the design uses a clean, modern aesthetic.', 
        instruction: 'Focus on data visualization, factual accuracy, and typographic hierarchy. Use vector-style graphics.' 
    },
    { 
        id: 'flowchart', 
        label: 'Wacky Flowchart', 
        icon: '🔀', 
        placeholder: 'Process (e.g., Making Coffee)',
        prompt: 'Generate a humorous, over-the-top flowchart explaining "[TOPIC]". Use a chaotic but readable layout with funny labels, illustrative icons for each step, and clever jokes in the copy. Style: Hand-drawn doodle aesthetic on a whiteboard or notebook paper.', 
        instruction: 'Prioritize humor and visual storytelling. Ensure the logic flow is visually traceable with arrows.' 
    },
    { 
        id: 'comparison', 
        label: 'Comparison Chart', 
        icon: '⚖️', 
        placeholder: 'Products (e.g., Vacuums under $300)',
        prompt: 'Create a product comparison chart for "[TOPIC]". Use Search to find 3-5 top real-world models. Display them side-by-side with columns for "Pros", "Cons", and "Price". Render realistic product images for each column. Ensure text is crisp.', 
        instruction: 'Use a clean grid layout. Fetch real-world data to populate the text. Ensure product renderings match real-world designs.' 
    },
    { 
        id: 'layout', 
        label: 'Magazine Spread', 
        icon: '📰', 
        placeholder: 'Article Title / Subject',
        prompt: 'Design a high-end double-page magazine spread titled "[TOPIC]". Layout: 3-column text, dramatic pull-quotes, and a full-bleed hero photograph on the left page. Typography should be serif for body, sans-serif for headers. Aesthetic: Vogue/Wired style.', 
        instruction: 'Ensure typographic hierarchy, whitespace balance, and editorial design standards. Render "lorem ipsum" or plausible text blocks.' 
    },
    { 
        id: 'character', 
        label: 'Character Sheet', 
        icon: '👤', 
        placeholder: 'Character Name & Description',
        prompt: 'Generate a production-ready character reference sheet for: [TOPIC]. Include full-body Front, Side, and 3/4 views on a neutral background. Maintain strict identity consistency (facial features, clothing details) across all angles.', 
        instruction: 'Use orthographic projection principles. Neutral lighting. No dramatic poses, focus on design clarity.' 
    },
    { 
        id: 'product', 
        label: 'Product Hero Shot', 
        icon: '🛍️', 
        placeholder: 'Product Name/Type',
        prompt: 'Cinematic product photography of [TOPIC] in a luxury studio setting. Lighting: Softbox key light from left, rim light from right. Camera: 85mm lens, f/2.8. Focus on material textures (glass, metal, matte plastic).', 
        instruction: 'Photorealism is paramount. Simulate sub-surface scattering and accurate reflections.' 
    },
    { 
        id: 'blueprint', 
        label: 'Technical Blueprint', 
        icon: '📐', 
        placeholder: 'Object (e.g., Jet Engine)',
        prompt: 'Technical schematic blueprint of [TOPIC]. Style: White technical lines on a classic cyan/blue grid background. Include exploded view components with leader lines and labels. Isometric perspective.', 
        instruction: 'Precise geometry, industrial design aesthetic. Ensure lines are sharp and vector-like.' 
    },
    { 
        id: 'guide', 
        label: 'Instructional Guide', 
        icon: '📝', 
        placeholder: 'Task (e.g., CPR steps)',
        prompt: 'Create a step-by-step visual guide for: [TOPIC]. Divide the image into clear numbered panels (1, 2, 3, 4). Each panel should have a visual illustration of the action and a brief text label. Style: Clean safety-manual vector art.', 
        instruction: 'Focus on clarity and sequential storytelling. Text must be legible.' 
    },
];

// Interactive Modal for Power Tools
const PowerToolInputModal = ({ tool, onClose, onApply }: { tool: any, onClose: () => void, onApply: (val: string) => void }) => {
    const [val, setVal] = useState('');
    return (
        <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-8 backdrop-blur-md animate-in fade-in">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5"/></button>
                <div className="flex items-center gap-3 mb-4 text-violet-300">
                    <span className="text-2xl">{tool.icon}</span>
                    <h3 className="font-bold">{tool.label}</h3>
                </div>
                <p className="text-zinc-400 text-sm mb-4">Customize your template:</p>
                <input 
                    autoFocus
                    type="text" 
                    value={val} 
                    onChange={(e) => setVal(e.target.value)} 
                    placeholder={tool.placeholder}
                    className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white focus:border-violet-500 outline-none mb-4"
                    onKeyDown={(e) => e.key === 'Enter' && val && onApply(val)}
                />
                <button 
                    onClick={() => val && onApply(val)} 
                    disabled={!val}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl disabled:opacity-50"
                >
                    Generate Prompt
                </button>
            </div>
        </div>
    );
}

const StageOne: React.FC<StageOneProps> = ({
    onImageSelect,
    showNotification,
    onImageGenerated,
    currentProject,
    onLibraryUpdate,
    incomingPrompt,
    onClearIncomingPrompt,
    onSendToScript,
    onSendToStoryboard,
    bibleCharacters = [],
    productionDesign
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSavedPrompts, setShowSavedPrompts] = useState(false);
  const [showPowerTools, setShowPowerTools] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // Power Tool Modal State
  const [selectedTool, setSelectedTool] = useState<typeof NANO_POWER_TOOLS[0] | null>(null);

  // @mention autocomplete state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<ImageResolution>('1K');
  const [imageCount, setImageCount] = useState<number>(1);
  const [useGrounding, setUseGrounding] = useState(false);
  const [useLookbook, setUseLookbook] = useState(true); // Toggle for Production Design style injection
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [customInstructions, setCustomInstructions] = useState('');
  
  const [showCoverageModal, setShowCoverageModal] = useState(false);
  const [coverageSourceImage, setCoverageSourceImage] = useState<GeneratedImage | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([DEFAULT_CAMPAIGN]);
  const [currentCampaignId, setCurrentCampaignId] = useState<string>('default');

  const [savedEntities, setSavedEntities] = useState<SavedEntity[]>([]);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);

  const [processingRefId, setProcessingRefId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const isCancelledRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
        try {
            const msgs = await db.getMessages(currentProject.id);
            setMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
            const library = await db.getLibrary(currentProject.id);
            setSavedEntities(library);
            const prompts = await db.getSavedPrompts(currentProject.id);
            setSavedPrompts(prompts.sort((a, b) => b.createdAt - a.createdAt));
        } catch (e) { console.error(e); }
    };
    loadData();
  }, [currentProject.id]);

  useEffect(() => {
      if (incomingPrompt) {
          setInput(incomingPrompt.prompt);
          setReferences(incomingPrompt.refs);
          if (onClearIncomingPrompt) onClearIncomingPrompt();
      }
  }, [incomingPrompt]);
  
  useEffect(() => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const savedSettings = localStorage.getItem(`design-agent-settings-${currentProject.id}`);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setCustomInstructions(parsed.customInstructions || '');
      setCampaigns(parsed.campaigns?.length ? parsed.campaigns : [DEFAULT_CAMPAIGN]);
      setCurrentCampaignId(parsed.currentCampaignId || 'default');
    }
  }, [currentProject.id]);

  useEffect(() => {
    localStorage.setItem(`design-agent-settings-${currentProject.id}`, JSON.stringify({ 
        customInstructions, campaigns, currentCampaignId
    }));
  }, [customInstructions, campaigns, currentCampaignId, currentProject.id]);

  const addMessageToStateAndDb = async (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      await db.saveMessage(msg);
  };

  const processFiles = async (files: FileList | File[]) => {
      const currentCount = references.length;
      if (currentCount + files.length > MAX_REFERENCES) {
          showNotification(`Limit reached: Max ${MAX_REFERENCES} references allowed.`);
          return;
      }
      const newRefs: ReferenceAsset[] = [];
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
              await new Promise<void>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                      newRefs.push({ id: crypto.randomUUID(), data: reader.result as string, type: 'General', name: file.name });
                      resolve();
                  };
                  reader.readAsDataURL(file);
              });
          }
      }
      if (newRefs.length > 0) {
          setReferences(prev => [...prev, ...newRefs]);
          showNotification(`Added ${newRefs.length} reference(s)`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ... (Keeping library file processing same as before) ...
  const processLibraryFiles = async (files: FileList | File[]) => {
      const newEntities: SavedEntity[] = [];
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.startsWith('image/')) {
              await new Promise<void>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = async () => {
                      const entity: SavedEntity = {
                          id: crypto.randomUUID(), projectId: currentProject.id, name: file.name, data: reader.result as string,
                          type: 'General', campaignId: currentCampaignId, createdAt: Date.now()
                      };
                      await db.saveLibraryItem(entity);
                      newEntities.push(entity);
                      resolve();
                  };
                  reader.readAsDataURL(file);
              });
          }
      }
      if (newEntities.length > 0) {
          setSavedEntities(prev => [...prev, ...newEntities]);
          onLibraryUpdate();
          showNotification(`Added ${newEntities.length} asset(s) to library`);
      }
      if (libraryInputRef.current) libraryInputRef.current.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
  };

  const handleLibraryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processLibraryFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
  };

  const handleLibraryDrop = (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processLibraryFiles(e.dataTransfer.files);
  };

  const removeReference = (id: string) => { setReferences(prev => prev.filter(r => r.id !== id)); };
  const updateReferenceType = (id: string, newType: ReferenceType) => { setReferences(prev => prev.map(r => r.id === id ? { ...r, type: newType } : r)); };

  const updateLibraryItemType = async (id: string, newType: ReferenceType) => {
      const updatedEntities = savedEntities.map(e => e.id === id ? { ...e, type: newType } : e);
      setSavedEntities(updatedEntities);
      const entityToUpdate = updatedEntities.find(e => e.id === id);
      if (entityToUpdate) {
          await db.saveLibraryItem(entityToUpdate);
          onLibraryUpdate();
          showNotification(`Updated to ${newType}`);
      }
  };

  const extractStyle = async (ref: ReferenceAsset) => {
      setProcessingRefId(ref.id);
      try {
          const dna = await extractStyleDNA(ref.data);
          setReferences(prev => prev.map(r => r.id === ref.id ? { ...r, type: 'Style', styleDescription: dna, name: 'Extracted Style DNA' } : r));
          showNotification("Style DNA Extracted!");
      } catch (e) { showNotification("Failed to extract style."); } 
      finally { setProcessingRefId(null); }
  };

  const addToLibrary = async (ref: ReferenceAsset) => {
     const defaultName = ref.type === 'Style' ? 'New Style' : 'New Asset';
     const name = prompt("Name this asset:", defaultName);
     if (!name) return;
     const entity: SavedEntity = { id: crypto.randomUUID(), projectId: currentProject.id, name, data: ref.data, type: ref.type, styleDescription: ref.styleDescription, campaignId: currentCampaignId, createdAt: Date.now() };
     await db.saveLibraryItem(entity);
     setSavedEntities(prev => [...prev, entity]);
     onLibraryUpdate();
     showNotification("Saved to Library");
  };

  const saveGeneratedToLibrary = async (img: GeneratedImage) => {
    const defaultName = img.prompt.slice(0, 20) + '...';
    const name = prompt("Name this generated asset:", defaultName);
    if (!name) return;
    const entity: SavedEntity = { id: crypto.randomUUID(), projectId: currentProject.id, name, data: img.url, type: 'General', campaignId: currentCampaignId, createdAt: Date.now() };
    await db.saveLibraryItem(entity);
    setSavedEntities(prev => [...prev, entity]);
    onLibraryUpdate();
    showNotification("Saved to Library");
  };
  
  const deleteFromLibrary = async (id: string) => {
      if (confirm("Delete this asset?")) {
        await db.deleteLibraryItem(id);
        setSavedEntities(prev => prev.filter(e => e.id !== id));
        onLibraryUpdate();
      }
  };

  const loadFromLibrary = (entity: SavedEntity) => {
      if (references.length >= MAX_REFERENCES) {
          showNotification(`Limit reached.`);
          return;
      }
      const newRef: ReferenceAsset = { id: crypto.randomUUID(), data: entity.data, type: entity.type, name: entity.name, styleDescription: entity.styleDescription };
      setReferences(prev => [...prev, newRef]);
      setShowLibrary(false);
      showNotification("Asset loaded");
  };

  const createCampaign = () => {
      const name = prompt("Enter new Campaign name:");
      if (name) {
          const newCamp = { id: crypto.randomUUID(), name };
          setCampaigns(prev => [...prev, newCamp]);
          setCurrentCampaignId(newCamp.id);
          showNotification(`Campaign "${name}" created`);
      }
  };
  
  const reuseGeneratedImage = (img: GeneratedImage) => {
      if (references.length >= MAX_REFERENCES) {
          showNotification(`Limit reached.`);
          return;
      }
      const newRef: ReferenceAsset = { id: crypto.randomUUID(), data: img.url, type: 'General', name: 'Generated Asset' };
      setReferences(prev => [...prev, newRef]);
      showNotification("Added as Reference");
  };

  const savePrompt = async (text: string) => {
      const exists = savedPrompts.find(p => p.text === text);
      if (exists) { showNotification("Prompt already saved."); return; }
      const newPrompt: SavedPrompt = { id: crypto.randomUUID(), projectId: currentProject.id, text, createdAt: Date.now() };
      await db.savePrompt(newPrompt);
      setSavedPrompts(prev => [newPrompt, ...prev]);
      showNotification("Prompt Saved!");
  };

  const deletePrompt = async (id: string) => {
      await db.deletePrompt(id);
      setSavedPrompts(prev => prev.filter(p => p.id !== id));
  };

  const loadPrompt = (text: string) => {
      setInput(text);
      setShowSavedPrompts(false);
  };

  const applyPowerTool = (tool: typeof NANO_POWER_TOOLS[0]) => {
      setSelectedTool(tool);
      setShowPowerTools(false);
  };

  const finalizePowerTool = (userInput: string) => {
      if (!selectedTool) return;
      let promptText = selectedTool.prompt.replace('[TOPIC]', userInput);
      
      setInput(promptText);
      setCustomInstructions(prev => prev ? `${prev}\n${selectedTool.instruction}` : selectedTool.instruction);
      setSelectedTool(null);
      
      if (selectedTool.id === 'infographic' || selectedTool.id === 'comparison') {
          setUseGrounding(true);
          showNotification(`${selectedTool.label} + Search Active`);
      } else {
          showNotification(`${selectedTool.label} Mode Active`);
      }
  };

  const handleEnhancePrompt = async () => {
      if (!input.trim()) return;
      setIsEnhancing(true);
      try {
          const enhanced = await enhancePrompt(input);
          setInput(enhanced);
          showNotification("Prompt Enhanced!");
      } catch (e) { showNotification("Failed to enhance prompt."); } 
      finally { setIsEnhancing(false); }
  };

  const runCoverageGeneration = async (config: { framing: string[], lenses: string[], angles: string[] }) => {
      if (!coverageSourceImage) return;
      const allVariations = [...config.framing, ...config.lenses, ...config.angles];
      if (allVariations.length === 0) { showNotification("Please select at least one option."); return; }

      const sourceRef: ReferenceAsset = { id: crypto.randomUUID(), data: coverageSourceImage.url, type: 'General', name: 'Source for Coverage' };
      const userMsg: Message = { id: crypto.randomUUID(), projectId: currentProject.id, role: 'user', content: `Generate coverage variations: ${allVariations.join(', ')}`, timestamp: Date.now(), images: [{ id: coverageSourceImage.id, projectId: currentProject.id, url: coverageSourceImage.url, prompt: 'Source', aspectRatio: 'custom' }] };
      await addMessageToStateAndDb(userMsg);
      
      setIsProcessing(true);
      const generatedShots: GeneratedImage[] = [];

      try {
          setLoadingPhase(`Planning ${allVariations.length} shots...`);
          for (let i = 0; i < allVariations.length; i++) {
              if (isCancelledRef.current) break;
              const variant = allVariations[i];
              setLoadingPhase(`Shooting ${variant} (${i + 1}/${allVariations.length})...`);
              const prompt = `Strict Reference. Re-shoot the scene in Reference 1 as a ${variant}. Maintain the exact character, lighting, and environment. Only change the camera framing/focal length to match: ${variant}.`;
              try {
                  const img = await generateImage(prompt, [sourceRef], { aspectRatio: coverageSourceImage.aspectRatio as AspectRatio, resolution: '2K' }, false);
                  img.prompt = `${variant}`;
                  img.projectId = currentProject.id;
                  generatedShots.push(img);
              } catch (e) { console.error(`Failed to generate ${variant}`, e); }
          }

          if (generatedShots.length > 0) {
              const resultMsg: Message = { id: crypto.randomUUID(), projectId: currentProject.id, role: 'model', content: `Shot coverage sequence complete.`, timestamp: Date.now(), images: generatedShots };
              await addMessageToStateAndDb(resultMsg);
              showNotification("Coverage sequence complete");
              if (onImageGenerated) onImageGenerated(generatedShots);
          } else if (isCancelledRef.current) { showNotification("Stopped."); } 
          else { showNotification("Failed to generate shots."); }

      } catch (error) { showNotification("Error during coverage generation"); } 
      finally {
          setIsProcessing(false);
          setLoadingPhase('');
          setCoverageSourceImage(null);
          setShowCoverageModal(false);
          isCancelledRef.current = false;
      }
  };

  const openCoverageModal = (img: GeneratedImage) => {
    setCoverageSourceImage(img);
    setShowCoverageModal(true);
  };

  const handleStop = () => { isCancelledRef.current = true; setIsProcessing(false); setLoadingPhase(''); showNotification("Stopped"); };

  // @mention autocomplete handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);

    // Check if we're typing an @mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch && bibleCharacters.length > 0) {
      setShowMentions(true);
      setMentionFilter(atMatch[1].toLowerCase());
      setMentionCursorPos(cursorPos);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (character: CharacterProfile) => {
    const textBeforeCursor = input.slice(0, mentionCursorPos);
    const textAfterCursor = input.slice(mentionCursorPos);
    const atPos = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, atPos) + '@' + character.name + ' ' + textAfterCursor;
    setInput(newText);
    setShowMentions(false);
  };

  const filteredCharacters = bibleCharacters.filter(c =>
    c.name.toLowerCase().includes(mentionFilter)
  );

  // Parse @mentions and inject character references
  const parseAndInjectMentions = (): ReferenceAsset[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = input.match(mentionRegex) || [];
    const injectedRefs: ReferenceAsset[] = [];

    for (const mention of mentions) {
      const charName = mention.slice(1).toLowerCase(); // Remove @ and lowercase
      const character = bibleCharacters.find(c => c.name.toLowerCase() === charName);

      if (character) {
        // Collect all available refs for this character
        const allRefs: string[] = [];

        // Priority 1: Character Sheet (best for consistency)
        if (character.characterSheet) {
          allRefs.push(character.characterSheet);
        }

        // Priority 2: Categorized refs (refCoverage)
        if (character.refCoverage) {
          // Prefer 3/4 view for general use, then face, fullBody, action
          const coverageOrder: Array<'threeQuarter' | 'face' | 'fullBody' | 'action'> = ['threeQuarter', 'face', 'fullBody', 'action'];
          for (const category of coverageOrder) {
            const refs = character.refCoverage[category];
            if (refs && refs.length > 0) {
              allRefs.push(...refs);
            }
          }
        }

        // Priority 3: Legacy imageRefs
        if (character.imageRefs && character.imageRefs.length > 0) {
          allRefs.push(...character.imageRefs);
        }

        // Deduplicate and limit to 3 refs
        const uniqueRefs = [...new Set(allRefs)].slice(0, 3);

        if (uniqueRefs.length > 0) {
          // Add first reference with prompt snippet
          injectedRefs.push({
            id: `mention-${character.id}`,
            data: uniqueRefs[0],
            type: 'Character',
            name: character.name,
            styleDescription: character.promptSnippet
          });

          // Add additional refs for better consistency
          for (let i = 1; i < uniqueRefs.length; i++) {
            injectedRefs.push({
              id: `mention-${character.id}-${i}`,
              data: uniqueRefs[i],
              type: 'Character',
              name: `${character.name} (ref ${i + 1})`
            });
          }
        }
      }
    }

    return injectedRefs;
  };

  const handleSend = async () => {
    if ((!input.trim() && references.length === 0) || isProcessing) return;

    // Inject @mentioned character references
    const mentionRefs = parseAndInjectMentions();
    
    // Inject Production Design style references (moodboard images) - only if Lookbook is enabled
    const styleRefs: ReferenceAsset[] = [];
    if (useLookbook && productionDesign?.styleRefs && productionDesign.styleRefs.length > 0) {
      productionDesign.styleRefs.forEach((ref, i) => {
        styleRefs.push({
          id: `style-ref-${i}`,
          data: ref,
          type: 'Style',
          name: `Style Reference ${i + 1}`
        });
      });
    }
    
    const allReferences = [...references, ...mentionRefs, ...styleRefs].slice(0, MAX_REFERENCES);

    // Build Production Design style context - only if Lookbook is enabled
    let styleContext = '';
    if (useLookbook && productionDesign) {
      const parts = [];
      if (productionDesign.visualStyle) parts.push(`VISUAL STYLE: ${productionDesign.visualStyle}`);
      if (productionDesign.colorPalette) parts.push(`COLOR PALETTE: ${productionDesign.colorPalette}`);
      if (productionDesign.cameraLanguage) parts.push(`CAMERA LANGUAGE: ${productionDesign.cameraLanguage}`);
      if (productionDesign.lightingApproach) parts.push(`LIGHTING: ${productionDesign.lightingApproach}`);
      if (parts.length > 0) {
        styleContext = `\n\n=== MANDATORY PRODUCTION DESIGN (Apply to ALL generations) ===\n${parts.join('\n')}\n===\n`;
      }
    }

    // Clean @mentions from prompt and add character context
    let processedPrompt = input;
    const mentionedNames = (input.match(/@(\w+)/g) || []).map(m => m.slice(1));

    if (mentionedNames.length > 0) {
      const charContexts = mentionedNames.map(name => {
        const char = bibleCharacters.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (char?.promptSnippet) return `[${char.name}: ${char.promptSnippet}]`;
        return `[${name}]`;
      }).join(' ');
      processedPrompt = `${input}\n\nCharacter References: ${charContexts}`;
    }

    // Inject style context into prompt
    if (styleContext) {
      processedPrompt = styleContext + processedPrompt;
    }

    const userMsg: Message = { id: crypto.randomUUID(), projectId: currentProject.id, role: 'user', content: input, timestamp: Date.now(), images: allReferences.map(r => ({ id: r.id, projectId: currentProject.id, url: r.data, prompt: `${r.type}: ${r.name || 'Reference'}${r.styleDescription ? ' (DNA)' : ''}`, aspectRatio: '1:1' })) };
    await addMessageToStateAndDb(userMsg);
    setInput('');
    isCancelledRef.current = false;
    setIsProcessing(true);
    setLoadingPhase('Consulting Design Director...');

    try {
      const directorResponse: DirectorResponse = await consultDirector(processedPrompt, allReferences, imageCount, customInstructions);
      if (isCancelledRef.current) return;

      const analysisMsg: Message = { id: crypto.randomUUID(), projectId: currentProject.id, role: 'model', content: directorResponse.analysis, timestamp: Date.now() };
      await addMessageToStateAndDb(analysisMsg);

      const promptsToRun = directorResponse.imagePrompts.slice(0, imageCount);
      setLoadingPhase(`Rendering ${promptsToRun.length} concepts at ${resolution}${useGrounding ? ' (Search On)' : ''}...`);
      const generatedImages: GeneratedImage[] = [];

      for (const prompt of promptsToRun) {
        if (isCancelledRef.current) break;
        try {
            const img = await generateImage(prompt, allReferences, { aspectRatio, resolution }, useGrounding);
            if (isCancelledRef.current) break;
            img.projectId = currentProject.id;
            generatedImages.push(img);
        } catch (e) { console.error("Gen failed:", e); }
      }

      if (isCancelledRef.current && generatedImages.length === 0) return;

      if (generatedImages.length > 0) {
        const imageMsg: Message = { id: crypto.randomUUID(), projectId: currentProject.id, role: 'model', content: "Here are the visual assets.", timestamp: Date.now(), images: generatedImages };
        await addMessageToStateAndDb(imageMsg);
        if (onImageGenerated) onImageGenerated(generatedImages);
      } else if (!isCancelledRef.current) {
         const errorMsg: Message = { id: crypto.randomUUID(), projectId: currentProject.id, role: 'model', content: "I analyzed the concept but failed to generate visual assets.", timestamp: Date.now() };
         await addMessageToStateAndDb(errorMsg);
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        const errorMsg: Message = { id: crypto.randomUUID(), projectId: currentProject.id, role: 'model', content: "An error occurred. Check API Key.", timestamp: Date.now() };
        await addMessageToStateAndDb(errorMsg);
      }
    } finally { setIsProcessing(false); setLoadingPhase(''); }
  };

  // Add character from Bible logic? 
  // No, user wants to link existing chars in the ref bar.
  // We need to fetch characters from DB. But we can handle that by lifting state or querying here.
  // For now, I will add a "Add from Bible" button if I could, but we don't have global characters prop here easily. 
  // But wait, user said "Bring character BACK to bible". That's the onSendToScript button below.

  const currentCampaign = campaigns.find(c => c.id === currentCampaignId) || DEFAULT_CAMPAIGN;
  const filteredAssets = savedEntities.filter(e => e.campaignId === currentCampaignId);

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100 relative">
      <CoverageModal isOpen={showCoverageModal} onClose={() => setShowCoverageModal(false)} onGenerate={runCoverageGeneration} />
      
      {/* Power Tool Input Modal */}
      {selectedTool && (
          <PowerToolInputModal 
            tool={selectedTool} 
            onClose={() => setSelectedTool(null)} 
            onApply={finalizePowerTool} 
          />
      )}

      {isLightboxOpen && lightboxImage && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 backdrop-blur-xl animate-in fade-in duration-200" onClick={() => setIsLightboxOpen(false)}>
              <button onClick={() => setIsLightboxOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-8 h-8" /></button>
              <img src={lightboxImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
      )}

      {/* Nano Power Tools Menu */}
      {showPowerTools && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-4xl glass-panel border border-white/10 rounded-2xl p-6 z-40 shadow-2xl animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-4">
                  <div>
                      <h3 className="font-bold text-violet-300 flex items-center gap-2 text-lg"><Zap className="w-5 h-5 fill-current"/> Nano Power Tools (V4.0 Pro)</h3>
                      <p className="text-xs text-zinc-400 mt-1">High-fidelity generation templates powered by Gemini 3.0 Pro Image.</p>
                  </div>
                  <button onClick={() => setShowPowerTools(false)}><X className="w-5 h-5 text-zinc-400 hover:text-white"/></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {NANO_POWER_TOOLS.map(tool => (
                      <button key={tool.id} onClick={() => applyPowerTool(tool)} className="flex flex-col items-start p-4 bg-zinc-800/50 hover:bg-zinc-700/80 rounded-xl border border-white/5 hover:border-violet-500/30 transition-all group h-full">
                          <span className="text-2xl mb-2">{tool.icon}</span>
                          <span className="font-bold text-sm text-white group-hover:text-violet-200">{tool.label}</span>
                          <span className="text-[10px] text-zinc-500 line-clamp-3 text-left mt-1 leading-relaxed">{tool.instruction}</span>
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* Saved Prompts Sidebar */}
      {showSavedPrompts && (
          <div className="absolute inset-y-0 right-0 w-80 glass-panel border-l border-white/5 z-30 shadow-2xl flex flex-col transition-transform animate-in slide-in-from-right">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md">
                  <h3 className="font-semibold text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-violet-400" /> Saved Prompts</h3>
                  <button onClick={() => setShowSavedPrompts(false)}><X className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {savedPrompts.map(p => (
                      <div key={p.id} className="bg-zinc-800/50 rounded-xl p-3 border border-white/5 hover:border-violet-500/30 group transition-all">
                          <p className="text-xs text-zinc-300 line-clamp-3 mb-2 font-medium leading-relaxed">{p.text}</p>
                          <div className="flex justify-end gap-2 border-t border-white/5 pt-2">
                              <button onClick={() => loadPrompt(p.text)} className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full transition-colors">Load</button>
                              <button onClick={() => deletePrompt(p.id)} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 className="w-3 h-3" /></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Library Sidebar */}
      {showLibrary && (
          <div 
            className="absolute inset-y-0 left-0 w-80 glass-panel border-r border-white/5 z-30 shadow-2xl flex flex-col transition-transform animate-in slide-in-from-left"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
            onDrop={handleLibraryDrop}
          >
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md">
                  <div>
                      <h3 className="font-semibold text-violet-400 flex items-center gap-2 text-sm"><Folder className="w-4 h-4" /> {currentCampaign.name}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Library</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={() => libraryInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
                      <button onClick={() => setShowLibrary(false)}><X className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
                  </div>
                  <input type="file" ref={libraryInputRef} className="hidden" accept="image/*" multiple onChange={handleLibraryFileUpload} />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {filteredAssets.map(entity => (
                      <div key={entity.id} className="bg-zinc-900 rounded-xl overflow-hidden border border-white/5 group hover:border-violet-500/30 transition-all shadow-lg">
                          <div className="relative h-32">
                              <img src={entity.data} alt={entity.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-60" />
                              <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end">
                                  <span className="font-medium text-xs truncate text-white max-w-[60%]">{entity.name}</span>
                                  <select value={entity.type} onChange={(e) => updateLibraryItemType(entity.id, e.target.value as ReferenceType)} className="text-[9px] px-2 py-1 rounded-full uppercase font-bold border-none outline-none cursor-pointer bg-white/10 text-zinc-200 backdrop-blur-md hover:bg-white/20">
                                    <option value="General">General</option><option value="Character">Character</option><option value="Location">Location</option><option value="Product">Product</option><option value="Style">Style</option>
                                  </select>
                              </div>
                          </div>
                          <div className="p-2 flex gap-2">
                              <button onClick={() => loadFromLibrary(entity)} className="flex-1 bg-white text-black hover:bg-zinc-200 text-[10px] font-bold py-2 rounded-lg transition-colors uppercase tracking-wide">Load</button>
                              <button onClick={() => deleteFromLibrary(entity.id)} className="p-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"><Trash2 className="w-3 h-3" /></button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {showSettings && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="glass-panel bg-zinc-900 rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 border border-white/10">
                  <div className="flex justify-between items-center mb-8">
                      <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-violet-400" /> Preferences</h2>
                      <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="space-y-6">
                      <div className="bg-zinc-800/50 p-5 rounded-2xl border border-white/5">
                          <label className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2"><Folder className="w-4 h-4"/> Active Campaign</label>
                          <div className="flex gap-3">
                              <select value={currentCampaignId} onChange={(e) => setCurrentCampaignId(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-xl p-3 focus:border-violet-500 outline-none">
                                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <button onClick={createCampaign} className="px-4 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-zinc-200"><Plus className="w-5 h-5" /></button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-3">System Instructions</label>
                          <textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm focus:border-violet-500 outline-none placeholder-zinc-600 resize-none" placeholder="E.g., 'Always use blueprint style'..." />
                      </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                      <button onClick={() => setShowSettings(false)} className="bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-xl font-bold transition-colors">Done</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header Bar... code reduced for brevity, functionality remains */}
          <div className="h-16 border-b border-white/5 flex items-center px-6 justify-between bg-zinc-950/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-6">
                  <div className="relative group">
                     <button onClick={() => setShowLibrary(!showLibrary)} className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all border ${showLibrary ? 'bg-violet-500/20 border-violet-500/50 text-violet-200' : 'bg-zinc-900 border-white/10 hover:bg-white/5 text-zinc-300'}`}>
                         <Folder className="w-3.5 h-3.5" /> <span className="max-w-[120px] truncate">{currentCampaign.name}</span> <ChevronDown className="w-3 h-3 opacity-50" />
                     </button>
                  </div>
                  <div className="h-6 w-px bg-white/10"/>
                  <div className="flex gap-3">
                    {/* Production Design Style Toggle */}
                    {productionDesign && (productionDesign.visualStyle || productionDesign.styleRefs?.length) && (
                      <button 
                        onClick={() => setUseLookbook(!useLookbook)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                          useLookbook 
                            ? 'bg-violet-600 border-violet-500 text-white shadow-lg' 
                            : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                        title={`Style: ${productionDesign.visualStyle || 'Custom'}\n${productionDesign.styleRefs?.length || 0} reference images\nClick to toggle`}
                      >
                        <Palette className="w-3.5 h-3.5" /> {useLookbook ? 'Lookbook On' : 'Lookbook Off'}
                      </button>
                    )}
                    <button onClick={() => setUseGrounding(!useGrounding)} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${useGrounding ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                        <Globe className="w-3.5 h-3.5" /> {useGrounding ? 'Search On' : 'Search Off'}
                    </button>
                    <select value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="bg-zinc-900 text-zinc-300 text-xs rounded-xl border border-white/10 px-3 py-2 outline-none focus:border-violet-500 cursor-pointer hover:bg-white/5">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} Image{n > 1 ? 's' : ''}</option>)}
                    </select>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="bg-zinc-900 text-zinc-300 text-xs rounded-xl border border-white/10 px-3 py-2 outline-none focus:border-violet-500 cursor-pointer hover:bg-white/5">
                        <option value="1:1">1:1 Square</option><option value="16:9">16:9 Landscape</option><option value="9:16">9:16 Portrait</option><option value="4:3">4:3 Standard</option><option value="3:4">3:4 Vertical</option>
                    </select>
                    <select value={resolution} onChange={(e) => setResolution(e.target.value as ImageResolution)} className="bg-zinc-900 text-zinc-300 text-xs rounded-xl border border-white/10 px-3 py-2 outline-none focus:border-violet-500 cursor-pointer hover:bg-white/5">
                        <option value="1K">1K • Speed</option><option value="2K">2K • Detail</option><option value="4K">4K • Ultra</option>
                    </select>
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={() => setShowSavedPrompts(!showSavedPrompts)} className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"><BookOpen className="w-5 h-5" /></button>
                  <button onClick={() => setShowSettings(true)} className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"><Settings className="w-5 h-5" /></button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-40 scroll-smooth">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[65vh] text-center opacity-70 space-y-8 animate-in fade-in zoom-in duration-700">
                    <div className="relative group">
                        <div className="w-28 h-28 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/5 backdrop-blur-md group-hover:scale-105 transition-transform duration-500">
                            <Sparkles className="w-14 h-14 text-violet-400" />
                        </div>
                        <div className="absolute -bottom-3 -right-3 bg-black border border-white/10 rounded-full px-3 py-1 text-[10px] text-white font-bold shadow-lg tracking-widest">V4.0 PRO</div>
                    </div>
                    <div>
                        <h2 className="text-4xl font-extralight text-white mb-3 tracking-tighter">Design Agent</h2>
                        <p className="text-zinc-500 text-sm tracking-wide">Studio-Grade Visual Director</p>
                    </div>
                </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                <div className={`relative max-w-[80%] rounded-3xl p-6 ${msg.role === 'user' ? 'bg-white/5 border border-white/10 text-white backdrop-blur-md group' : 'bg-transparent text-zinc-100'}`}>
                  {msg.role === 'user' && (
                      <button onClick={() => savePrompt(msg.content)} className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-yellow-400 transition-all"><Star className="w-5 h-5" /></button>
                  )}
                  {msg.role === 'user' && msg.images && msg.images.length > 0 && (
                     <div className="flex flex-wrap gap-3 mb-4">
                         {msg.images.map((img, i) => (
                             <div key={i} className="flex items-center gap-3 bg-black/40 rounded-xl pr-4 overflow-hidden border border-white/5 backdrop-blur-md">
                                 <img src={img.url} className="w-10 h-10 object-cover" alt="ref" />
                                 <div className="flex flex-col py-1.5"><span className="text-[10px] opacity-80 font-bold uppercase tracking-wide">{img.prompt.split(':')[0]}</span>{img.prompt.includes('DNA') && <span className="text-[9px] text-violet-300 font-medium">Style DNA</span>}</div>
                             </div>
                         ))}
                     </div>
                  )}
                  <div className="prose prose-invert prose-sm leading-relaxed tracking-wide"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  {msg.role === 'model' && msg.images && msg.images.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                      {msg.images.map((img) => (
                        <div key={img.id} className="relative group overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 shadow-2xl transition-all hover:scale-[1.01] hover:shadow-violet-900/20 duration-300">
                          <img src={img.url} alt={img.prompt} className="w-full h-auto object-cover" />
                           <button onClick={() => { setLightboxImage(img.url); setIsLightboxOpen(true); }} className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white/70 hover:text-white hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md z-10"><ScanEye className="w-4 h-4" /></button>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm p-4">
                             <button onClick={() => onImageSelect(img)} className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-xs hover:bg-zinc-200 transition-transform hover:scale-105 shadow-xl flex items-center gap-2"><Sparkles className="w-3 h-3"/> Edit Canvas</button>
                            <div className="flex gap-2 flex-wrap justify-center">
                                <button onClick={() => reuseGeneratedImage(img)} className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium text-[10px] hover:bg-black/80 border border-white/10 uppercase tracking-wider" title="Use as Ref"><Copy className="w-3 h-3" /></button>
                                <button onClick={() => saveGeneratedToLibrary(img)} className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full font-medium text-[10px] hover:bg-black/80 border border-white/10 uppercase tracking-wider" title="Save"><Save className="w-3 h-3" /></button>
                                {/* SEND TO SCRIPT BUTTON */}
                                <button
                                    onClick={() => onSendToScript && onSendToScript(img)}
                                    className="bg-black/60 backdrop-blur-md text-emerald-400 hover:text-emerald-300 px-4 py-2 rounded-full font-medium text-[10px] hover:bg-black/80 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1"
                                    title="Send to Character Bible"
                                >
                                    <FileText className="w-3 h-3" /> Script
                                </button>
                                {/* SEND TO STORYBOARD BUTTON */}
                                {onSendToStoryboard && (
                                    <button
                                        onClick={() => onSendToStoryboard(img)}
                                        className="bg-black/60 backdrop-blur-md text-blue-400 hover:text-blue-300 px-4 py-2 rounded-full font-medium text-[10px] hover:bg-black/80 border border-blue-500/30 uppercase tracking-wider flex items-center gap-1"
                                        title="Add to Storyboard"
                                    >
                                        <Film className="w-3 h-3" /> Board
                                    </button>
                                )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {isProcessing && (
              <div className="flex items-center gap-4 text-violet-300 bg-zinc-900/80 px-6 py-4 rounded-2xl border border-white/5 w-fit backdrop-blur-md shadow-xl animate-pulse mx-auto">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs font-bold tracking-widest uppercase">{loadingPhase}</span>
              </div>
            )}
          </div>

          {/* Reference Bar */}
          <div className={`glass-panel border-t border-white/5 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative transition-all duration-300 ${isDragging ? 'bg-zinc-800 border-violet-500' : ''}`} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
             {isDragging && (<div className="absolute inset-0 z-20 bg-violet-500/10 backdrop-blur-md flex items-center justify-center border-t-2 border-violet-500"><p className="text-white font-semibold flex items-center gap-3 text-lg"><Upload className="w-6 h-6" /> Drop visual references</p></div>)}
            {references.length > 0 && (
                <div className="flex gap-4 overflow-x-auto px-6 py-4 border-b border-white/5 bg-black/20 scrollbar-thin scrollbar-thumb-zinc-700">
                    {references.map((ref) => (
                        <div key={ref.id} className={`shrink-0 relative group flex flex-col w-28 bg-zinc-900 rounded-xl overflow-hidden border transition-all ${ref.type === 'Style' ? 'border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'border-white/10'}`}>
                            <div className="relative aspect-square bg-black">
                                <img src={ref.data} alt="ref" className={`w-full h-full object-cover transition-opacity ${processingRefId === ref.id ? 'opacity-50' : ''}`} />
                                {processingRefId === ref.id && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 text-violet-400 animate-spin" /></div>}
                                <button onClick={() => removeReference(ref.id)} className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3" /></button>
                                <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                    <button onClick={() => extractStyle(ref)} className="bg-black/60 hover:bg-blue-500 text-white rounded-full p-1.5 backdrop-blur-md" title="Extract DNA"><ScanEye className="w-3 h-3" /></button>
                                    <button onClick={() => addToLibrary(ref)} className="bg-black/60 hover:bg-violet-600 text-white rounded-full p-1.5 backdrop-blur-md" title="Save"><Save className="w-3 h-3" /></button>
                                </div>
                            </div>
                            <select value={ref.type} onChange={(e) => updateReferenceType(ref.id, e.target.value as ReferenceType)} className={`text-[9px] border-none py-1.5 px-1 w-full text-center font-bold uppercase tracking-wider outline-none cursor-pointer ${ref.type === 'Style' ? 'bg-violet-900/30 text-violet-300' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                                <option value="General">General</option><option value="Character">Character</option><option value="Location">Location</option><option value="Product">Product</option><option value="Style">Style</option>
                            </select>
                        </div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} className="shrink-0 w-28 aspect-square rounded-xl border border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-500 hover:text-violet-400 hover:border-violet-500/30 hover:bg-white/5 transition-all gap-2 group"><Plus className="w-6 h-6 group-hover:scale-110 transition-transform" /><span className="text-[10px] font-bold uppercase tracking-wide">Add Ref</span></button>
                </div>
            )}
            <div className="p-6 flex items-end space-x-4">
                <button onClick={() => fileInputRef.current?.click()} className={`p-4 rounded-2xl transition-all relative group shadow-lg border border-white/5 ${references.length === 0 ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`} title="Upload Reference"><Plus className="w-6 h-6" />{references.length === 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span></span>}</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
              <div className="flex-1 relative group">
                  <textarea value={input} onChange={handleInputChange} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} placeholder="Describe your vision... (Type @ to mention Bible characters)" className="w-full bg-zinc-900/50 border border-white/5 text-white rounded-2xl p-5 pr-20 resize-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:outline-none min-h-[70px] max-h-[160px] shadow-inner transition-all placeholder:text-zinc-600 backdrop-blur-sm" rows={1} />
                  {/* @mention autocomplete dropdown */}
                  {showMentions && filteredCharacters.length > 0 && (
                      <div className="absolute bottom-full mb-2 left-0 w-72 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2">
                          <div className="px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-wider border-b border-white/5 bg-zinc-800/50">Bible Characters</div>
                          <div className="max-h-48 overflow-y-auto">
                              {filteredCharacters.slice(0, 6).map(char => (
                                  <button
                                      key={char.id}
                                      onClick={() => insertMention(char)}
                                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-violet-500/20 transition-colors text-left"
                                  >
                                      {char.imageRefs && char.imageRefs.length > 0 ? (
                                          <img src={char.imageRefs[0]} alt={char.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                                      ) : (
                                          <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center text-zinc-400 text-xs font-bold">{char.name[0]}</div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium text-white truncate">{char.name}</div>
                                          {char.promptSnippet && <div className="text-[10px] text-zinc-500 truncate">{char.promptSnippet.slice(0, 40)}...</div>}
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
                  <div className="absolute right-4 top-4 flex gap-1">
                      <button onClick={() => setShowPowerTools(!showPowerTools)} className={`p-1.5 rounded-lg transition-colors ${showPowerTools ? 'bg-violet-600 text-white' : 'text-zinc-500 hover:text-violet-400 hover:bg-white/5'}`} title="Nano Power Tools (Templates)"><Zap className="w-5 h-5 fill-current" /></button>
                      <button onClick={handleEnhancePrompt} disabled={!input.trim() || isEnhancing} className="text-zinc-500 hover:text-violet-400 transition-colors disabled:opacity-30 p-1.5 hover:bg-white/5 rounded-lg" title="Magic Enhance">{isEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}</button>
                  </div>
              </div>
              <button onClick={isProcessing ? handleStop : handleSend} disabled={!isProcessing && (!input && references.length === 0)} className={`p-5 rounded-2xl text-white transition-all shadow-xl hover:scale-105 active:scale-95 ${isProcessing ? 'bg-red-500 hover:bg-red-600' : 'bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed'}`} title={isProcessing ? "Stop" : "Generate"}>{isProcessing ? <Square className="w-6 h-6 fill-current" /> : <Send className="w-6 h-6" />}</button>
            </div>
            <div className="px-6 pb-4 flex justify-between items-center text-[9px] text-zinc-500 font-bold tracking-widest uppercase">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"/> Gemini 3.0 Pro Active</span>
                <span>{customInstructions ? 'Custom Mode' : 'Standard Mode'}</span>
            </div>
          </div>
      </div>
    </div>
  );
};

export default StageOne;
