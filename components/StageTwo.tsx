
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, Download, Layers, Loader2, Wand2, Save, Plus, X, Upload, ImagePlus, Brush, Eraser, Eye, EyeOff, Film, Columns, Palette, Gauge, RotateCcw, ListEnd, SkipForward, GitBranch, Home, Tag, Square, ChevronDown, Sun, Contrast, Sparkles, RotateCw, Lightbulb, Zap } from 'lucide-react';
import { GeneratedImage, ReferenceAsset, Project, SavedEntity, ProductionDesign, CharacterProfile, LocationProfile, ProductProfile, EditInstruction, VersionHistoryItem, ProductionLogEntry } from '../types';
import { applyEdit, extractStyleDNA, evaluateImageQuality } from '../services/gemini';
import { db } from '../services/db';
import CoverageModal from './CoverageModal';
import ReactMarkdown from 'react-markdown';

interface StageTwoProps {
  initialImage: GeneratedImage | null;
  onBack: () => void;
  showNotification: (msg: string) => void;
  onImageEdited?: (image: GeneratedImage) => void;
  onAddToGallery?: (image: GeneratedImage) => void; // Add images to global gallery
  currentProject: Project;
  onLibraryUpdate: () => void;
  productionDesign?: ProductionDesign; // Lookbook style injection
  bibleCharacters?: CharacterProfile[]; // For @mention support
  bibleLocations?: LocationProfile[]; // For @mention support
  bibleProducts?: ProductProfile[]; // For @mention support
  editQueue?: GeneratedImage[]; // Queue of images waiting to be edited
  onProcessQueue?: () => void; // Process next item in queue
}

const MAX_REFERENCES = 14;

// PROFESSIONAL DROPDOWN MENUS - Precise control options
const ENHANCE_OPTIONS = [
    { label: 'Auto Enhance', prompt: 'Enhance details, lighting, and sharpness while maintaining natural look.' },
    { label: 'Brightness +', prompt: 'Increase overall brightness by 20%. Maintain color balance and avoid blown highlights.' },
    { label: 'Brightness -', prompt: 'Decrease overall brightness by 20%. Preserve shadow detail.' },
    { label: 'Contrast +', prompt: 'Increase contrast by 25%. Deepen blacks, brighten highlights. Maintain midtone detail.' },
    { label: 'Contrast -', prompt: 'Reduce contrast by 25%. Soften blacks, lower highlights. Create a flatter, moodier look.' },
    { label: 'Saturation +', prompt: 'Increase color saturation by 30%. Make colors more vivid and punchy without clipping.' },
    { label: 'Saturation -', prompt: 'Decrease color saturation by 30%. Create a desaturated, muted color palette.' },
    { label: 'Sharpen', prompt: 'Apply strong sharpening to edges and fine details. Enhance texture clarity without artifacts.' },
    { label: 'Noise Reduction', prompt: 'Remove digital noise and grain while preserving edge detail and texture.' },
    { label: 'HDR Effect', prompt: 'Apply HDR tone mapping. Expand dynamic range, reveal shadow detail, enhance local contrast.' },
];

const STYLE_OPTIONS = [
    { label: 'Cyberpunk', prompt: 'Transform into cyberpunk style: neon lights (pink, cyan, purple), rain-slicked streets, high contrast, lens flares, holographic elements.' },
    { label: 'Watercolor', prompt: 'Transform into delicate watercolor painting: soft wet edges, paper texture, subtle color bleeding, transparent washes.' },
    { label: 'Oil Painting', prompt: 'Transform into classical oil painting: visible brushstrokes, rich impasto texture, dramatic chiaroscuro lighting.' },
    { label: 'Pencil Sketch', prompt: 'Transform into detailed pencil sketch on textured paper: fine hatching, tonal gradients, subtle smudging.' },
    { label: 'Anime', prompt: 'Transform into anime/manga style: clean cel-shading, bold outlines, simplified features, vibrant colors.' },
    { label: 'Film Noir', prompt: 'Transform into classic film noir: high contrast black & white, dramatic shadows, venetian blind lighting.' },
    { label: 'Pop Art', prompt: 'Transform into pop art style: bold primary colors, Ben-Day dots, thick black outlines, Warhol/Lichtenstein aesthetic.' },
    { label: 'Vintage Film', prompt: 'Apply vintage film look: slight grain, faded colors, light leaks, warm color cast, vignette.' },
    { label: 'Glass/Crystal', prompt: 'Transform subject into translucent glass/crystal: caustic lighting, internal refractions, prismatic colors.' },
    { label: 'Neon Glow', prompt: 'Add neon glow effect: luminous outlines, light bloom, dark background, electric color palette.' },
    { label: 'Steampunk', prompt: 'Transform into steampunk aesthetic: brass gears, copper pipes, Victorian machinery, sepia tones.' },
    { label: 'Vaporwave', prompt: 'Apply vaporwave aesthetic: pink/purple/cyan gradient, 80s graphics, glitch effects, geometric shapes.' },
];

const ROTATE_OPTIONS = [
    { label: 'Rotate 15° Right', prompt: 'Rotate the camera angle 15 degrees clockwise to the right. Maintain strict subject consistency (identity, clothes, features). Use spatial reasoning to reveal slight angle change.' },
    { label: 'Rotate 45° Right', prompt: 'Rotate the camera angle 45 degrees clockwise to the right. Show three-quarter view. Maintain subject identity and all visual details.' },
    { label: 'Rotate 90° Right', prompt: 'Rotate the camera angle 90 degrees clockwise to show the right side profile. Maintain strict subject consistency.' },
    { label: 'Rotate 15° Left', prompt: 'Rotate the camera angle 15 degrees counter-clockwise to the left. Maintain strict subject consistency.' },
    { label: 'Rotate 45° Left', prompt: 'Rotate the camera angle 45 degrees counter-clockwise to the left. Show three-quarter view from the other side.' },
    { label: 'Rotate 90° Left', prompt: 'Rotate the camera angle 90 degrees counter-clockwise to show the left side profile.' },
    { label: 'Flip Horizontal', prompt: 'Mirror the image horizontally. Flip left to right while maintaining all visual elements.' },
    { label: 'Bird\'s Eye View', prompt: 'Re-shoot from directly above, looking straight down. Show top-down perspective.' },
    { label: 'Worm\'s Eye View', prompt: 'Re-shoot from ground level, looking up. Create dramatic low-angle perspective.' },
];

const LIGHTING_OPTIONS = [
    { label: 'Golden Hour', prompt: 'Change lighting to golden hour sunset: warm orange/gold tones, long soft shadows, sun at 15-20 degrees, magical quality.' },
    { label: 'Blue Hour', prompt: 'Change lighting to blue hour twilight: soft blue ambient light, city lights beginning to glow, calm atmospheric mood.' },
    { label: 'Key Light (Left)', prompt: 'Apply strong key light from the left side at 45 degrees. Create dramatic shadows on right side of subject.' },
    { label: 'Key Light (Right)', prompt: 'Apply strong key light from the right side at 45 degrees. Create dramatic shadows on left side of subject.' },
    { label: 'Rim Light', prompt: 'Add bright rim/edge lighting from behind. Create glowing outline around subject, separate from background.' },
    { label: 'Top Light', prompt: 'Apply overhead top lighting. Create strong shadows under features, dramatic theatrical effect.' },
    { label: 'Under Light', prompt: 'Apply uplighting from below. Create eerie, horror-style shadows under features.' },
    { label: 'Soft Diffused', prompt: 'Change to soft, diffused lighting: no harsh shadows, even illumination, cloudy day quality.' },
    { label: 'High Contrast', prompt: 'Apply high contrast lighting: bright highlights, deep blacks, minimal midtones, dramatic chiaroscuro.' },
    { label: 'Neon Lighting', prompt: 'Add neon lighting: colored light sources (pink, cyan, purple), urban night atmosphere, color mixing on surfaces.' },
    { label: 'Candlelight', prompt: 'Change to warm candlelight: flickering orange glow, soft shadows, intimate warm atmosphere.' },
    { label: 'Studio Softbox', prompt: 'Apply professional studio softbox lighting: clean, even, commercial quality illumination.' },
];

// Keep basic quick actions that don't need dropdowns
const QUICK_ACTIONS = [
    { label: 'Remove BG', prompt: 'Remove background, pure white background.' },
    { label: 'Remove Crowd', prompt: 'Remove all people from the background. Reconstruct the empty scene behind them using architectural context.' },
    { label: 'Text Fix', prompt: 'Correct and sharpen any legible text in the image. Ensure typography matches the surface perspective.' },
    { label: '4K Upscale', prompt: 'STRICT UPSCALE ONLY. Increase resolution to 4K. CRITICAL: Preserve EXACTLY all colors, hair color, skin tone, beard color, eye color, clothing colors, and all visual details. Do NOT alter, reinterpret, or regenerate any content. Only add subtle sharpness and micro-texture detail. This is a technical upscale, not a creative edit.', resolution: '4K' },
];

const StageTwo: React.FC<StageTwoProps> = ({ initialImage, onBack, showNotification, onImageEdited, onAddToGallery, currentProject, onLibraryUpdate, productionDesign, bibleCharacters = [], bibleLocations = [], bibleProducts = [], editQueue = [], onProcessQueue }) => {
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(initialImage);
  const [history, setHistory] = useState<VersionHistoryItem[]>(initialImage ? [{
    image: initialImage,
    editStack: [],
    timestamp: Date.now(),
    label: 'Original'
  }] : []);
  const [instruction, setInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingPhase, setEditingPhase] = useState<string>(''); // Detailed loading phase
  const [references, setReferences] = useState<ReferenceAsset[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // SOPHISTICATED NON-DESTRUCTIVE EDITING
  // pristineOriginal: The UNTOUCHED original - NEVER changes after initial upload
  // currentEditStack: Edit instructions applied to pristineOriginal to get currentImage
  const [pristineOriginal, setPristineOriginal] = useState<GeneratedImage | null>(initialImage);
  const [currentEditStack, setCurrentEditStack] = useState<EditInstruction[]>([]);
  const [useNonDestructive, setUseNonDestructive] = useState(true); // Toggle for edit mode
  const [useChainedEdits, setUseChainedEdits] = useState(true); // NEW: Chain edits on current canvas vs re-apply all to pristine
  const [useLookbook, setUseLookbook] = useState(true); // Toggle for Production Design style injection
  
  // Masking State
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);

  // Coverage Modal State
  const [showCoverageModal, setShowCoverageModal] = useState(false);

  // Dropdown Menu State
  const [openDropdown, setOpenDropdown] = useState<'enhance' | 'style' | 'rotate' | 'lighting' | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Custom Style Presets State
  const [customStyles, setCustomStyles] = useState<Array<{id: string, name: string, prompt: string}>>(() => {
    try {
      const saved = localStorage.getItem('design-agent-custom-styles');
      console.log('[CustomStyles] Loading from localStorage:', saved);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('[CustomStyles] Error loading from localStorage:', error);
      return [];
    }
  });
  const [showSaveStyleModal, setShowSaveStyleModal] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');
  const [isExtractingStyle, setIsExtractingStyle] = useState(false);

  // AI Style Extraction from current image
  const extractStyleFromCurrentImage = async () => {
    if (!currentImage?.url) {
      showNotification('No image to extract style from');
      return;
    }

    setIsExtractingStyle(true);
    setShowSaveStyleModal(true);
    setOpenDropdown(null);

    try {
      console.log('[CustomStyles] Extracting style from current image...');
      const styleDescription = await extractStyleDNA(currentImage.url);
      console.log('[CustomStyles] Extracted style:', styleDescription);
      setNewStylePrompt(styleDescription);
    } catch (error) {
      console.error('[CustomStyles] Error extracting style:', error);
      showNotification('Failed to extract style. Please try again.');
      setShowSaveStyleModal(false);
    } finally {
      setIsExtractingStyle(false);
    }
  };

  // Save a custom style
  const saveCustomStyle = () => {
    if (!newStyleName.trim() || !newStylePrompt.trim()) {
      showNotification('Please provide both a name and style description');
      return;
    }

    const newStyle = {
      id: crypto.randomUUID(),
      name: newStyleName.trim(),
      prompt: newStylePrompt.trim()
    };

    console.log('[CustomStyles] Saving new style:', newStyle);

    // Update state and save to localStorage immediately
    const updatedStyles = [...customStyles, newStyle];
    setCustomStyles(updatedStyles);

    try {
      localStorage.setItem('design-agent-custom-styles', JSON.stringify(updatedStyles));
      console.log('[CustomStyles] Saved to localStorage:', updatedStyles);
    } catch (error) {
      console.error('[CustomStyles] Error saving to localStorage:', error);
    }

    // Reset modal state
    setShowSaveStyleModal(false);
    setNewStyleName('');
    setNewStylePrompt('');
    showNotification(`Style "${newStyle.name}" saved!`);
  };

  // Delete a custom style
  const deleteCustomStyle = (styleId: string) => {
    const updatedStyles = customStyles.filter(s => s.id !== styleId);
    setCustomStyles(updatedStyles);

    try {
      localStorage.setItem('design-agent-custom-styles', JSON.stringify(updatedStyles));
      console.log('[CustomStyles] Deleted style, updated localStorage:', updatedStyles);
    } catch (error) {
      console.error('[CustomStyles] Error saving to localStorage after delete:', error);
    }
  };

  // Refs for dropdown buttons (for portal positioning)
  const enhanceButtonRef = useRef<HTMLButtonElement>(null);
  const styleButtonRef = useRef<HTMLButtonElement>(null);
  const rotateButtonRef = useRef<HTMLButtonElement>(null);
  const lightingButtonRef = useRef<HTMLButtonElement>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);

  // Helper to open dropdown with position calculation
  const openDropdownWithPosition = (type: 'enhance' | 'style' | 'rotate' | 'lighting') => {
    if (openDropdown === type) {
      setOpenDropdown(null);
      return;
    }

    const buttonRef = {
      enhance: enhanceButtonRef,
      style: styleButtonRef,
      rotate: rotateButtonRef,
      lighting: lightingButtonRef
    }[type];

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // Position BELOW button with small gap
        left: rect.left
      });
    }
    setOpenDropdown(type);
  };

  // Force repaint when style dropdown opens (fixes browser paint optimization bug)
  useEffect(() => {
    if (openDropdown === 'style' && styleDropdownRef.current) {
      // Double RAF to ensure DOM is fully painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (styleDropdownRef.current) {
            void styleDropdownRef.current.offsetHeight;
            styleDropdownRef.current.scrollTop = 1;
            styleDropdownRef.current.scrollTop = 0;
          }
        });
      });
    }
  }, [openDropdown]);

  // Critic State
  const [showCritic, setShowCritic] = useState(false);
  const [critique, setCritique] = useState<string>('');
  const [isCritiquing, setIsCritiquing] = useState(false);

  // @mention autocomplete state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [mentionType, setMentionType] = useState<'all' | 'character' | 'location' | 'product'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const instructionInputRef = useRef<HTMLInputElement>(null);
  const canvasInputRef = useRef<HTMLInputElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);
  const galleryUploadRef = useRef<HTMLInputElement>(null);
  const loadImageRef = useRef<HTMLInputElement>(null);

  // Cancellation system for long-running edits
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (initialImage && (!currentImage || initialImage.id !== history[0]?.image.id)) {
        setCurrentImage(initialImage);
        setPristineOriginal(initialImage);
        setCurrentEditStack([]);
        setHistory([{
          image: initialImage,
          editStack: [],
          timestamp: Date.now(),
          label: 'Original'
        }]);
        setInstruction('');
        setReferences([]);
        clearMask();
        setCritique('');
    }
  }, [initialImage]);

  useEffect(() => {
    if (!containerRef.current || !maskCanvasRef.current || !currentImage) return;
    
    const resizeObserver = new ResizeObserver(() => {
        const imgElement = containerRef.current?.querySelector('img');
        if (imgElement && maskCanvasRef.current) {
            maskCanvasRef.current.width = imgElement.clientWidth;
            maskCanvasRef.current.height = imgElement.clientHeight;
        }
    });
    
    const img = containerRef.current.querySelector('img');
    if (img) {
        resizeObserver.observe(img);
        if(img.complete) {
            maskCanvasRef.current.width = img.clientWidth;
            maskCanvasRef.current.height = img.clientHeight;
        } else {
            img.onload = () => {
                 if (maskCanvasRef.current) {
                    maskCanvasRef.current.width = img.clientWidth;
                    maskCanvasRef.current.height = img.clientHeight;
                 }
            }
        }
    }

    return () => resizeObserver.disconnect();
  }, [currentImage, isBrushActive]);

  const clearMask = () => {
      const canvas = maskCanvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          setHasMask(false);
      }
  };

  // Cancel handler for stopping in-progress edits
  const handleCancelEdit = () => {
    isCancelledRef.current = true;
    setIsEditing(false);
    showNotification('Edit cancelled - in-flight request may still complete');
  };

  const getMaskDataUrl = (): string | undefined => {
      if (!hasMask || !maskCanvasRef.current) return undefined;
      const visualCanvas = maskCanvasRef.current;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = visualCanvas.width;
      tempCanvas.height = visualCanvas.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return undefined;

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(visualCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      return tempCanvas.toDataURL('image/png');
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isBrushActive) return;
      setIsDrawing(true);
      const canvas = maskCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
          const rect = canvas.getBoundingClientRect();
          // Scale coordinates to match canvas internal dimensions vs display size
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // red-500/50
          ctx.lineWidth = 20 * Math.max(scaleX, scaleY); // Scale brush size too
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
      }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !isBrushActive) return;
      const canvas = maskCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
          const rect = canvas.getBoundingClientRect();
          // Scale coordinates to match canvas internal dimensions vs display size
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const x = (e.clientX - rect.left) * scaleX;
          const y = (e.clientY - rect.top) * scaleY;
          
          ctx.lineTo(x, y);
          ctx.stroke();
          if (!hasMask) setHasMask(true);
      }
  };

  const stopDrawing = () => {
      setIsDrawing(false);
  };

  // @mention autocomplete handlers
  const handleInstructionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInstruction(value);

    // Check if we're typing an @mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      const allEntities = [...bibleCharacters, ...bibleLocations, ...bibleProducts];
      if (allEntities.length > 0) {
        setShowMentions(true);
        setMentionFilter(atMatch[1].toLowerCase());
        setMentionCursorPos(cursorPos);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Combined entities for @mention
  const getMentionableEntities = () => {
    const entities: Array<{ type: 'character' | 'location' | 'product'; name: string; id: string; imageRefs?: string[]; promptSnippet?: string; description?: string }> = [];

    bibleCharacters.forEach(c => entities.push({ type: 'character', name: c.name, id: c.id, imageRefs: c.imageRefs, promptSnippet: c.promptSnippet, description: c.description }));
    bibleLocations.forEach(l => entities.push({ type: 'location', name: l.name || 'Location', id: l.id, imageRefs: l.imageRefs, promptSnippet: l.promptSnippet, description: l.description }));
    bibleProducts.forEach(p => entities.push({ type: 'product', name: p.name, id: p.id, imageRefs: p.imageRefs, promptSnippet: p.promptSnippet, description: p.description }));

    return entities.filter(e => e.name.toLowerCase().includes(mentionFilter));
  };

  const insertMention = (entity: { name: string; type: string }) => {
    const textBeforeCursor = instruction.slice(0, mentionCursorPos);
    const textAfterCursor = instruction.slice(mentionCursorPos);
    const atPos = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.slice(0, atPos) + '@' + entity.name + ' ' + textAfterCursor;
    setInstruction(newText);
    setShowMentions(false);
    // Re-focus input
    instructionInputRef.current?.focus();
  };

  // Parse @mentions and inject entity references
  const parseAndInjectMentions = (): { refs: ReferenceAsset[], context: string } => {
    const injectedRefs: ReferenceAsset[] = [];
    const contextParts: string[] = [];
    const lowerInstruction = instruction.toLowerCase();

    // Check characters
    for (const char of bibleCharacters) {
      const mentionPattern = '@' + char.name.toLowerCase();
      if (!lowerInstruction.includes(mentionPattern)) continue;

      const allRefs: string[] = [];
      if (char.characterSheet) allRefs.push(char.characterSheet);
      if (char.imageRefs) allRefs.push(...char.imageRefs);

      const uniqueRefs = [...new Set(allRefs)].slice(0, 3);
      if (uniqueRefs.length > 0) {
        uniqueRefs.forEach((ref, i) => {
          injectedRefs.push({
            id: `mention-char-${char.id}-${i}`,
            data: ref,
            type: 'Character',
            name: i === 0 ? char.name : `${char.name} (ref ${i + 1})`,
            styleDescription: i === 0 ? char.promptSnippet : undefined
          });
        });
      }
      if (char.promptSnippet) {
        contextParts.push(`[${char.name}: ${char.promptSnippet}]`);
      }
    }

    // Check locations
    for (const loc of bibleLocations) {
      const locName = loc.name || 'Location';
      const mentionPattern = '@' + locName.toLowerCase();
      if (!lowerInstruction.includes(mentionPattern)) continue;

      const allRefs: string[] = [];
      if (loc.anchorImage) allRefs.push(loc.anchorImage);
      if (loc.imageRefs) allRefs.push(...loc.imageRefs);

      const uniqueRefs = [...new Set(allRefs)].slice(0, 3);
      if (uniqueRefs.length > 0) {
        uniqueRefs.forEach((ref, i) => {
          injectedRefs.push({
            id: `mention-loc-${loc.id}-${i}`,
            data: ref,
            type: 'Style',
            name: i === 0 ? locName : `${locName} (ref ${i + 1})`,
            styleDescription: i === 0 ? loc.promptSnippet : undefined
          });
        });
      }
      if (loc.promptSnippet) {
        contextParts.push(`[Location ${locName}: ${loc.promptSnippet}]`);
      }
    }

    // Check products
    for (const prod of bibleProducts) {
      const mentionPattern = '@' + prod.name.toLowerCase();
      if (!lowerInstruction.includes(mentionPattern)) continue;

      if (prod.imageRefs && prod.imageRefs.length > 0) {
        prod.imageRefs.slice(0, 3).forEach((ref, i) => {
          injectedRefs.push({
            id: `mention-prod-${prod.id}-${i}`,
            data: ref,
            type: 'General',
            name: i === 0 ? prod.name : `${prod.name} (ref ${i + 1})`,
            styleDescription: i === 0 ? prod.promptSnippet : undefined
          });
        });
      }
      if (prod.promptSnippet) {
        contextParts.push(`[Product ${prod.name}: ${prod.promptSnippet}]`);
      }
    }

    return {
      refs: injectedRefs,
      context: contextParts.length > 0 ? `\n\nEntity References: ${contextParts.join(' ')}` : ''
    };
  };

  const handleEdit = async (overrideInstruction?: string, overrideResolution?: string) => {
    let textToUse = typeof overrideInstruction === 'string' ? overrideInstruction : instruction;

    if (!currentImage || (!textToUse.trim() && references.length === 0) || isEditing) return;

    // Reset cancellation flag at start of new edit
    isCancelledRef.current = false;

    // Inject @mentioned entity references
    const { refs: mentionRefs, context: mentionContext } = parseAndInjectMentions();
    if (mentionContext) {
      textToUse = textToUse + mentionContext;
    }

    // Build Lookbook style context if enabled
    let styleContext = '';
    const styleRefs: ReferenceAsset[] = [];
    if (useLookbook && productionDesign) {
      const parts = [];
      if (productionDesign.visualStyle) parts.push(`VISUAL STYLE: ${productionDesign.visualStyle}`);
      if (productionDesign.colorPalette) parts.push(`COLOR PALETTE: ${productionDesign.colorPalette}`);
      if (productionDesign.cameraLanguage) parts.push(`CAMERA LANGUAGE: ${productionDesign.cameraLanguage}`);
      if (productionDesign.lightingApproach) parts.push(`LIGHTING: ${productionDesign.lightingApproach}`);
      if (parts.length > 0) {
        styleContext = `=== PRODUCTION DESIGN STYLE ===\n${parts.join('\n')}\n===\n\n`;
      }
      // Add style reference images
      if (productionDesign.styleRefs && productionDesign.styleRefs.length > 0) {
        productionDesign.styleRefs.slice(0, 3).forEach((ref, i) => {
          styleRefs.push({
            id: `style-ref-${i}`,
            data: ref,
            type: 'Style',
            name: `Style Reference ${i + 1}`
          });
        });
      }
    }

    // Prepend style context to instruction
    if (styleContext) {
      textToUse = styleContext + textToUse;
    }

    const allReferences = [...references, ...mentionRefs, ...styleRefs].slice(0, MAX_REFERENCES);

    setIsEditing(true);
    setEditingPhase('Preparing edit...');
    const maskData = getMaskDataUrl();

    try {
      let newImage: GeneratedImage;
      let newEditStack: EditInstruction[] = [];

      // Create the new edit instruction
      const newEditInstruction: EditInstruction = {
        id: crypto.randomUUID(),
        instruction: textToUse,
        timestamp: Date.now(),
        masked: !!maskData,
        references: allReferences.map(r => r.id)
      };

      // NON-DESTRUCTIVE MODE with two sub-modes:
      // 1. CHAINED EDITS (default): Apply new edit to CURRENT canvas state - edits build on each other
      // 2. RE-APPLY ALL: Combine all edits and apply to PRISTINE original (old behavior)
      // (Skip if using mask - masks are position-specific and require destructive editing)
      if (useNonDestructive && pristineOriginal && !maskData) {
        newEditStack = [...currentEditStack, newEditInstruction];
        setCurrentEditStack(newEditStack);

        if (useChainedEdits) {
          // CHAINED EDITS MODE: Apply new edit to CURRENT canvas state
          // This ensures each edit builds on the previous result
          console.log(`🔗 Chained edit: Applying edit #${newEditStack.length} to CURRENT canvas state`);
          setEditingPhase(`Applying edit #${newEditStack.length}...`);

          newImage = await applyEdit(
              currentImage.url,  // ✅ Use CURRENT canvas, not pristine
              textToUse,
              allReferences,
              undefined,
              overrideResolution,
              currentImage.aspectRatio
          );

          // Check if cancelled while waiting for API
          if (isCancelledRef.current) {
            showNotification('Edit cancelled');
            return;
          }

          showNotification(`✓ Edit #${newEditStack.length} applied to current canvas`);
        } else {
          // RE-APPLY ALL MODE: Combine all edits and apply to pristine original
          // Useful for "final render" or when edits drift too far from intent
          console.log(`🔄 Re-apply all: Combining ${newEditStack.length} edits on PRISTINE original`);
          setEditingPhase(`Re-applying ${newEditStack.length} edits from pristine...`);

          const allInstructions = newEditStack.map(e => e.instruction);
          const combinedInstruction = allInstructions.length === 1
            ? allInstructions[0]
            : `Apply ALL of the following edits simultaneously to the image:\n${allInstructions.map((edit, i) => `${i + 1}. ${edit}`).join('\n')}\n\nIMPORTANT: Apply all edits at once, maintaining consistency across all changes.`;

          newImage = await applyEdit(
              pristineOriginal.url,  // Use PRISTINE original
              combinedInstruction,
              allReferences,
              undefined,
              overrideResolution,
              pristineOriginal.aspectRatio
          );

          // Check if cancelled while waiting for API
          if (isCancelledRef.current) {
            showNotification('Edit cancelled');
            return;
          }

          showNotification(`✓ Applied ${newEditStack.length} edit(s) to pristine original`);
        }
      } else {
        // DESTRUCTIVE MODE: Apply to current image (legacy behavior, or when using mask)
        setEditingPhase(maskData ? 'Applying masked edit...' : 'Applying edit...');
        newImage = await applyEdit(
            currentImage.url,
            textToUse,
            allReferences,
            maskData,
            overrideResolution,
            currentImage.aspectRatio
        );

        // Check if cancelled while waiting for API
        if (isCancelledRef.current) {
          showNotification('Edit cancelled');
          return;
        }

        // If using mask, this becomes a new pristine original (branch point)
        if (maskData) {
          newEditStack = [newEditInstruction]; // Start fresh stack with this edit
          setCurrentEditStack([]);
          // Pristine stays the same - mask edits are tracked but don't reset pristine
          showNotification("Mask edit applied (destructive)");
        } else {
          // Destructive non-mask edit
          newEditStack = [...currentEditStack, newEditInstruction];
          setCurrentEditStack(newEditStack);
        }
      }

      newImage.projectId = currentProject.id;
      setCurrentImage(newImage);

      // Add to version history with full edit stack
      const newHistoryItem: VersionHistoryItem = {
        image: newImage,
        editStack: newEditStack,
        timestamp: Date.now(),
        isBranch: !!maskData
      };
      setHistory(prev => [...prev, newHistoryItem]);

      setInstruction('');
      if (hasMask) clearMask();
      setCritique(''); // clear old critique

      if (onImageEdited) onImageEdited(newImage);

      // Log successful edit to Production Journal
      const logEntry: ProductionLogEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        projectId: currentProject.id,
        stage: 'edit',
        action: 'edit',
        subject: textToUse.slice(0, 100),
        prompt: textToUse,
        references: {
          characters: [],
          locations: [],
          products: [],
          moodboard: false,
          lookbook: useLookbook,
          lightingRig: !!productionDesign?.lightingAnalysis,
          cameraRig: !!productionDesign?.cameraRig,
        },
        outcome: 'success',
        resultImageId: newImage.id,
      };
      db.saveProductionLogEntry(logEntry).catch(console.error);

    } catch (error) {
      console.error("Editing failed:", error);
      showNotification("Editing failed. Please try again.");

      // Log failed edit to Production Journal
      const logEntry: ProductionLogEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        projectId: currentProject.id,
        stage: 'edit',
        action: 'edit',
        subject: textToUse.slice(0, 100),
        prompt: textToUse,
        references: {
          characters: [],
          locations: [],
          products: [],
          moodboard: false,
          lookbook: useLookbook,
          lightingRig: !!productionDesign?.lightingAnalysis,
          cameraRig: !!productionDesign?.cameraRig,
        },
        outcome: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
      db.saveProductionLogEntry(logEntry).catch(console.error);
    } finally {
      setIsEditing(false);
      setEditingPhase('');
    }
  };

  const handleAutoEnhance = () => {
      handleEdit("Enhance the details, lighting, and visual clarity of this image while maintaining the original composition.");
  };

  // Apply fixes suggested by AI Critic
  const handleApplyCritiqueFix = async () => {
    if (!critique || !currentImage || isEditing) return;
    
    // Extract the "What needs fixing?" section from the critique
    const fixMatch = critique.match(/What needs fixing\?[:\s]*([\s\S]*?)(?=\n\n|$)/i);
    const fixes = fixMatch ? fixMatch[1].trim() : '';
    
    if (!fixes) {
      showNotification("No specific fixes found in critique");
      return;
    }
    
    // Build a comprehensive fix instruction
    const fixInstruction = `APPLY THESE SPECIFIC FIXES TO ACHIEVE 10/10 QUALITY:

${fixes}

CRITICAL REQUIREMENTS:
- Fix ONLY the issues mentioned above
- Preserve ALL other aspects of the image exactly (colors, composition, identity, style)
- Maintain the original artistic intent
- Do not introduce new elements or changes beyond the fixes
- If resolution/upscale is mentioned, ensure output is at the requested resolution`;

    showNotification("Applying AI Critic fixes...");
    
    // Apply the fix using the existing edit handler
    handleEdit(fixInstruction, '4K');
  };

  // NON-DESTRUCTIVE EDITING HELPERS
  const removeEditFromStack = async (indexToRemove: number) => {
    if (!pristineOriginal || !useNonDestructive) return;

    const newStack = currentEditStack.filter((_, i) => i !== indexToRemove);
    setCurrentEditStack(newStack);

    if (newStack.length === 0) {
      // No edits left, revert to pristine original
      setCurrentImage(pristineOriginal);
      showNotification("Reverted to pristine original");
      return;
    }

    // Re-apply remaining edits from pristine original
    setIsEditing(true);
    try {
      const allInstructions = newStack.map(e => e.instruction);
      const combinedInstruction = allInstructions.length === 1
        ? allInstructions[0]
        : `Apply ALL of the following edits simultaneously:\n${allInstructions.map((edit, i) => `${i + 1}. ${edit}`).join('\n')}`;

      const newImage = await applyEdit(
        pristineOriginal.url,
        combinedInstruction,
        [],
        undefined,
        undefined,
        pristineOriginal.aspectRatio
      );
      newImage.projectId = currentProject.id;
      setCurrentImage(newImage);

      // Add to history
      const newHistoryItem: VersionHistoryItem = {
        image: newImage,
        editStack: newStack,
        timestamp: Date.now()
      };
      setHistory(prev => [...prev, newHistoryItem]);
      showNotification(`Edit removed. ${newStack.length} edit(s) remaining.`);
    } catch (error) {
      console.error("Re-rendering failed:", error);
      showNotification("Failed to re-render edits");
    } finally {
      setIsEditing(false);
    }
  };

  // Reset to pristine original - complete clean slate
  const resetToPristineOriginal = () => {
    if (!pristineOriginal) return;
    setCurrentImage(pristineOriginal);
    setCurrentEditStack([]);
    showNotification("Reset to pristine original");
  };

  // Restore from version history - branch from that point
  const restoreFromHistory = (historyItem: VersionHistoryItem, createBranch: boolean = false) => {
    if (isEditing) return;

    setCurrentImage(historyItem.image);
    setCurrentEditStack(historyItem.editStack);

    if (createBranch) {
      // Mark as branch point in history
      const branchItem: VersionHistoryItem = {
        ...historyItem,
        isBranch: true,
        branchedFrom: currentImage?.id,
        timestamp: Date.now()
      };
      setHistory(prev => [...prev, branchItem]);
      showNotification(`Branched from "${historyItem.label || 'Version'}" - ${historyItem.editStack.length} edits restored`);
    } else {
      showNotification(`Restored "${historyItem.label || 'Version'}" - ${historyItem.editStack.length} edits loaded`);
    }
  };

  // FINAL RENDER: "Happy Pass" - Clean re-render from pristine original at maximum quality
  const handleFinalRender = async () => {
    if (!pristineOriginal || currentEditStack.length === 0) return;

    setIsEditing(true);
    showNotification("🎬 Final Render: Re-applying all edits from pristine original at 4K...");

    try {
      // Combine all edits with emphasis on quality
      const allInstructions = currentEditStack.map(e => e.instruction);
      const combinedInstruction = `FINAL HIGH-QUALITY RENDER - Apply ALL of the following edits to this pristine original image:
${allInstructions.map((edit, i) => `${i + 1}. ${edit}`).join('\n')}

CRITICAL REQUIREMENTS:
- Preserve maximum detail and sharpness in areas not explicitly edited
- Maintain original texture, grain, and micro-details where possible
- Apply all edits simultaneously for consistency
- Output at highest quality with no compression artifacts`;

      const newImage = await applyEdit(
        pristineOriginal.url,
        combinedInstruction,
        references,
        undefined,
        '4K', // Force 4K for final render
        pristineOriginal.aspectRatio
      );

      newImage.projectId = currentProject.id;
      setCurrentImage(newImage);

      // Add to history with label
      const newHistoryItem: VersionHistoryItem = {
        image: newImage,
        editStack: currentEditStack,
        timestamp: Date.now(),
        label: 'Final Render (4K)'
      };
      setHistory(prev => [...prev, newHistoryItem]);

      if (onImageEdited) onImageEdited(newImage);
      showNotification("✅ Final Render complete - pristine 4K output from original");

    } catch (error) {
      console.error("Final render failed:", error);
      showNotification("❌ Final render failed");
    } finally {
      setIsEditing(false);
    }
  };

  // UPLOAD HANDLERS: Add images to gallery or load into edit canvas
  const handleUploadToGallery = (files: FileList | null) => {
    if (!files || !onAddToGallery) return;
    
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          projectId: currentProject.id,
          url: result,
          prompt: `Uploaded: ${file.name}`,
          aspectRatio: '1:1'
        };
        onAddToGallery(newImage);
        showNotification(`Added "${file.name}" to gallery`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLoadImageToCanvas = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        projectId: currentProject.id,
        url: result,
        prompt: `Loaded: ${file.name}`,
        aspectRatio: '1:1'
      };
      setCurrentImage(newImage);
      setPristineOriginal(newImage);
      setCurrentEditStack([]);
      setHistory([{
        image: newImage,
        editStack: [],
        timestamp: Date.now(),
        label: 'Original'
      }]);
      showNotification(`Loaded "${file.name}" for editing`);
    };
    reader.readAsDataURL(file);
  };

  const handleStyleMatch = async (files: FileList | null) => {
      if (!files || files.length === 0 || !currentImage) return;
      
      const file = files[0];
      if (!file.type.startsWith('image/')) return;

      setIsEditing(true);
      showNotification("Extracting Style DNA...");

      const reader = new FileReader();
      reader.onload = async (ev) => {
          const result = ev.target?.result as string;
          try {
              const dna = await extractStyleDNA(result);
              showNotification("Style extracted. Applying...");
              
              const newImage = await applyEdit(
                  currentImage.url,
                  `Apply this visual style strictly: ${dna}`,
                  [],
                  undefined,
                  '2K',
                  currentImage.aspectRatio
              );
              newImage.projectId = currentProject.id;
              setCurrentImage(newImage);
              setHistory(prev => [...prev, {
                image: newImage,
                editStack: currentEditStack,
                timestamp: Date.now(),
                label: 'Style Match'
              }]);
              if (onImageEdited) onImageEdited(newImage);
              showNotification("Style Match Complete");
          } catch (e) {
              console.error(e);
              showNotification("Style Match Failed");
          } finally {
              setIsEditing(false);
              if (styleInputRef.current) styleInputRef.current.value = '';
          }
      };
      reader.readAsDataURL(file);
  };

  const runCoverageGeneration = async (config: { framing: string[], lenses: string[], angles: string[] }) => {
      if (!currentImage) return;
      const allVariations = [...config.framing, ...config.lenses, ...config.angles];
      
      if (allVariations.length === 0) {
          showNotification("Please select at least one variation.");
          return;
      }

      setIsEditing(true);
      try {
          for (let i = 0; i < allVariations.length; i++) {
              const variant = allVariations[i];
              showNotification(`Generating ${variant}...`);
              const prompt = `Re-shoot this scene as a ${variant}. Maintain the exact character, lighting, and environment. Only change the camera framing/focal length to match: ${variant}.`;
              try {
                  const newImg = await applyEdit(currentImage.url, prompt, references, undefined, '2K', currentImage.aspectRatio);
                  newImg.prompt = `${variant}`;
                  newImg.projectId = currentProject.id;
                  setHistory(prev => [...prev, {
                    image: newImg,
                    editStack: [],
                    timestamp: Date.now(),
                    label: variant
                  }]);
                  if (onImageEdited) onImageEdited(newImg);
              } catch (e) { console.error(e); }
          }
          showNotification("Coverage generation complete!");
      } finally {
          setIsEditing(false);
      }
  };

  const runQualityCheck = async () => {
      if (!currentImage) return;
      setShowCritic(true);
      setIsCritiquing(true);
      try {
          const result = await evaluateImageQuality(currentImage.url, currentImage.prompt);
          setCritique(result);
      } catch (e) {
          setCritique("Failed to evaluate image.");
      } finally {
          setIsCritiquing(false);
      }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage.url;
    const sanitizedProject = currentProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `${sanitizedProject}_render_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveToLibrary = async () => {
    if (!currentImage) return;
    const name = prompt("Name this asset to save to library:", "Edited Image");
    if (!name) return;

    const entity: SavedEntity = {
        id: crypto.randomUUID(),
        projectId: currentProject.id,
        name,
        data: currentImage.url,
        type: 'General',
        campaignId: 'default',
        createdAt: Date.now()
    };

    await db.saveLibraryItem(entity);
    onLibraryUpdate();
    showNotification("Saved to Asset Library!");
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
                      newRefs.push({
                          id: crypto.randomUUID(),
                          data: reader.result as string,
                          type: 'General',
                          name: file.name
                      });
                      resolve();
                  };
                  reader.readAsDataURL(file);
              });
          }
      }
      if (newRefs.length > 0) {
          setReferences(prev => [...prev, ...newRefs]);
          showNotification(`Added ${newRefs.length} references`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
    }
  };

  const removeReference = (id: string) => {
    setReferences(prev => prev.filter(r => r.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
    }
  };

  const handleCanvasUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              const newImg: GeneratedImage = {
                  id: crypto.randomUUID(),
                  projectId: currentProject.id,
                  url: result,
                  prompt: 'Uploaded Canvas',
                  aspectRatio: 'custom'
              };
              setCurrentImage(newImg);
              setPristineOriginal(newImg); // For non-destructive editing
              setCurrentEditStack([]); // Reset edit stack
              setHistory([{
                image: newImg,
                editStack: [],
                timestamp: Date.now(),
                label: 'Original'
              }]);
              if (onImageEdited) onImageEdited(newImg);
          };
          reader.readAsDataURL(file);
      }
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            const newImg: GeneratedImage = {
                id: crypto.randomUUID(),
                projectId: currentProject.id,
                url: result,
                prompt: 'Uploaded Canvas',
                aspectRatio: 'custom'
            };
            setCurrentImage(newImg);
            setPristineOriginal(newImg); // For non-destructive editing
            setCurrentEditStack([]); // Reset edit stack
            setHistory([{
              image: newImg,
              editStack: [],
              timestamp: Date.now(),
              label: 'Original'
            }]);
            if (onImageEdited) onImageEdited(newImg);
        };
        reader.readAsDataURL(file);
    }
  };

  const displayImage = showOriginal ? (history[0]?.image || initialImage) : currentImage;

  return (
    <div className="flex h-full bg-zinc-950 text-white font-sans selection:bg-violet-500/30">
      
      <CoverageModal 
        isOpen={showCoverageModal}
        onClose={() => setShowCoverageModal(false)}
        onGenerate={runCoverageGeneration}
      />
        
      {/* Lightbox */}
      {isLightboxOpen && references.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 backdrop-blur-xl animate-in fade-in duration-200" onClick={() => setIsLightboxOpen(false)}>
              <button onClick={() => setIsLightboxOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-8 h-8" /></button>
              <div className="flex gap-6 overflow-x-auto max-w-full p-4 items-center justify-center h-full">
                  {references.map(ref => (
                      <div key={ref.id} className="relative shrink-0 h-[80vh] aspect-auto bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                          <img src={ref.data} alt="Ref" className="h-full w-auto object-contain" />
                          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                              <p className="text-white font-medium text-lg">{ref.name}</p>
                              <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">{ref.type}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Critic Modal */}
      {showCritic && (
          <div className="absolute top-20 right-80 z-40 w-80 glass-panel rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-violet-300 flex items-center gap-2"><Gauge className="w-4 h-4"/> AI Critic</h3>
                  <button onClick={() => setShowCritic(false)}><X className="w-4 h-4 text-zinc-400 hover:text-white"/></button>
              </div>
              <div className="text-xs text-zinc-300 min-h-[100px]">
                  {isCritiquing ? (
                      <div className="flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin"/> Analyzing...</div>
                  ) : (
                      <ReactMarkdown>{critique}</ReactMarkdown>
                  )}
              </div>
              {/* Fix It Button */}
              {critique && !isCritiquing && (
                <button
                  onClick={handleApplyCritiqueFix}
                  disabled={isEditing}
                  className="w-full mt-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isEditing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                  {isEditing ? 'Fixing...' : 'Fix It → 10/10'}
                </button>
              )}
          </div>
      )}

      {/* Left Toolbar */}
      <div className="w-16 glass-panel border-r border-white/5 flex flex-col items-center py-6 space-y-5 shrink-0 z-20">
        <button onClick={onBack} className="p-2.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors" title="Back to Concepts">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Edit Queue Indicator */}
        {editQueue.length > 0 && onProcessQueue && (
          <button
            onClick={onProcessQueue}
            className="relative p-2.5 text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-all border border-amber-500/30"
            title={`${editQueue.length} image(s) in queue - Click to load next`}
          >
            <SkipForward className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
              {editQueue.length}
            </span>
          </button>
        )}

        <div className="h-px w-8 bg-white/10" />
        
        <button 
            onClick={handleAutoEnhance}
            disabled={!currentImage || isEditing}
            className={`p-2.5 rounded-xl transition-all ${isEditing ? 'text-violet-300 bg-violet-500/20 animate-pulse' : 'text-violet-400 bg-white/5 hover:bg-white/10 hover:text-violet-300'}`} 
            title="Magic Auto-Enhance"
        >
          <Wand2 className="w-5 h-5" />
        </button>

        <button 
            onClick={() => setIsBrushActive(!isBrushActive)}
            disabled={!currentImage || isEditing}
            className={`p-2.5 rounded-xl transition-all ${isBrushActive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Masking Brush (Paint area to edit)"
        >
            <Brush className="w-5 h-5" />
        </button>
        
        {hasMask && isBrushActive && (
            <button 
                onClick={clearMask}
                className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-white/10 rounded-xl transition-all"
                title="Clear Mask"
            >
                <Eraser className="w-5 h-5" />
            </button>
        )}
        
        <div className="h-px w-8 bg-white/10" />
        
        <button 
            onClick={() => setShowCoverageModal(true)}
            disabled={!currentImage || isEditing}
            className="p-2.5 text-blue-400 hover:text-blue-100 hover:bg-blue-500/20 rounded-xl transition-all"
            title="Generate Shot Coverage"
        >
            <Film className="w-5 h-5" />
        </button>

        <button 
            onClick={runQualityCheck}
            disabled={!currentImage || isEditing}
            className="p-2.5 text-emerald-400 hover:text-emerald-100 hover:bg-emerald-500/20 rounded-xl transition-all"
            title="Quality Check (AI Critic)"
        >
            <Gauge className="w-5 h-5" />
        </button>

        <div className="h-px w-8 bg-white/10" />

        <button
            onMouseDown={() => !isSplitView && setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            onTouchStart={() => !isSplitView && setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            disabled={!currentImage}
            className={`p-2.5 rounded-xl transition-all ${showOriginal ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Hold to view Original"
        >
            {showOriginal ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>

        <button 
            onClick={() => setIsSplitView(!isSplitView)}
            disabled={!currentImage}
            className={`p-2.5 rounded-xl transition-all ${isSplitView ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
            title="Side-by-Side Comparison"
        >
            <Columns className="w-5 h-5" />
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-950">
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
           {/* Background Grid Pattern */}
           <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>

           {!currentImage ? (
               <div 
                  className="relative z-10 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 bg-zinc-900/50 rounded-3xl p-16 text-center max-w-lg w-full hover:border-violet-500/30 hover:bg-zinc-800/50 transition-all cursor-pointer group backdrop-blur-sm"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleCanvasDrop}
                  onClick={() => canvasInputRef.current?.click()}
               >
                   <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-xl">
                       <ImagePlus className="w-12 h-12 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                   </div>
                   <h3 className="text-2xl font-semibold text-white mb-2 tracking-tight">Upload Canvas</h3>
                   <p className="text-zinc-400 mb-8 font-light">Drag and drop an image here to start editing,<br/>or click to browse.</p>
                   <button className="bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg">Select Image</button>
                   <input type="file" ref={canvasInputRef} className="hidden" accept="image/*" onChange={handleCanvasUpload} />
               </div>
           ) : (
             <div className="relative w-full h-full flex items-center justify-center z-10">
                 {isSplitView ? (
                     <div className="flex w-full h-full gap-4 items-center justify-center p-4">
                         {/* Pristine Original */}
                         <div className="flex-1 h-full flex flex-col relative border border-white/10 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                             <div className="absolute top-4 left-4 z-10 bg-blue-500/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-1">
                               <Home className="w-3 h-3" /> PRISTINE ORIGINAL
                             </div>
                             <img src={pristineOriginal?.url || history[0]?.image.url} className="w-full h-full object-contain" alt="Original" />
                         </div>
                         {/* Current */}
                         <div className="flex-1 h-full flex flex-col relative border border-white/10 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                             <div className="absolute top-4 left-4 z-10 bg-violet-500/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                               CURRENT {currentEditStack.length > 0 && `(${currentEditStack.length} edits)`}
                             </div>
                             <img src={currentImage.url} className="w-full h-full object-contain" alt="Current" />
                         </div>
                     </div>
                 ) : (
                    <div 
                        ref={containerRef}
                        className="relative shadow-2xl shadow-black/50 border border-white/5 bg-zinc-900 max-h-full max-w-full flex items-center justify-center rounded-2xl overflow-hidden"
                    >
                    <img 
                        src={displayImage?.url} 
                        alt="Canvas" 
                        className={`max-h-[80vh] max-w-full object-contain transition-all duration-300 ${isEditing ? 'opacity-50 blur-sm scale-[0.98]' : 'opacity-100'} ${showOriginal ? 'grayscale-[0.5]' : ''}`}
                        draggable={false}
                    />
                    
                    <canvas 
                        ref={maskCanvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className={`absolute inset-0 w-full h-full cursor-crosshair touch-none ${isBrushActive ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
                    />

                    {isEditing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                        <Loader2 className="w-12 h-12 text-violet-400 animate-spin mb-4" />
                        <span className="text-violet-200 font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">Refining Details...</span>
                        </div>
                    )}
                    
                    {showOriginal && (
                        <div className="absolute top-6 left-6 bg-blue-600/90 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg pointer-events-none animate-in fade-in backdrop-blur-md border border-white/20">
                            ORIGINAL
                        </div>
                    )}
                    </div>
                 )}
             </div>
           )}
        </div>
        
        {/* Bottom Editing Bar */}
        <div 
            className={`glass-panel border-t border-white/5 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-colors relative pb-6 ${isDragging ? 'bg-zinc-800 border-violet-500' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
           {/* NON-DESTRUCTIVE EDIT STACK PANEL */}
           {useNonDestructive && currentEditStack.length > 0 && currentImage && (
             <div className="mx-6 mt-4 bg-zinc-900/80 border border-zinc-700 rounded-xl p-3 backdrop-blur-sm">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <Layers className="w-4 h-4 text-violet-400" />
                   <span className="text-xs font-bold text-zinc-300">Edit Stack ({currentEditStack.length})</span>
                   <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Non-destructive</span>
                   {useChainedEdits ? (
                     <span className="text-[10px] text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                       🔗 Chained (edits build on canvas)
                     </span>
                   ) : (
                     <span className="text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                       🔄 Re-apply All (from pristine)
                     </span>
                   )}
                   {pristineOriginal && (
                     <span className="text-[10px] text-zinc-500 bg-zinc-700/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                       <Home className="w-3 h-3" /> Pristine preserved
                     </span>
                   )}
                 </div>
                 <div className="flex items-center gap-2">
                   <button
                     onClick={handleFinalRender}
                     disabled={isEditing || currentEditStack.length === 0}
                     className="text-[10px] text-violet-400 hover:text-violet-300 bg-violet-500/20 hover:bg-violet-500/30 px-2 py-1 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                     title="Re-render all edits from pristine original at maximum quality"
                   >
                     <Wand2 className="w-3 h-3" /> Final Render
                   </button>
                   <button
                     onClick={resetToPristineOriginal}
                     className="text-[10px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                     title="Reset to pristine original (clears all edits)"
                   >
                     <Home className="w-3 h-3" /> Reset to Original
                   </button>
                 </div>
               </div>
               <div className="flex flex-wrap gap-2">
                 {currentEditStack.map((edit, i) => (
                   <div key={edit.id} className="flex items-center bg-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 max-w-[200px] group">
                     <span className="truncate" title={edit.instruction}>
                       {i + 1}. {edit.instruction.slice(0, 40)}{edit.instruction.length > 40 ? '...' : ''}
                     </span>
                     {edit.masked && <span className="ml-1 text-red-400" title="Masked edit">🎭</span>}
                     <button
                       onClick={() => removeEditFromStack(i)}
                       disabled={isEditing}
                       className="ml-2 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
                     >
                       <X className="w-3 h-3" />
                     </button>
                   </div>
                 ))}
               </div>
               <p className="text-[9px] text-zinc-500 mt-2">
                 {useChainedEdits
                   ? "🔗 Chained mode: Each edit builds on the CURRENT canvas. Use 'Final Render' to clean re-render from pristine."
                   : "🔄 Re-apply mode: All edits are combined and applied to pristine original each time. Remove any edit to re-render."}
               </p>
             </div>
           )}

           {/* Quick Edits Row */}
           {currentImage && !isEditing && (
             <div className="flex gap-3 px-6 pt-4 overflow-x-auto scrollbar-none justify-center items-center relative z-[60]">
                {/* Non-destructive Mode Toggle */}
                <button
                  onClick={() => setUseNonDestructive(!useNonDestructive)}
                  className={`shrink-0 px-3 py-2 text-[10px] rounded-full border transition-all font-medium ${
                    useNonDestructive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                  }`}
                  title={useNonDestructive ? "Non-destructive: Edit stack is tracked" : "Destructive: No edit stack tracking"}
                >
                  <Layers className="w-3 h-3 inline mr-1" />
                  {useNonDestructive ? 'Stack Mode' : 'Layer Mode'}
                </button>

                {/* Chained Edits Toggle - Only show when in non-destructive mode */}
                {useNonDestructive && (
                  <button
                    onClick={() => setUseChainedEdits(!useChainedEdits)}
                    className={`shrink-0 px-3 py-2 text-[10px] rounded-full border transition-all font-medium ${
                      useChainedEdits
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                    title={useChainedEdits
                      ? "🔗 Chained: Each edit builds on CURRENT canvas (recommended)"
                      : "🔄 Re-apply: All edits combined on PRISTINE original each time"}
                  >
                    {useChainedEdits ? (
                      <>🔗 Chained</>
                    ) : (
                      <>🔄 Re-apply All</>
                    )}
                  </button>
                )}

                {/* Lookbook Style Toggle */}
                {productionDesign && (productionDesign.visualStyle || productionDesign.styleRefs?.length) && (
                  <button
                    onClick={() => setUseLookbook(!useLookbook)}
                    className={`shrink-0 px-3 py-2 text-[10px] rounded-full border transition-all font-medium ${
                      useLookbook 
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' 
                        : 'bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                    }`}
                    title={`Style: ${productionDesign.visualStyle || 'Custom'}\n${productionDesign.styleRefs?.length || 0} reference images`}
                  >
                    <Palette className="w-3 h-3 inline mr-1" />
                    {useLookbook ? 'Lookbook On' : 'Lookbook Off'}
                  </button>
                )}

                {/* ENHANCE DROPDOWN */}
                <div className="relative shrink-0">
                  <button
                    ref={enhanceButtonRef}
                    onClick={() => openDropdownWithPosition('enhance')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full border transition-all backdrop-blur-sm ${
                      openDropdown === 'enhance'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Enhance
                    <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'enhance' ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* STYLE DROPDOWN */}
                <div className="relative shrink-0">
                  <button
                    ref={styleButtonRef}
                    onClick={() => openDropdownWithPosition('style')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full border transition-all backdrop-blur-sm ${
                      openDropdown === 'style'
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                        : 'bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    Style
                    <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'style' ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* ROTATE DROPDOWN */}
                <div className="relative shrink-0">
                  <button
                    ref={rotateButtonRef}
                    onClick={() => openDropdownWithPosition('rotate')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full border transition-all backdrop-blur-sm ${
                      openDropdown === 'rotate'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : 'bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Rotate
                    <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'rotate' ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* LIGHTING DROPDOWN */}
                <div className="relative shrink-0">
                  <button
                    ref={lightingButtonRef}
                    onClick={() => openDropdownWithPosition('lighting')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full border transition-all backdrop-blur-sm ${
                      openDropdown === 'lighting'
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                        : 'bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    Lighting
                    <ChevronDown className={`w-3 h-3 transition-transform ${openDropdown === 'lighting' ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-zinc-700 mx-1 shrink-0" />

                {/* Quick Actions (remaining simple buttons) */}
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => handleEdit(action.prompt, (action as any).resolution)}
                    className="shrink-0 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700 text-xs text-zinc-300 rounded-full border border-white/5 hover:border-white/20 transition-all font-medium backdrop-blur-sm"
                  >
                    {action.label}
                  </button>
                ))}

                {/* Match Reference Preset Drop Zone */}
                <div
                    className="shrink-0 relative group px-4 py-2 bg-zinc-800/50 hover:bg-violet-900/20 text-xs text-zinc-300 hover:text-violet-300 rounded-full border border-white/5 hover:border-violet-500/30 transition-all font-medium backdrop-blur-sm cursor-pointer border-dashed"
                    onClick={() => styleInputRef.current?.click()}
                >
                    <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> Match Style</span>
                    <input
                        type="file"
                        ref={styleInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleStyleMatch(e.target.files)}
                    />
                </div>
             </div>
           )}

           {/* Dropdown Menus - Rendered via Portal for proper z-index layering */}
           {openDropdown && createPortal(
             <>
               {/* Click-outside overlay */}
               <div
                 className="fixed inset-0 z-[9998]"
                 onClick={() => setOpenDropdown(null)}
               />

               {/* ENHANCE DROPDOWN MENU */}
               {openDropdown === 'enhance' && (
                 <div
                   className="fixed w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-150"
                   style={{
                     top: `${dropdownPosition.top}px`,
                     left: `${dropdownPosition.left}px`
                   }}
                 >
                   <div className="p-2 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-2">
                     <Sun className="w-3 h-3" /> Enhance Options
                   </div>
                   <div className="max-h-64 overflow-y-auto">
                     {ENHANCE_OPTIONS.map(opt => (
                       <button
                         key={opt.label}
                         onClick={() => { handleEdit(opt.prompt); setOpenDropdown(null); }}
                         className="w-full px-4 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors border-b border-zinc-800/50 last:border-0"
                       >
                         {opt.label}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               {/* STYLE DROPDOWN MENU */}
               {openDropdown === 'style' && (
                 <div
                   className="fixed w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-150"
                   style={{
                     top: `${dropdownPosition.top}px`,
                     left: `${dropdownPosition.left}px`
                   }}
                 >
                   <div className="p-2 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-2">
                     <Palette className="w-3 h-3" /> Style Transform
                   </div>

                   {/* AI Style Extraction Button */}
                   <div className="p-2 border-b border-zinc-700">
                     <button
                       onClick={extractStyleFromCurrentImage}
                       disabled={!currentImage || isExtractingStyle}
                       className="w-full text-left px-3 py-2 text-xs text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <Sparkles className="w-3 h-3" />
                       {isExtractingStyle ? 'Analyzing Style...' : 'Save Current Style (AI)'}
                     </button>
                   </div>

                   {/* Scrollable container for ALL styles - always render both sections to avoid conditional render paint bug */}
                   <div
                     ref={styleDropdownRef}
                     className="max-h-[400px] overflow-y-auto"
                   >
                     {/* Custom Styles Section - always rendered */}
                     <div className="text-[10px] text-zinc-500 uppercase tracking-wider px-4 py-1.5 bg-zinc-800/50 sticky top-0 z-10 border-b border-zinc-700">
                       Your Custom Styles ({customStyles.length})
                     </div>
                     {customStyles.length > 0 ? (
                       customStyles.map(style => (
                         <div key={style.id} className="flex items-center group">
                           <button
                             onClick={() => { handleEdit(style.prompt); setOpenDropdown(null); }}
                             className="flex-1 text-left px-4 py-2.5 text-xs text-violet-300 hover:bg-violet-500/20 hover:text-white transition-colors"
                             title={style.prompt}
                           >
                             {style.name}
                           </button>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               deleteCustomStyle(style.id);
                             }}
                             className="p-2 text-red-400 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                             title="Delete style"
                           >
                             <X className="w-3 h-3" />
                           </button>
                         </div>
                       ))
                     ) : (
                       <div className="px-4 py-2 text-xs text-zinc-600 italic">
                         No custom styles yet
                       </div>
                     )}

                     {/* Built-in Styles Section */}
                     <div className="text-[10px] text-zinc-500 uppercase tracking-wider px-4 py-1.5 bg-zinc-800/50 sticky top-0 z-10 border-b border-zinc-700">
                       Built-in Styles
                     </div>
                     {STYLE_OPTIONS.map(opt => (
                       <button
                         key={opt.label}
                         onClick={() => { handleEdit(opt.prompt); setOpenDropdown(null); }}
                         className="w-full px-4 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors border-b border-zinc-800/50 last:border-0"
                       >
                         {opt.label}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               {/* ROTATE DROPDOWN MENU */}
               {openDropdown === 'rotate' && (
                 <div
                   className="fixed w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-150"
                   style={{
                     top: `${dropdownPosition.top}px`,
                     left: `${dropdownPosition.left}px`
                   }}
                 >
                   <div className="p-2 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-2">
                     <RotateCw className="w-3 h-3" /> Camera Angle
                   </div>
                   <div className="max-h-64 overflow-y-auto">
                     {ROTATE_OPTIONS.map(opt => (
                       <button
                         key={opt.label}
                         onClick={() => { handleEdit(opt.prompt); setOpenDropdown(null); }}
                         className="w-full px-4 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors border-b border-zinc-800/50 last:border-0"
                       >
                         {opt.label}
                       </button>
                     ))}
                   </div>
                 </div>
               )}

               {/* LIGHTING DROPDOWN MENU */}
               {openDropdown === 'lighting' && (
                 <div
                   className="fixed w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-150"
                   style={{
                     top: `${dropdownPosition.top}px`,
                     left: `${dropdownPosition.left}px`
                   }}
                 >
                   <div className="p-2 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-2">
                     <Lightbulb className="w-3 h-3" /> Lighting Setup
                   </div>
                   <div className="max-h-64 overflow-y-auto">
                     {LIGHTING_OPTIONS.map(opt => (
                       <button
                         key={opt.label}
                         onClick={() => { handleEdit(opt.prompt); setOpenDropdown(null); }}
                         className="w-full px-4 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors border-b border-zinc-800/50 last:border-0"
                       >
                         {opt.label}
                       </button>
                     ))}
                   </div>
                 </div>
               )}
             </>,
             document.body
           )}

           {/* Save Custom Style Modal */}
           {showSaveStyleModal && createPortal(
             <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
               <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-white font-bold flex items-center gap-2">
                     <Sparkles className="w-5 h-5 text-violet-400" />
                     Save Custom Style
                   </h3>
                   <button
                     onClick={() => {
                       setShowSaveStyleModal(false);
                       setNewStyleName('');
                       setNewStylePrompt('');
                     }}
                     className="text-zinc-500 hover:text-white transition-colors"
                   >
                     <X className="w-5 h-5" />
                   </button>
                 </div>

                 <p className="text-xs text-zinc-400 mb-4">
                   {isExtractingStyle
                     ? 'AI is analyzing your image style...'
                     : 'Name this style to save it for future use.'}
                 </p>

                 <label className="block mb-3">
                   <span className="text-xs text-zinc-400 mb-1.5 block">Style Name</span>
                   <input
                     type="text"
                     value={newStyleName}
                     onChange={(e) => setNewStyleName(e.target.value)}
                     placeholder="e.g., 'Golden Hour Portrait', 'Neon Cyberpunk'"
                     className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                     autoFocus={!isExtractingStyle}
                   />
                 </label>

                 <label className="block mb-5">
                   <span className="text-xs text-zinc-400 mb-1.5 block flex items-center gap-2">
                     AI-Extracted Style Description
                     {isExtractingStyle && <Loader2 className="w-3 h-3 animate-spin text-violet-400" />}
                   </span>
                   {isExtractingStyle ? (
                     <div className="w-full bg-zinc-800 border border-violet-500/30 rounded-lg px-3 py-4 text-sm text-zinc-400 h-28 flex items-center justify-center">
                       <div className="flex flex-col items-center gap-2">
                         <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                         <span className="text-xs">Analyzing image style...</span>
                       </div>
                     </div>
                   ) : (
                     <textarea
                       value={newStylePrompt}
                       onChange={(e) => setNewStylePrompt(e.target.value)}
                       placeholder="Style description will appear here after AI analysis..."
                       className="w-full bg-zinc-800 border border-violet-500/30 rounded-lg px-3 py-2.5 text-sm text-zinc-300 h-28 resize-none focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                       readOnly={false}
                     />
                   )}
                   <span className="text-[10px] text-violet-400 mt-1 block flex items-center gap-1">
                     <Sparkles className="w-3 h-3" />
                     Auto-generated by AI from your current image
                   </span>
                 </label>

                 <div className="flex gap-2">
                   <button
                     onClick={saveCustomStyle}
                     disabled={!newStyleName.trim() || !newStylePrompt.trim() || isExtractingStyle}
                     className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                   >
                     <Save className="w-4 h-4" />
                     Save Style
                   </button>
                   <button
                     onClick={() => {
                       setShowSaveStyleModal(false);
                       setNewStyleName('');
                       setNewStylePrompt('');
                     }}
                     className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
                   >
                     Cancel
                   </button>
                 </div>
               </div>
             </div>,
             document.body
           )}

           {isDragging && (
                 <div className="absolute inset-0 z-20 bg-violet-500/10 backdrop-blur-md flex items-center justify-center border-t-2 border-violet-500 pointer-events-none">
                     <p className="text-violet-200 font-semibold flex items-center gap-3 text-lg"><Upload className="w-6 h-6" /> Drop visual references here</p>
                 </div>
           )}

           {references.length > 0 && (
               <div className="flex gap-3 overflow-x-auto px-6 py-3 bg-black/20 border-b border-white/5 scrollbar-thin scrollbar-thumb-zinc-700">
                   {references.map(ref => (
                       <div key={ref.id} className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-white/10 group cursor-pointer shadow-lg" onClick={() => setIsLightboxOpen(true)}>
                           <img src={ref.data} alt="ref" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                           <button onClick={(e) => { e.stopPropagation(); removeReference(ref.id); }} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 backdrop-blur-sm">
                               <X className="w-3 h-3" />
                           </button>
                       </div>
                   ))}
               </div>
           )}

           <div className="h-24 px-6 py-4 flex items-center justify-center gap-4">
             <div className="max-w-4xl w-full flex items-center gap-3">
               
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!currentImage}
                  className="p-4 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-all border border-white/5 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  title="Upload Reference Image for Edit"
               >
                   <Plus className="w-5 h-5" />
               </button>
               <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept="image/*"
                   multiple
                   onChange={handleFileUpload}
               />

               <div className="relative flex-1 group">
                  <Wand2 className="absolute left-4 top-4 w-5 h-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors z-10" />
                  <input
                      ref={instructionInputRef}
                      type="text"
                      value={instruction}
                      onChange={handleInstructionChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !showMentions) handleEdit();
                        if (e.key === 'Escape') setShowMentions(false);
                      }}
                      disabled={!currentImage}
                      placeholder={hasMask ? "Describe changes for the RED MASKED area only..." : (currentImage ? "Type @ to add characters/locations/products, e.g., 'Add @Millie in front of @BigBen'..." : "Upload a canvas image to start editing")}
                      className={`w-full bg-zinc-800/50 border border-white/5 hover:border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-zinc-500 shadow-inner ${hasMask ? 'border-red-500/30 focus:ring-red-500/30' : ''}`}
                  />
                  {/* @mention autocomplete dropdown */}
                  {showMentions && getMentionableEntities().length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 w-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto z-50">
                      <div className="p-2 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase font-bold">
                        Bible Entities - Type to filter
                      </div>
                      {getMentionableEntities().slice(0, 10).map(entity => (
                        <button
                          key={`${entity.type}-${entity.id}`}
                          onClick={() => insertMention(entity)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800/50 last:border-0"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                            entity.type === 'character' ? 'bg-emerald-600' :
                            entity.type === 'location' ? 'bg-blue-600' :
                            'bg-amber-600'
                          }`}>
                            {entity.type === 'character' ? 'C' : entity.type === 'location' ? 'L' : 'P'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{entity.name}</div>
                            <div className="text-xs text-zinc-500 truncate">
                              {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
                              {entity.imageRefs && entity.imageRefs.length > 0 && ` • ${entity.imageRefs.length} refs`}
                            </div>
                          </div>
                          {entity.imageRefs && entity.imageRefs[0] && (
                            <img src={entity.imageRefs[0]} alt="" className="w-8 h-8 rounded object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
               </div>
               <button
                  onClick={isEditing ? handleCancelEdit : () => handleEdit()}
                  disabled={!currentImage || (!isEditing && !instruction && references.length === 0)}
                  className={`px-8 py-4 rounded-2xl font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 ${
                    isEditing
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600'
                  }`}
               >
                  {isEditing ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      Cancel
                    </>
                  ) : (hasMask ? 'Edit Region' : 'Apply Edit')}
               </button>
               {/* Loading phase indicator */}
               {isEditing && editingPhase && (
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                   <span className="text-xs text-violet-400 bg-violet-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                     <Loader2 className="w-3 h-3 animate-spin" />
                     {editingPhase}
                   </span>
                 </div>
               )}
             </div>
             
             <div className="h-10 w-px bg-white/10 mx-2" />
             
             <button 
               onClick={saveToLibrary}
               disabled={!currentImage}
               className="p-4 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 disabled:opacity-50" title="Save to Library">
               <Save className="w-5 h-5" />
             </button>
             {/* Upload to Gallery */}
             {onAddToGallery && (
               <button 
                 onClick={() => galleryUploadRef.current?.click()}
                 className="p-4 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-2xl transition-all border border-transparent hover:border-emerald-500/30" title="Upload to Gallery">
                 <Plus className="w-5 h-5" />
               </button>
             )}
             <input 
               type="file" 
               ref={galleryUploadRef} 
               className="hidden" 
               accept="image/*" 
               multiple
               onChange={(e) => handleUploadToGallery(e.target.files)} 
             />
             <button 
               onClick={handleDownload}
               disabled={!currentImage}
               className="p-4 text-zinc-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 disabled:opacity-50" title="Download High-Res">
               <Download className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>

      {/* Right Panel: History / Layers */}
      <div className="w-80 glass-panel border-l border-white/5 p-6 hidden lg:flex flex-col shrink-0 z-20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-4 h-4" /> Version History
          </h3>
          {pristineOriginal && (
            <button
              onClick={resetToPristineOriginal}
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              title="Reset to pristine original"
            >
              <Home className="w-3 h-3" /> Pristine
            </button>
          )}
        </div>

        {history.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs text-center px-4 font-medium">
                No edit history yet.
            </div>
        ) : (
            <div className="space-y-5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {[...history].reverse().map((historyItem, idx) => {
                const isOriginal = idx === history.length - 1;
                const editNum = history.length - 1 - idx;
                const isCurrent = historyItem.image.id === currentImage?.id;

                return (
                <div
                    key={historyItem.image.id}
                    className={`cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden bg-zinc-900 group relative ${isCurrent ? 'border-violet-500/50 ring-2 ring-violet-500/20 shadow-xl' : 'border-white/5 hover:border-white/20 opacity-60 hover:opacity-100 hover:scale-[1.02]'}`}
                >
                  <div onClick={() => restoreFromHistory(historyItem, false)}>
                    <img src={historyItem.image.url} alt="Thumbnail" className="w-full h-36 object-cover" />
                    <div className="p-4 bg-zinc-900/90 backdrop-blur-sm border-t border-white/5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">
                            {historyItem.label || (isOriginal ? 'Original' : `Edit #${editNum}`)}
                          </span>
                          {historyItem.isBranch && (
                            <span title="Branch point">
                              <GitBranch className="w-3 h-3 text-amber-400" />
                            </span>
                          )}
                          {historyItem.editStack.length > 0 && (
                            <span className="text-[9px] text-violet-400 bg-violet-500/20 px-1.5 py-0.5 rounded">
                              {historyItem.editStack.length} edit{historyItem.editStack.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-300 truncate font-medium">
                          {historyItem.image.prompt}
                        </div>
                    </div>
                  </div>

                  {/* Branch button - creates new edit path from this version */}
                  {!isCurrent && !isOriginal && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        restoreFromHistory(historyItem, true);
                      }}
                      className="absolute top-2 left-2 bg-amber-500/80 hover:bg-amber-400 text-black p-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Branch from this version"
                    >
                      <GitBranch className="w-3 h-3" />
                    </button>
                  )}

                  {isCurrent && (
                      <div className="absolute top-3 right-3 bg-violet-600 text-white p-1 rounded-full shadow-lg">
                          <Check className="w-3 h-3" />
                      </div>
                  )}

                  {isOriginal && (
                    <div className="absolute top-3 right-3 bg-blue-600 text-white p-1 rounded-full shadow-lg" title="Pristine original">
                      <Home className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}
            </div>
        )}
      </div>

    </div>
  );
};

export default StageTwo;
