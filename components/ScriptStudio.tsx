
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, FileText, Users, Film, Layout, Sparkles, Plus, Trash2, Save, Wand2, Image as ImageIcon, ArrowRight, Loader2, Upload, Palette, Video, Lock, Unlock, CheckCircle2, AlertCircle, MapPin, Package, Sun, Cloud, Building2, Eye, Search, RefreshCw, Grid, Lightbulb, X, Camera, User, Move, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Project, ScriptData, Beat, Shot, CharacterProfile, LocationProfile, ProductProfile, GeneratedImage, ReferenceAsset, ProductionDesign, BeatStatus, CoverageAnalysis, RefCoverage, FocalLength, Aperture, ColorTemperature, CameraRig, MoodBoard } from '../types';
import { analyzeScript, consultDirectorChat, analyzeImageCoverage, generateMissingReference, generateCharacterAvatar } from '../services/gemini';
import { db } from '../services/db';
import ReactMarkdown from 'react-markdown';
import VariantExplorer from './VariantExplorer';

interface ScriptStudioProps {
  currentProject: Project;
  onUpdateScriptData: (data: ScriptData) => void;
  savedData?: ScriptData;
  showNotification: (msg: string) => void;
  onGenerateBeat: (beat: Beat, characters: CharacterProfile[], locations: LocationProfile[], products: ProductProfile[]) => void;
  onGenerateSequence: (beat: Beat, characters: CharacterProfile[], locations: LocationProfile[], products: ProductProfile[]) => void;
  onGenerateCharacterSheet: (character: CharacterProfile) => Promise<string | null>;
  onGenerateExpressionBank: (character: CharacterProfile) => Promise<string | null>;
  onSyncStoryboard: (beats: Beat[]) => void;
  incomingCharacter?: GeneratedImage | null;
  moodBoards?: MoodBoard[];
  onSaveVariantToHistory?: (variant: GeneratedImage) => void;
}

const ScriptStudio: React.FC<ScriptStudioProps> = ({
    currentProject,
    onUpdateScriptData,
    savedData,
    showNotification,
    onGenerateBeat,
    onGenerateSequence,
    onGenerateCharacterSheet,
    onGenerateExpressionBank,
    onSyncStoryboard,
    incomingCharacter,
    moodBoards = [],
    onSaveVariantToHistory
}) => {
  const [activeTab, setActiveTab] = useState<'script' | 'design' | 'beats' | 'characters' | 'locations' | 'products'>('script');
  
  const [scriptContent, setScriptContent] = useState(savedData?.content || '');
  const [beats, setBeats] = useState<Beat[]>(savedData?.beats || []);
  const [characters, setCharacters] = useState<CharacterProfile[]>(savedData?.characters || []);
  const [locations, setLocations] = useState<LocationProfile[]>(savedData?.locations || []);
  const [products, setProducts] = useState<ProductProfile[]>(savedData?.products || []);
  const [productionDesign, setProductionDesign] = useState<ProductionDesign>(savedData?.productionDesign || {
      visualStyle: '', colorPalette: '', cameraLanguage: '', lightingApproach: '', styleRefs: []
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // New Entity Input State
  const [newCharName, setNewCharName] = useState('');
  const [newLocName, setNewLocName] = useState('');
  const [newProdName, setNewProdName] = useState('');
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', content: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  // Coverage Analysis State
  const [analyzingCoverageFor, setAnalyzingCoverageFor] = useState<string | null>(null);
  const [generatingRefFor, setGeneratingRefFor] = useState<{charId: string, view: string} | null>(null);
  const [generatingAvatarFor, setGeneratingAvatarFor] = useState<string | null>(null);

  // Beat Editing State
  const [editingBeatId, setEditingBeatId] = useState<string | null>(null);
  const [editingBeatText, setEditingBeatText] = useState<string>('');
  const [expandedSequenceId, setExpandedSequenceId] = useState<string | null>(null);
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(null); // Full beat editor panel
  const [generatingShotsFor, setGeneratingShotsFor] = useState<string | null>(null);

  // Lighting Reference State
  const [analyzingLighting, setAnalyzingLighting] = useState(false);

  // Ref Coverage State
  const [expandedRefCoverage, setExpandedRefCoverage] = useState<string | null>(null);

  // Character Sheet Generation State
  const [generatingSheetFor, setGeneratingSheetFor] = useState<string | null>(null);
  const [expandedSheetId, setExpandedSheetId] = useState<string | null>(null);

  // Expression Bank Generation State
  const [generatingExpressionFor, setGeneratingExpressionFor] = useState<string | null>(null);
  const [expandedExpressionId, setExpandedExpressionId] = useState<string | null>(null);

  // Batch Beat Generation State
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{current: number, total: number, currentTask?: string} | null>(null);

  // Brain Dump Import State
  const [showBrainDumpModal, setShowBrainDumpModal] = useState(false);
  const [brainDumpText, setBrainDumpText] = useState('');
  const [processingBrainDump, setProcessingBrainDump] = useState(false);

  // Variant Explorer State
  const [exploringBeat, setExploringBeat] = useState<Beat | null>(null);

  // Debounce save logic
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get all entity names for datalist autocomplete
  const allCharacterNames = [...new Set([
      ...characters.map(c => c.name),
      ...beats.flatMap(b => b.characters || [])
  ])];

  const allLocationNames = [...new Set([
      ...locations.map(l => l.name),
      ...beats.flatMap(b => b.locations || [])
  ])];

  const allProductNames = [...new Set([
      ...products.map(p => p.name),
      ...beats.flatMap(b => b.products || [])
  ])];

  // Memoized save function to avoid recreating on every render
  const saveData = useCallback((data: ScriptData) => {
      onUpdateScriptData(data);
      db.saveScriptData(currentProject.id, data).catch(console.error);
  }, [currentProject.id, onUpdateScriptData]);

  // Create stable data reference to compare changes
  const dataRef = useRef<string>('');

  useEffect(() => {
      // Auto-save to DB after 1s of inactivity
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      const data: ScriptData = { content: scriptContent, beats, characters, locations, products, productionDesign };
      const dataString = JSON.stringify(data);

      // Skip save if data hasn't actually changed
      if (dataString === dataRef.current) return;

      saveTimeoutRef.current = setTimeout(() => {
          dataRef.current = dataString;
          saveData(data);
      }, 1000);

      return () => {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      };
  }, [scriptContent, beats, characters, locations, products, productionDesign, saveData]);

  // Handle incoming character from Stage 1
  useEffect(() => {
      if (incomingCharacter) {
          setActiveTab('characters');
          const name = prompt("Enter character name for this reference:", "New Character");
          if (name) {
              const existing = characters.find(c => c.name.toLowerCase() === name.toLowerCase());
              if (existing) {
                  updateCharacter(existing.id, 'imageRefs', [incomingCharacter.url, ...(existing.imageRefs || [])]);
                  showNotification(`Updated ${existing.name} with reference.`);
              } else {
                  const newChar: CharacterProfile = {
                      id: crypto.randomUUID(),
                      name: name,
                      description: incomingCharacter.prompt,
                      imageRefs: [incomingCharacter.url],
                      promptSnippet: `Character looks like linked reference. ${incomingCharacter.prompt}`,
                      consistencyAnchors: 'Matching reference image'
                  };
                  setCharacters(prev => [...prev, newChar]);
                  showNotification(`Created character: ${name}`);
              }
          }
      }
  }, [incomingCharacter]);

  const handleAnalyze = async () => {
      if (!scriptContent.trim()) return;
      setIsAnalyzing(true);
      try {
          const result = await analyzeScript(scriptContent);
          // Update beats with new structure (including locations/products arrays)
          const beatsWithEntityArrays = result.beats.map(b => ({
              ...b,
              locations: b.locations || [],
              products: b.products || []
          }));
          setBeats(beatsWithEntityArrays);
          
          // Merge characters carefully
          const uniqueChars = [...characters];
          result.characters.forEach(newC => {
              if (!uniqueChars.find(c => c.name === newC.name)) {
                  uniqueChars.push(newC);
              }
          });
          setCharacters(uniqueChars);
          setActiveTab('beats');
          showNotification("Script breakdown complete");
      } catch (e) {
          console.error(e);
          showNotification("Failed to analyze script");
      } finally {
          setIsAnalyzing(false);
      }
  };

  // Character CRUD
  const addCharacter = () => {
      if (!newCharName.trim()) return;
      setCharacters([...characters, { id: crypto.randomUUID(), name: newCharName, description: '', imageRefs: [] }]);
      setNewCharName('');
  };

  const updateCharacter = (id: string, field: keyof CharacterProfile, value: any) => {
      setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const deleteCharacter = (id: string) => {
      // Prevent deletion of locked characters
      const char = characters.find(c => c.id === id);
      if (char?.isLocked) {
          showNotification('⚠️ Cannot delete a locked character');
          return;
      }
      setCharacters(prev => prev.filter(c => c.id !== id));
  };

  // Character Coverage Analysis
  const handleAnalyzeCoverage = async (charId: string) => {
      const char = characters.find(c => c.id === charId);
      if (!char || !char.imageRefs || char.imageRefs.length === 0) {
          showNotification('Add reference images first before analyzing coverage.');
          return;
      }

      setAnalyzingCoverageFor(charId);
      try {
          const analysis = await analyzeImageCoverage(
              char.imageRefs,
              char.name,
              char.description || ''
          );
          updateCharacter(charId, 'coverageAnalysis', analysis);
          showNotification(`✅ Coverage analyzed for ${char.name}`);
      } catch (error) {
          console.error('Coverage analysis failed:', error);
          showNotification('❌ Coverage analysis failed');
      } finally {
          setAnalyzingCoverageFor(null);
      }
  };

  // Generate Missing Reference View
  const handleGenerateMissingView = async (charId: string, missingView: string) => {
      const char = characters.find(c => c.id === charId);
      if (!char || !char.imageRefs || char.imageRefs.length === 0) {
          showNotification('Need existing references to generate new views.');
          return;
      }

      setGeneratingRefFor({ charId, view: missingView });
      try {
          const newImageUrl = await generateMissingReference(
              char.imageRefs,
              char.name,
              char.description || '',
              missingView,
              productionDesign?.visualStyle || undefined
          );

          if (newImageUrl) {
              // Add to character's imageRefs
              const updatedRefs = [...(char.imageRefs || []), newImageUrl];
              updateCharacter(charId, 'imageRefs', updatedRefs);
              
              // Remove from missing views in coverage analysis
              if (char.coverageAnalysis) {
                  const updatedAnalysis = {
                      ...char.coverageAnalysis,
                      existingViews: [...char.coverageAnalysis.existingViews, missingView],
                      missingViews: char.coverageAnalysis.missingViews.filter(v => v !== missingView)
                  };
                  updateCharacter(charId, 'coverageAnalysis', updatedAnalysis);
              }
              
              showNotification(`✅ Generated ${missingView} for ${char.name}`);
          } else {
              showNotification('❌ Failed to generate reference');
          }
      } catch (error) {
          console.error('Reference generation failed:', error);
          showNotification('❌ Reference generation failed');
      } finally {
          setGeneratingRefFor(null);
      }
  };

  // Auto-Visualize Character from Description
  const handleAutoVisualize = async (charId: string) => {
      const char = characters.find(c => c.id === charId);
      if (!char || !char.description) {
          showNotification('Add a description first before auto-visualizing.');
          return;
      }

      setGeneratingAvatarFor(charId);
      try {
          const avatarUrl = await generateCharacterAvatar(
              char.name,
              char.description,
              productionDesign?.visualStyle || undefined
          );

          if (avatarUrl) {
              // Add to character's imageRefs
              const updatedRefs = [avatarUrl, ...(char.imageRefs || [])];
              updateCharacter(charId, 'imageRefs', updatedRefs);
              showNotification(`✅ Created avatar for ${char.name}`);
          } else {
              showNotification('❌ Failed to generate avatar');
          }
      } catch (error) {
          console.error('Avatar generation failed:', error);
          showNotification('❌ Avatar generation failed');
      } finally {
          setGeneratingAvatarFor(null);
      }
  };

  // Location CRUD
  const addLocation = () => {
      if (!newLocName.trim()) return;
      setLocations([...locations, { 
          id: crypto.randomUUID(), 
          name: newLocName, 
          description: '', 
          imageRefs: [],
          timeOfDay: '',
          weather: '',
          lightingNotes: ''
      }]);
      setNewLocName('');
  };

  const updateLocation = (id: string, field: keyof LocationProfile, value: any) => {
      setLocations(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const deleteLocation = (id: string) => {
      setLocations(prev => prev.filter(l => l.id !== id));
  };

  // Product CRUD
  const addProduct = () => {
      if (!newProdName.trim()) return;
      setProducts([...products, { 
          id: crypto.randomUUID(), 
          name: newProdName, 
          description: '', 
          imageRefs: [],
          category: '',
          materialNotes: ''
      }]);
      setNewProdName('');
  };

  const updateProduct = (id: string, field: keyof ProductProfile, value: any) => {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const deleteProduct = (id: string) => {
      setProducts(prev => prev.filter(p => p.id !== id));
  };

  const updateBeatStatus = (id: string, status: BeatStatus) => {
      setBeats(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const updateBeatVisualSummary = (id: string, visualSummary: string) => {
      setBeats(prev => prev.map(b => b.id === id ? { ...b, visualSummary } : b));
  };

  const startEditingBeat = (beat: Beat) => {
      setEditingBeatId(beat.id);
      setEditingBeatText(beat.visualSummary);
  };

  const saveEditingBeat = () => {
      if (editingBeatId && editingBeatText.trim()) {
          updateBeatVisualSummary(editingBeatId, editingBeatText.trim());
      }
      setEditingBeatId(null);
      setEditingBeatText('');
  };

  // Beat field updater
  const updateBeat = (beatId: string, field: keyof Beat, value: any) => {
      setBeats(prev => prev.map(b => b.id === beatId ? { ...b, [field]: value } : b));
  };

  // Shot management within a beat
  const addShotToBeat = (beatId: string) => {
      const newShot: Shot = {
          id: `shot-${Date.now()}`,
          description: '',
          shotSize: 'MS',
          cameraMove: 'STATIC',
          duration: '3s'
      };
      setBeats(prev => prev.map(b => {
          if (b.id === beatId) {
              return { ...b, shots: [...(b.shots || []), newShot] };
          }
          return b;
      }));
  };

  const updateShot = (beatId: string, shotId: string, field: keyof Shot, value: any) => {
      setBeats(prev => prev.map(b => {
          if (b.id === beatId && b.shots) {
              return {
                  ...b,
                  shots: b.shots.map(s => s.id === shotId ? { ...s, [field]: value } : s)
              };
          }
          return b;
      }));
  };

  const deleteShot = (beatId: string, shotId: string) => {
      setBeats(prev => prev.map(b => {
          if (b.id === beatId && b.shots) {
              return { ...b, shots: b.shots.filter(s => s.id !== shotId) };
          }
          return b;
      }));
  };

  // Batch Beat Generation - Generate beats in PARALLEL batches for speed
  const handleBatchGenerateBeats = async () => {
      const beatsToGenerate = beats.filter((b: Beat) => !b.generatedImageIds?.length && !b.sequenceGrid);

      if (beatsToGenerate.length === 0) {
          showNotification('All beats already have visuals!');
          return;
      }

      const confirmed = confirm(
          `Generate visuals for ${beatsToGenerate.length} beats?\n\nBeats will be processed in parallel batches of 3 for faster generation.`
      );

      if (!confirmed) return;

      setIsBatchGenerating(true);
      setBatchProgress({ current: 0, total: beatsToGenerate.length });

      let successCount = 0;
      let failCount = 0;
      const BATCH_SIZE = 3; // Process 3 at a time for speed without overloading API

      // Process in parallel batches
      for (let i = 0; i < beatsToGenerate.length; i += BATCH_SIZE) {
          const batch = beatsToGenerate.slice(i, i + BATCH_SIZE);

          // Mark all in batch as in_progress
          batch.forEach(beat => updateBeatStatus(beat.id, 'in_progress'));

          // Generate batch in parallel
          const results = await Promise.allSettled(
              batch.map(beat => {
                  return new Promise<void>((resolve, reject) => {
                      try {
                          onGenerateBeat(beat, characters, locations, products);
                          resolve();
                      } catch (error) {
                          reject(error);
                      }
                  });
              })
          );

          // Count successes/failures
          results.forEach(result => {
              if (result.status === 'fulfilled') {
                  successCount++;
              } else {
                  failCount++;
                  console.error('Beat generation failed:', result.reason);
              }
          });

          // Update progress
          setBatchProgress({ current: Math.min(i + BATCH_SIZE, beatsToGenerate.length), total: beatsToGenerate.length });

          // Show progress notification
          showNotification(`⚡ ${successCount}/${beatsToGenerate.length} beats generated...`);
      }

      setIsBatchGenerating(false);
      setBatchProgress(null);

      if (failCount === 0) {
          showNotification(`✅ Generated ${successCount} beats in parallel!`);
      } else {
          showNotification(`⚠️ Queued ${successCount} beats, ${failCount} failed`);
      }
  };

  // AI-generated shot breakdown
  const generateShotBreakdown = async (beatId: string) => {
      const beat = beats.find(b => b.id === beatId);
      if (!beat) return;

      setGeneratingShotsFor(beatId);
      try {
          const prompt = `Break down this visual beat into individual camera shots for a professional production.

BEAT: "${beat.visualSummary}"
SHOT TYPE HINT: ${beat.shotType}
MOOD: ${beat.mood}
CHARACTERS: ${beat.characters?.join(', ') || 'None specified'}
LOCATIONS: ${beat.locations?.join(', ') || 'None specified'}

Output ONLY valid JSON (no markdown, no explanation):
{
  "shots": [
    {
      "description": "Clear visual description of what the camera sees",
      "shotSize": "MS",
      "cameraMove": "STATIC",
      "duration": "3s",
      "notes": "Optional director note"
    }
  ]
}

Shot sizes: ECU (Extreme Close Up), CU (Close Up), MCU (Medium Close Up), MS (Medium Shot), MWS (Medium Wide Shot), WS (Wide Shot), EWS (Extreme Wide Shot)
Camera moves: STATIC, PAN LEFT, PAN RIGHT, TILT UP, TILT DOWN, DOLLY IN, DOLLY OUT, TRACK LEFT, TRACK RIGHT, CRANE UP, CRANE DOWN, HANDHELD

Generate 2-5 shots that tell this beat cinematically.`;

          const response = await consultDirectorChat(prompt, '');

          let parsed;
          try {
              parsed = JSON.parse(response);
          } catch {
              const jsonMatch = response.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                  parsed = JSON.parse(jsonMatch[0]);
              }
          }

          if (parsed?.shots && Array.isArray(parsed.shots)) {
              const newShots: Shot[] = parsed.shots.map((s: any, i: number) => ({
                  id: `shot-${Date.now()}-${i}`,
                  description: s.description || '',
                  shotSize: s.shotSize || 'MS',
                  cameraMove: s.cameraMove || 'STATIC',
                  duration: s.duration || '3s',
                  notes: s.notes || ''
              }));

              updateBeat(beatId, 'shots', newShots);
              showNotification(`✅ Generated ${newShots.length} shots for beat`);
          }
      } catch (error) {
          console.error('Shot breakdown generation failed:', error);
          showNotification('❌ Failed to generate shot breakdown');
      } finally {
          setGeneratingShotsFor(null);
      }
  };

  // Generic image upload handler
  const handleImageUpload = (
      e: React.ChangeEvent<HTMLInputElement>,
      entityId: string,
      entityType: 'character' | 'location' | 'product',
      append: boolean = false
  ) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              if (entityType === 'character') {
                  const char = characters.find(c => c.id === entityId);
                  const newRefs = append && char?.imageRefs ? [...char.imageRefs, result] : [result];
                  updateCharacter(entityId, 'imageRefs', newRefs);
              } else if (entityType === 'location') {
                  const loc = locations.find(l => l.id === entityId);
                  const newRefs = append && loc?.imageRefs ? [...loc.imageRefs, result] : [result];
                  updateLocation(entityId, 'imageRefs', newRefs);
              } else {
                  const prod = products.find(p => p.id === entityId);
                  const newRefs = append && prod?.imageRefs ? [...prod.imageRefs, result] : [result];
                  updateProduct(entityId, 'imageRefs', newRefs);
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  // Ref Coverage category upload handler
  const handleRefCoverageUpload = (
      e: React.ChangeEvent<HTMLInputElement>,
      charId: string,
      category: keyof RefCoverage
  ) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              const char = characters.find(c => c.id === charId);
              if (!char) return;

              const currentCoverage = char.refCoverage || {};
              const currentCategoryRefs = currentCoverage[category] || [];
              const updatedCoverage: RefCoverage = {
                  ...currentCoverage,
                  [category]: [...currentCategoryRefs, result]
              };

              updateCharacter(charId, 'refCoverage', updatedCoverage);

              // Also add to general imageRefs for backwards compatibility
              const newRefs = [...(char.imageRefs || []), result];
              updateCharacter(charId, 'imageRefs', newRefs);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  // Remove ref from coverage category
  const removeRefFromCoverage = (charId: string, category: keyof RefCoverage, refIndex: number) => {
      const char = characters.find(c => c.id === charId);
      if (!char || !char.refCoverage) return;

      const currentCategoryRefs = char.refCoverage[category] || [];
      const refToRemove = currentCategoryRefs[refIndex];
      const updatedCategoryRefs = currentCategoryRefs.filter((_, i) => i !== refIndex);

      const updatedCoverage: RefCoverage = {
          ...char.refCoverage,
          [category]: updatedCategoryRefs
      };

      updateCharacter(charId, 'refCoverage', updatedCoverage);

      // Also remove from general imageRefs
      if (refToRemove && char.imageRefs) {
          const updatedImageRefs = char.imageRefs.filter(r => r !== refToRemove);
          updateCharacter(charId, 'imageRefs', updatedImageRefs);
      }
  };

  // Generate Character Sheet (turnaround)
  const handleGenerateSheet = async (charId: string) => {
      const char = characters.find(c => c.id === charId);
      if (!char) return;

      // Check for available reference
      const hasRef = (char.refCoverage?.face && char.refCoverage.face.length > 0) ||
                     (char.imageRefs && char.imageRefs.length > 0);

      if (!hasRef) {
          showNotification('Upload at least one reference image first');
          return;
      }

      setGeneratingSheetFor(charId);
      try {
          const sheetUrl = await onGenerateCharacterSheet(char);
          if (sheetUrl) {
              updateCharacter(charId, 'characterSheet', sheetUrl);
              showNotification(`✅ Character sheet generated for ${char.name}`);
          }
      } catch (error) {
          console.error('Character sheet generation failed:', error);
          showNotification('❌ Character sheet generation failed');
      } finally {
          setGeneratingSheetFor(null);
      }
  };

  // Generate Expression Bank (6 emotion sprites)
  const handleGenerateExpressions = async (charId: string) => {
      const char = characters.find(c => c.id === charId);
      if (!char) return;

      // Check for available reference
      const hasRef = (char.refCoverage?.face && char.refCoverage.face.length > 0) ||
                     char.characterSheet ||
                     (char.imageRefs && char.imageRefs.length > 0);

      if (!hasRef) {
          showNotification('Upload at least one face reference or generate a character sheet first');
          return;
      }

      setGeneratingExpressionFor(charId);
      try {
          const expressionGrid = await onGenerateExpressionBank(char);
          if (expressionGrid) {
              updateCharacter(charId, 'expressionBank', { grid: expressionGrid });
              showNotification(`✅ Expression bank generated for ${char.name}`);
          }
      } catch (error) {
          console.error('Expression bank generation failed:', error);
          showNotification('❌ Expression bank generation failed');
      } finally {
          setGeneratingExpressionFor(null);
      }
  };

  // Brain Dump Processing
  const processBrainDump = async () => {
      if (!brainDumpText.trim()) return;

      setProcessingBrainDump(true);
      try {
          const { consultDirectorChat } = await import('../services/gemini');

          const prompt = `Analyze this unstructured text and extract narrative beats for a video production.

Output ONLY valid JSON matching this exact schema (no markdown, no explanation, just JSON):
{
  "beats": [
    {
      "visualSummary": "How this should look on screen (visual description for image generation)",
      "shotType": "WIDE or MED or CLOSE or EXTREME CLOSE",
      "duration": "3s",
      "mood": "The emotional tone",
      "characters": [],
      "locations": [],
      "products": []
    }
  ]
}

Rules:
- Extract 3-12 beats depending on content length
- Each beat should be a distinct visual moment
- Duration typically 3-8 seconds per beat
- If the text mentions specific people, places, or products, include those names in the arrays
- shotType should be appropriate for the visual (WIDE for establishing, CLOSE for emotion, MED for action)

Text to analyze:
${brainDumpText}`;

          const response = await consultDirectorChat(prompt, '');

          // Try to parse JSON from response
          let parsed;
          try {
              // Try direct parse first
              parsed = JSON.parse(response);
          } catch {
              // Try to extract JSON from markdown code block
              const jsonMatch = response.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/);
              if (jsonMatch) {
                  parsed = JSON.parse(jsonMatch[1]);
              } else {
                  // Try to find JSON object in response
                  const objectMatch = response.match(/\{[\s\S]*\}/);
                  if (objectMatch) {
                      parsed = JSON.parse(objectMatch[0]);
                  }
              }
          }

          if (parsed?.beats && Array.isArray(parsed.beats)) {
              const newBeats: Beat[] = parsed.beats.map((b: any, i: number) => ({
                  id: `beat-${Date.now()}-${i}`,
                  visualSummary: b.visualSummary || b.description || 'Untitled beat',
                  shotType: b.shotType || 'MED',
                  duration: b.duration || '5s',
                  mood: b.mood || 'neutral',
                  characters: b.characters || [],
                  locations: b.locations || [],
                  products: b.products || [],
                  status: 'scripted' as BeatStatus
              }));

              setBeats(prev => [...prev, ...newBeats]);
              showNotification(`✅ Added ${newBeats.length} beats from brain dump`);
              setShowBrainDumpModal(false);
              setBrainDumpText('');
              setActiveTab('beats'); // Switch to beats tab to see results
          } else {
              throw new Error('Invalid response format');
          }
      } catch (error) {
          console.error('Brain dump processing failed:', error);
          showNotification('❌ Failed to process brain dump. Try adding more detail.');
      } finally {
          setProcessingBrainDump(false);
      }
  };

  const sendToDirector = async () => {
      if (!chatInput.trim()) return;
      const userMsg = { role: 'user' as const, content: chatInput };
      setChatHistory(prev => [...prev, userMsg]);
      setChatInput('');
      setIsChatting(true);

      try {
          const context = `
          SCRIPT SAMPLE: ${scriptContent.slice(0, 1000)}...
          BEATS: ${beats.length} defined
          CHARACTERS: ${characters.map(c => c.name).join(', ')}
          LOCATIONS: ${locations.map(l => l.name).join(', ')}
          PRODUCTS: ${products.map(p => p.name).join(', ')}
          PRODUCTION STYLE: ${productionDesign.visualStyle}
          `;
          const response = await consultDirectorChat(chatInput, context);
          setChatHistory(prev => [...prev, { role: 'model', content: response }]);
      } catch (e) {
          console.error(e);
          setChatHistory(prev => [...prev, { role: 'model', content: "I'm having trouble thinking right now..." }]);
      } finally {
          setIsChatting(false);
      }
  };

  return (
    <>
    <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Sidebar Nav */}
        <div className="w-16 bg-zinc-950 border-r border-white/5 flex flex-col items-center py-4 gap-2 shrink-0">
            <button onClick={() => setActiveTab('script')} className={`p-3 rounded-xl transition-all ${activeTab === 'script' ? 'bg-violet-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title="Script"><FileText className="w-5 h-5" /></button>
            <button onClick={() => setActiveTab('design')} className={`p-3 rounded-xl transition-all ${activeTab === 'design' ? 'bg-violet-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title="Lookbook"><Palette className="w-5 h-5" /></button>
            <button onClick={() => setActiveTab('beats')} className={`p-3 rounded-xl transition-all ${activeTab === 'beats' ? 'bg-violet-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title="Beats"><Film className="w-5 h-5" /></button>
            <div className="h-px w-8 bg-white/10 my-2" />
            <span className="text-[8px] text-zinc-600 font-bold tracking-widest uppercase mb-1">Bible</span>
            <button onClick={() => setActiveTab('characters')} className={`p-3 rounded-xl transition-all ${activeTab === 'characters' ? 'bg-emerald-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title="Characters"><Users className="w-5 h-5" /></button>
            <button onClick={() => setActiveTab('locations')} className={`p-3 rounded-xl transition-all ${activeTab === 'locations' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title="Locations"><MapPin className="w-5 h-5" /></button>
            <button onClick={() => setActiveTab('products')} className={`p-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`} title="Products"><Package className="w-5 h-5" /></button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* SCRIPT TAB */}
            {activeTab === 'script' && (
                <div className="flex-1 flex flex-col p-8 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Script Input</h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowBrainDumpModal(true)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border border-zinc-700"
                            >
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                Brain Dump Import
                            </button>
                            <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !scriptContent.trim()}
                                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg"
                            >
                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4" />}
                                {isAnalyzing ? 'Analyzing...' : 'Analyze Script'}
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={scriptContent}
                        onChange={(e) => setScriptContent(e.target.value)}
                        placeholder="Paste your screenplay, treatment, or scene description here..."
                        className="flex-1 bg-zinc-900 border border-white/5 rounded-2xl p-6 text-sm text-zinc-300 resize-none focus:border-violet-500 outline-none leading-relaxed font-mono"
                    />
                </div>
            )}

            {/* Brain Dump Import Modal */}
            {showBrainDumpModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl">
                        <div className="p-6 border-b border-zinc-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    Brain Dump Import
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowBrainDumpModal(false);
                                        setBrainDumpText('');
                                    }}
                                    className="text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-zinc-500 mt-2">
                                Paste your messy notes, transcript, or unstructured ideas. AI will extract visual beats automatically.
                            </p>
                        </div>

                        <div className="p-6">
                            <textarea
                                value={brainDumpText}
                                onChange={(e) => setBrainDumpText(e.target.value)}
                                placeholder="Paste your messy notes, transcript, or brain dump here...

Example:
- Opens with hero walking through neon-lit city at night
- Meets contact in back alley bar, tense exchange
- Chase sequence through crowded market
- Final confrontation on rooftop at dawn"
                                className="w-full h-64 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 resize-none focus:border-amber-500 outline-none"
                            />
                        </div>

                        <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
                            <p className="text-xs text-zinc-600">
                                Will generate 3-12 beats based on content
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setShowBrainDumpModal(false);
                                        setBrainDumpText('');
                                    }}
                                    className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={processBrainDump}
                                    disabled={processingBrainDump || !brainDumpText.trim()}
                                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                                >
                                    {processingBrainDump ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="w-4 h-4" />
                                            Extract Beats
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCTION DESIGN (LOOKBOOK) TAB */}
            {activeTab === 'design' && (
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-6">Production Design Lookbook</h2>
                    <p className="text-zinc-500 text-sm mb-8">These global styles will be automatically injected into every generation prompt.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">Visual Style</label>
                            <input type="text" value={productionDesign.visualStyle} onChange={(e) => setProductionDesign({...productionDesign, visualStyle: e.target.value})} placeholder="e.g., Cyberpunk Noir, Wes Anderson Pastel..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:border-violet-500 outline-none text-white"/>
                        </div>
                        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">Color Palette</label>
                            <input type="text" value={productionDesign.colorPalette} onChange={(e) => setProductionDesign({...productionDesign, colorPalette: e.target.value})} placeholder="e.g., Teal and Orange, Muted Earth Tones..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:border-violet-500 outline-none text-white"/>
                        </div>
                        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">Camera Language</label>
                            <input type="text" value={productionDesign.cameraLanguage} onChange={(e) => setProductionDesign({...productionDesign, cameraLanguage: e.target.value})} placeholder="e.g., Handheld, Anamorphic 2.39:1..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:border-violet-500 outline-none text-white"/>
                        </div>
                        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-3">Lighting Approach</label>
                            <input type="text" value={productionDesign.lightingApproach} onChange={(e) => setProductionDesign({...productionDesign, lightingApproach: e.target.value})} placeholder="e.g., High Contrast Chiaroscuro, Soft Diffused..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:border-violet-500 outline-none text-white"/>
                        </div>
                    </div>

                    {/* Style Reference Moodboard */}
                    <div className="mt-8 max-w-4xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-violet-400"/> Style Reference Moodboard
                        </h3>
                        <p className="text-zinc-500 text-sm mb-4">Upload reference images that define your visual style. These will be sent with every generation.</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Existing Style Refs */}
                            {productionDesign.styleRefs?.map((ref, idx) => (
                                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
                                    <img src={ref} className="w-full h-full object-cover" alt={`Style ref ${idx + 1}`} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => {
                                                const newRefs = productionDesign.styleRefs?.filter((_, i) => i !== idx) || [];
                                                setProductionDesign({...productionDesign, styleRefs: newRefs});
                                            }}
                                            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Upload Button */}
                            <label className="aspect-square rounded-xl border-2 border-dashed border-zinc-700 hover:border-violet-500 bg-zinc-900/50 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                <Upload className="w-8 h-8 text-zinc-600 group-hover:text-violet-400 transition-colors mb-2" />
                                <span className="text-xs text-zinc-500 group-hover:text-zinc-400">Add Reference</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            Array.from(e.target.files).forEach(file => {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    const result = ev.target?.result as string;
                                                    setProductionDesign(prev => ({
                                                        ...prev,
                                                        styleRefs: [...(prev.styleRefs || []), result]
                                                    }));
                                                };
                                                reader.readAsDataURL(file);
                                            });
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        {productionDesign.styleRefs && productionDesign.styleRefs.length > 0 && (
                            <p className="text-xs text-zinc-500 mt-3">{productionDesign.styleRefs.length} style reference(s) will be included in all generations.</p>
                        )}
                    </div>

                    {/* Lighting Reference Section */}
                    <div className="mt-8 max-w-4xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-amber-400"/> Lighting Reference
                        </h3>
                        <p className="text-zinc-500 text-sm mb-4">Upload a reference image and let AI analyze the lighting setup. This analysis will be included in all generation prompts.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Image Upload */}
                            <div className="space-y-4">
                                {productionDesign.lightingRef ? (
                                    <div className="relative group aspect-video rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
                                        <img src={productionDesign.lightingRef} className="w-full h-full object-cover" alt="Lighting reference" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setProductionDesign({...productionDesign, lightingRef: undefined, lightingAnalysis: undefined})}
                                                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="aspect-video rounded-xl border-2 border-dashed border-zinc-700 hover:border-amber-500 bg-zinc-900/50 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                        <Lightbulb className="w-10 h-10 text-zinc-600 group-hover:text-amber-400 transition-colors mb-2" />
                                        <span className="text-sm text-zinc-500 group-hover:text-zinc-400">Upload Lighting Reference</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const result = ev.target?.result as string;
                                                        setProductionDesign(prev => ({
                                                            ...prev,
                                                            lightingRef: result
                                                        }));
                                                    };
                                                    reader.readAsDataURL(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                )}

                                {productionDesign.lightingRef && !productionDesign.lightingAnalysis && (
                                    <button
                                        onClick={async () => {
                                            if (!productionDesign.lightingRef) return;
                                            setAnalyzingLighting(true);
                                            try {
                                                const { analyzeLightingReference } = await import('../services/gemini');
                                                const analysis = await analyzeLightingReference(productionDesign.lightingRef);
                                                setProductionDesign(prev => ({
                                                    ...prev,
                                                    lightingAnalysis: analysis
                                                }));
                                                showNotification('Lighting analysis complete');
                                            } catch (error) {
                                                showNotification('Failed to analyze lighting');
                                            } finally {
                                                setAnalyzingLighting(false);
                                            }
                                        }}
                                        disabled={analyzingLighting}
                                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        {analyzingLighting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-4 h-4" />
                                                Analyze Lighting
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Analysis Result */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Lighting Analysis</label>
                                <textarea
                                    value={productionDesign.lightingAnalysis || ''}
                                    onChange={(e) => setProductionDesign({...productionDesign, lightingAnalysis: e.target.value})}
                                    placeholder="Upload an image and click 'Analyze Lighting' to generate a lighting recipe, or write your own..."
                                    className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-white resize-none focus:border-amber-500 outline-none"
                                />
                                {productionDesign.lightingAnalysis && (
                                    <p className="text-xs text-amber-400/70">This lighting setup will be included in all generation prompts.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Virtual Camera Rig Section */}
                    <div className="mt-8 max-w-4xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Camera className="w-5 h-5 text-cyan-400"/> Virtual Camera Rig
                        </h3>
                        <p className="text-zinc-500 text-sm mb-4">Configure your virtual camera settings. These will be translated into visual language for all generated images.</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Focal Length */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Focal Length</label>
                                <select
                                    value={productionDesign.cameraRig?.focalLength || '35mm'}
                                    onChange={(e) => setProductionDesign(prev => ({
                                        ...prev,
                                        cameraRig: {
                                            ...prev.cameraRig,
                                            focalLength: e.target.value as FocalLength,
                                            aperture: prev.cameraRig?.aperture || 'f/2.8',
                                            colorTemp: prev.cameraRig?.colorTemp || '5600K'
                                        }
                                    }))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none cursor-pointer"
                                >
                                    <option value="16mm">16mm Wide</option>
                                    <option value="24mm">24mm Wide</option>
                                    <option value="35mm">35mm Standard</option>
                                    <option value="50mm">50mm Standard</option>
                                    <option value="85mm">85mm Portrait</option>
                                    <option value="135mm">135mm Telephoto</option>
                                    <option value="200mm">200mm Telephoto</option>
                                </select>
                                <p className="text-[10px] text-zinc-600">
                                    {productionDesign.cameraRig?.focalLength === '16mm' && 'Dramatic distortion, expansive views'}
                                    {productionDesign.cameraRig?.focalLength === '24mm' && 'Cinematic wide, minimal distortion'}
                                    {(!productionDesign.cameraRig?.focalLength || productionDesign.cameraRig?.focalLength === '35mm') && 'Natural perspective, versatile'}
                                    {productionDesign.cameraRig?.focalLength === '50mm' && 'Classic look, minimal distortion'}
                                    {productionDesign.cameraRig?.focalLength === '85mm' && 'Background compression, flattering'}
                                    {productionDesign.cameraRig?.focalLength === '135mm' && 'Strong compression, intimate feel'}
                                    {productionDesign.cameraRig?.focalLength === '200mm' && 'Maximum compression, voyeuristic'}
                                </p>
                            </div>

                            {/* Aperture */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Aperture (DOF)</label>
                                <select
                                    value={productionDesign.cameraRig?.aperture || 'f/2.8'}
                                    onChange={(e) => setProductionDesign(prev => ({
                                        ...prev,
                                        cameraRig: {
                                            ...prev.cameraRig,
                                            focalLength: prev.cameraRig?.focalLength || '35mm',
                                            aperture: e.target.value as Aperture,
                                            colorTemp: prev.cameraRig?.colorTemp || '5600K'
                                        }
                                    }))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none cursor-pointer"
                                >
                                    <option value="f/1.4">f/1.4 Ultra Shallow</option>
                                    <option value="f/2.8">f/2.8 Shallow</option>
                                    <option value="f/4">f/4 Moderate</option>
                                    <option value="f/8">f/8 Deep</option>
                                    <option value="f/16">f/16 Maximum</option>
                                </select>
                                <p className="text-[10px] text-zinc-600">
                                    {productionDesign.cameraRig?.aperture === 'f/1.4' && 'Razor thin focus, dreamy bokeh'}
                                    {(!productionDesign.cameraRig?.aperture || productionDesign.cameraRig?.aperture === 'f/2.8') && 'Shallow focus, subject separation'}
                                    {productionDesign.cameraRig?.aperture === 'f/4' && 'Moderate depth, balanced'}
                                    {productionDesign.cameraRig?.aperture === 'f/8' && 'Deep focus, sharp background'}
                                    {productionDesign.cameraRig?.aperture === 'f/16' && 'Maximum depth, everything sharp'}
                                </p>
                            </div>

                            {/* Color Temperature */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Color Temperature</label>
                                <select
                                    value={productionDesign.cameraRig?.colorTemp || '5600K'}
                                    onChange={(e) => setProductionDesign(prev => ({
                                        ...prev,
                                        cameraRig: {
                                            ...prev.cameraRig,
                                            focalLength: prev.cameraRig?.focalLength || '35mm',
                                            aperture: prev.cameraRig?.aperture || 'f/2.8',
                                            colorTemp: e.target.value as ColorTemperature
                                        }
                                    }))}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none cursor-pointer"
                                >
                                    <option value="3200K">3200K Warm (Tungsten)</option>
                                    <option value="4500K">4500K Neutral</option>
                                    <option value="5600K">5600K Daylight</option>
                                    <option value="7000K">7000K Cool (Shade)</option>
                                </select>
                                <p className="text-[10px] text-zinc-600">
                                    {productionDesign.cameraRig?.colorTemp === '3200K' && 'Golden, intimate, warm mood'}
                                    {productionDesign.cameraRig?.colorTemp === '4500K' && 'Balanced, natural look'}
                                    {(!productionDesign.cameraRig?.colorTemp || productionDesign.cameraRig?.colorTemp === '5600K') && 'Bright, clean daylight'}
                                    {productionDesign.cameraRig?.colorTemp === '7000K' && 'Blue tint, moody, cool'}
                                </p>
                            </div>
                        </div>

                        {productionDesign.cameraRig && (
                            <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                                <p className="text-xs text-cyan-400">
                                    <span className="font-bold">Active Rig:</span> {productionDesign.cameraRig.focalLength} lens at {productionDesign.cameraRig.aperture}, {productionDesign.cameraRig.colorTemp} color temp
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* BEAT BOARD TAB */}
            {activeTab === 'beats' && (
                <div className="flex-1 flex flex-col p-8 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Beat Board <span className="text-zinc-500 font-normal text-lg ml-2">({beats.length} beats)</span></h2>
                        <div className="flex items-center gap-3">
                            {/* Batch Generate Button */}
                            <button
                                onClick={handleBatchGenerateBeats}
                                disabled={isBatchGenerating || beats.filter((b: Beat) => !b.generatedImageIds?.length && !b.sequenceGrid).length === 0}
                                className="bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                            >
                                {isBatchGenerating ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-3.5 h-3.5"/>
                                        Generate All ({beats.filter((b: Beat) => !b.generatedImageIds?.length && !b.sequenceGrid).length})
                                    </>
                                )}
                            </button>
                            <button onClick={() => onSyncStoryboard(beats)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"><Video className="w-3.5 h-3.5"/> Sync to Storyboard</button>
                        </div>
                    </div>

                    {/* Batch Generation Progress Bar */}
                    {isBatchGenerating && batchProgress && (
                        <div className="mb-4 p-4 bg-violet-900/20 border border-violet-500/30 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-violet-300">
                                    ⚡ Generating {batchProgress.current}/{batchProgress.total} beats in parallel
                                </span>
                                <span className="text-xs text-violet-400">
                                    ~{Math.ceil((batchProgress.total - batchProgress.current) * 5 / 60)} min remaining
                                </span>
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-2">
                                Processing 3 beats at a time for maximum speed. You can continue working while generation runs.
                            </p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 overflow-y-auto pb-20 custom-scrollbar pr-2">
                        {beats.map((beat, idx) => (
                            <div key={beat.id} className={`bg-zinc-900 border rounded-2xl p-5 transition-all group shadow-lg flex flex-col gap-3 ${expandedBeatId === beat.id ? 'border-violet-500 col-span-full' : 'border-white/5 hover:border-violet-500/30'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-zinc-800 text-zinc-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Beat {idx + 1}</span>
                                        {beat.shots && beat.shots.length > 0 && (
                                            <span className="bg-cyan-900/30 text-cyan-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Film className="w-2.5 h-2.5"/>{beat.shots.length} shots
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setExpandedBeatId(expandedBeatId === beat.id ? null : beat.id)}
                                            className="text-[9px] font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-1"
                                        >
                                            {expandedBeatId === beat.id ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                                            {expandedBeatId === beat.id ? 'Collapse' : 'Edit'}
                                        </button>
                                        <button
                                            onClick={() => updateBeatStatus(beat.id, beat.status === 'coverage_complete' ? 'approved' : 'in_progress')}
                                            className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase border flex items-center gap-1 ${
                                                beat.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                                beat.status === 'coverage_complete' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                                                beat.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                                                'bg-zinc-800 text-zinc-500 border-zinc-700'
                                            }`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${beat.status === 'approved' ? 'bg-green-500' : beat.status === 'in_progress' ? 'bg-yellow-500' : 'bg-zinc-500'}`} />
                                            {beat.status?.replace('_', ' ') || 'Scripted'}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Beat Editor */}
                                {expandedBeatId === beat.id ? (
                                    <div className="space-y-4 mt-2">
                                        {/* Full Visual Summary Editor */}
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Visual Summary / Prompt</label>
                                            <textarea
                                                value={beat.visualSummary}
                                                onChange={(e) => updateBeat(beat.id, 'visualSummary', e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white resize-none focus:border-violet-500 focus:outline-none min-h-[100px]"
                                                placeholder="Describe the visual action in detail..."
                                            />
                                        </div>

                                        {/* Beat Metadata Row */}
                                        <div className="grid grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Shot Type</label>
                                                <select
                                                    value={beat.shotType}
                                                    onChange={(e) => updateBeat(beat.id, 'shotType', e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                                                >
                                                    <option value="WIDE">WIDE</option>
                                                    <option value="MED">MEDIUM</option>
                                                    <option value="CLOSE">CLOSE</option>
                                                    <option value="EXTREME CLOSE">EXTREME CLOSE</option>
                                                    <option value="AERIAL">AERIAL</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Duration</label>
                                                <input
                                                    type="text"
                                                    value={beat.duration}
                                                    onChange={(e) => updateBeat(beat.id, 'duration', e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                                                    placeholder="5s"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Mood</label>
                                                <input
                                                    type="text"
                                                    value={beat.mood}
                                                    onChange={(e) => updateBeat(beat.id, 'mood', e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                                                    placeholder="tense, hopeful..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Characters</label>
                                                <input
                                                    type="text"
                                                    value={beat.characters?.join(', ') || ''}
                                                    onChange={(e) => updateBeat(beat.id, 'characters', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                                                    placeholder="John, Sarah"
                                                />
                                            </div>
                                        </div>

                                        {/* Shot List Breakdown */}
                                        <div className="border-t border-zinc-800 pt-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                                                    <Film className="w-3.5 h-3.5"/>
                                                    Shot List Breakdown
                                                </h4>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => generateShotBreakdown(beat.id)}
                                                        disabled={generatingShotsFor === beat.id}
                                                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                                                    >
                                                        {generatingShotsFor === beat.id ? (
                                                            <><Loader2 className="w-3 h-3 animate-spin"/> Generating...</>
                                                        ) : (
                                                            <><Wand2 className="w-3 h-3"/> AI Generate Shots</>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => addShotToBeat(beat.id)}
                                                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3"/> Add Shot
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Shot List */}
                                            {beat.shots && beat.shots.length > 0 ? (
                                                <div className="space-y-2">
                                                    {beat.shots.map((shot, shotIdx) => (
                                                        <div key={shot.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 group/shot">
                                                            <div className="flex items-start gap-3">
                                                                <div className="bg-cyan-900/30 text-cyan-400 text-[10px] font-bold w-6 h-6 rounded flex items-center justify-center shrink-0">
                                                                    {shotIdx + 1}
                                                                </div>
                                                                <div className="flex-1 space-y-2">
                                                                    <textarea
                                                                        value={shot.description}
                                                                        onChange={(e) => updateShot(beat.id, shot.id, 'description', e.target.value)}
                                                                        placeholder="Describe what the camera sees..."
                                                                        className="w-full bg-transparent border-none text-sm text-white resize-none focus:outline-none min-h-[40px]"
                                                                    />
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <select
                                                                            value={shot.shotSize}
                                                                            onChange={(e) => updateShot(beat.id, shot.id, 'shotSize', e.target.value)}
                                                                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none"
                                                                        >
                                                                            <option value="EWS">EWS</option>
                                                                            <option value="WS">WS</option>
                                                                            <option value="MWS">MWS</option>
                                                                            <option value="MS">MS</option>
                                                                            <option value="MCU">MCU</option>
                                                                            <option value="CU">CU</option>
                                                                            <option value="ECU">ECU</option>
                                                                        </select>
                                                                        <select
                                                                            value={shot.cameraMove || 'STATIC'}
                                                                            onChange={(e) => updateShot(beat.id, shot.id, 'cameraMove', e.target.value)}
                                                                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 focus:outline-none"
                                                                        >
                                                                            <option value="STATIC">STATIC</option>
                                                                            <option value="PAN LEFT">PAN LEFT</option>
                                                                            <option value="PAN RIGHT">PAN RIGHT</option>
                                                                            <option value="TILT UP">TILT UP</option>
                                                                            <option value="TILT DOWN">TILT DOWN</option>
                                                                            <option value="DOLLY IN">DOLLY IN</option>
                                                                            <option value="DOLLY OUT">DOLLY OUT</option>
                                                                            <option value="TRACK LEFT">TRACK LEFT</option>
                                                                            <option value="TRACK RIGHT">TRACK RIGHT</option>
                                                                            <option value="CRANE UP">CRANE UP</option>
                                                                            <option value="CRANE DOWN">CRANE DOWN</option>
                                                                            <option value="HANDHELD">HANDHELD</option>
                                                                        </select>
                                                                        <input
                                                                            type="text"
                                                                            value={shot.duration || ''}
                                                                            onChange={(e) => updateShot(beat.id, shot.id, 'duration', e.target.value)}
                                                                            placeholder="3s"
                                                                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 w-12 focus:outline-none"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={shot.notes || ''}
                                                                            onChange={(e) => updateShot(beat.id, shot.id, 'notes', e.target.value)}
                                                                            placeholder="Director notes..."
                                                                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-400 italic focus:outline-none min-w-[100px]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => deleteShot(beat.id, shot.id)}
                                                                    className="text-zinc-600 hover:text-red-400 opacity-0 group-hover/shot:opacity-100 transition-all p-1"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5"/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-zinc-600 text-sm">
                                                    <Film className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                                                    No shots defined yet. Use "AI Generate Shots" or add manually.
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons in Expanded Mode */}
                                        <div className="flex gap-2 pt-2 border-t border-zinc-800">
                                            <button
                                                onClick={() => {
                                                    updateBeatStatus(beat.id, 'in_progress');
                                                    onGenerateBeat(beat, characters, locations, products);
                                                }}
                                                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" /> Visualize Beat
                                            </button>
                                            <button
                                                onClick={() => setExploringBeat(beat)}
                                                className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg"
                                                title="Generate 3 creative variations to compare"
                                            >
                                                <Layers className="w-3.5 h-3.5" /> Explore Options
                                            </button>
                                            <button
                                                onClick={() => {
                                                    updateBeatStatus(beat.id, 'in_progress');
                                                    onGenerateSequence(beat, characters, locations, products);
                                                }}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg"
                                            >
                                                <Grid className="w-3.5 h-3.5" /> Sequence
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this beat?')) {
                                                        setBeats(prev => prev.filter(b => b.id !== beat.id));
                                                        setExpandedBeatId(null);
                                                    }
                                                }}
                                                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Compact View - Editable Visual Summary */}
                                        {editingBeatId === beat.id ? (
                                            <div className="relative">
                                                <textarea
                                                    value={editingBeatText}
                                                    onChange={(e) => setEditingBeatText(e.target.value)}
                                                    onBlur={saveEditingBeat}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') {
                                                            setEditingBeatId(null);
                                                            setEditingBeatText('');
                                                        }
                                                        if (e.key === 'Enter' && e.metaKey) {
                                                            saveEditingBeat();
                                                        }
                                                    }}
                                                    autoFocus
                                                    className="w-full bg-zinc-950 border border-violet-500 rounded-lg p-2 text-sm text-white resize-none focus:outline-none min-h-[80px]"
                                                    placeholder="Describe the visual action..."
                                                />
                                                <span className="absolute bottom-1 right-2 text-[9px] text-zinc-600">⌘+Enter to save, Esc to cancel</span>
                                            </div>
                                        ) : (
                                            <div
                                                className="group/summary relative cursor-pointer"
                                                onClick={() => startEditingBeat(beat)}
                                                title="Click to quick edit"
                                            >
                                                <p className="text-sm font-medium text-white line-clamp-3 group-hover/summary:line-clamp-none group-hover/summary:bg-zinc-800/50 group-hover/summary:p-2 group-hover/summary:-m-2 group-hover/summary:rounded-lg transition-all">
                                                    {beat.visualSummary}
                                                </p>
                                                <div className="absolute top-0 right-0 opacity-0 group-hover/summary:opacity-100 transition-opacity">
                                                    <span className="text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">quick edit</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Entity Links */}
                                        <div className="flex flex-wrap gap-1">
                                            {beat.characters?.map(c => (
                                                <span key={c} className="text-[9px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1"><Users className="w-2.5 h-2.5"/>{c}</span>
                                            ))}
                                            {beat.locations?.map(l => (
                                                <span key={l} className="text-[9px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1"><MapPin className="w-2.5 h-2.5"/>{l}</span>
                                            ))}
                                            {beat.products?.map(p => (
                                                <span key={p} className="text-[9px] bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-1"><Package className="w-2.5 h-2.5"/>{p}</span>
                                            ))}
                                        </div>

                                        {/* Sequence Grid Thumbnail */}
                                        {beat.sequenceGrid && (
                                            <div
                                                className="relative cursor-pointer group/seq"
                                                onClick={() => setExpandedSequenceId(beat.id)}
                                            >
                                                <img
                                                    src={beat.sequenceGrid}
                                                    alt="Sequence grid"
                                                    className="w-full h-24 object-cover rounded-lg border border-white/10"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/seq:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                    <span className="text-[10px] text-white font-medium">Click to expand</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-auto pt-3 border-t border-white/5 space-y-2">
                                            <div className="flex gap-2 text-[10px] text-zinc-500">
                                                <span className="bg-black/30 px-1.5 py-0.5 rounded">{beat.shotType}</span>
                                                <span className="bg-black/30 px-1.5 py-0.5 rounded">{beat.mood}</span>
                                                <span className="bg-black/30 px-1.5 py-0.5 rounded">{beat.duration}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        updateBeatStatus(beat.id, 'in_progress');
                                                        onGenerateBeat(beat, characters, locations, products);
                                                    }}
                                                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg"
                                                >
                                                    <Sparkles className="w-3 h-3" /> Visualize
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        updateBeatStatus(beat.id, 'in_progress');
                                                        onGenerateSequence(beat, characters, locations, products);
                                                    }}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg"
                                                >
                                                    <Grid className="w-3 h-3" /> Sequence
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Expanded Sequence Modal */}
                    {expandedSequenceId && (
                        <div
                            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
                            onClick={() => setExpandedSequenceId(null)}
                        >
                            <div className="relative max-w-4xl w-full">
                                <button
                                    onClick={() => setExpandedSequenceId(null)}
                                    className="absolute -top-12 right-0 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                <img
                                    src={beats.find(b => b.id === expandedSequenceId)?.sequenceGrid}
                                    alt="Expanded sequence"
                                    className="w-full rounded-xl shadow-2xl"
                                />
                                <p className="text-center text-zinc-500 text-sm mt-4">
                                    Beat {beats.findIndex(b => b.id === expandedSequenceId) + 1} — 2x2 Sequence Grid
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CHARACTER BIBLE TAB */}
            {activeTab === 'characters' && (
                <div className="flex-1 flex flex-col p-8 overflow-hidden">
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-6 flex items-center gap-3 shrink-0">
                        <Users className="w-6 h-6 text-emerald-400"/>
                        Character Bible
                    </h2>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20 custom-scrollbar pr-2 content-start">
                        {/* Add Card */}
                        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 min-h-[300px]">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center"><Users className="w-8 h-8 text-zinc-600" /></div>
                            <div className="flex w-full gap-2">
                                <input 
                                    type="text" 
                                    list="character-suggestions"
                                    value={newCharName} 
                                    onChange={(e) => setNewCharName(e.target.value)} 
                                    placeholder="Character Name" 
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none text-white"
                                />
                                <datalist id="character-suggestions">
                                    {allCharacterNames.filter(n => !characters.find(c => c.name === n)).map(n => (
                                        <option key={n} value={n} />
                                    ))}
                                </datalist>
                                <button onClick={addCharacter} className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg"><Plus className="w-5 h-5"/></button>
                            </div>
                        </div>

                        {characters.map(char => {
                            const hasRef = char.imageRefs && char.imageRefs.length > 0;
                            const isLocked = char.isLocked || false;
                            const coverage = char.coverageAnalysis;
                            const isAnalyzing = analyzingCoverageFor === char.id;
                            const isGeneratingAvatar = generatingAvatarFor === char.id;
                            
                            return (
                                <div key={char.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden group transition-all relative ${isLocked ? 'border-amber-500/50 shadow-amber-900/20 shadow-lg' : hasRef ? 'border-emerald-500/30 shadow-emerald-900/10 shadow-lg' : 'border-white/5'}`}>
                                    {/* Lock Badge */}
                                    {isLocked && (
                                        <div className="absolute top-3 left-3 z-20 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                            <Lock className="w-3 h-3"/> MASTER
                                        </div>
                                    )}
                                    
                                    <div className="h-40 bg-zinc-950 relative">
                                        {hasRef ? (
                                            <div className="w-full h-full flex">
                                                {char.imageRefs!.slice(0, 3).map((ref, i) => (
                                                    <img key={i} src={ref} className={`h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity ${char.imageRefs!.length === 1 ? 'w-full' : char.imageRefs!.length === 2 ? 'w-1/2' : 'w-1/3'}`} alt={char.name} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-700"><ImageIcon className="w-10 h-10"/></div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                                        <div className="absolute top-3 right-3 flex gap-2">
                                            {hasRef && char.imageRefs!.length > 0 && (
                                                <div className="bg-black/60 backdrop-blur-md text-zinc-400 px-2 py-1 rounded-lg text-[10px] font-medium">
                                                    {char.imageRefs!.length} refs
                                                </div>
                                            )}
                                            <button className="bg-black/60 hover:bg-emerald-600 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors" onClick={() => document.getElementById(`upload-char-${char.id}`)?.click()}><Upload className="w-3 h-3" /></button>
                                            <button 
                                                onClick={() => deleteCharacter(char.id)} 
                                                className={`bg-black/60 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
                                                title={isLocked ? "Unlock to delete" : "Delete character"}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <h3 className="absolute bottom-3 left-4 font-bold text-lg text-white">{char.name}</h3>
                                        <input type="file" id={`upload-char-${char.id}`} className="hidden" accept="image/*" multiple onChange={(e) => handleImageUpload(e, char.id, 'character', true)} />
                                    </div>
                                    
                                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {/* Visual Description */}
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Visual Description</label>
                                            <textarea value={char.description} onChange={(e) => updateCharacter(char.id, 'description', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:border-emerald-500 outline-none resize-none h-14 mt-1"/>
                                        </div>
                                        
                                        {/* AI Prompt Snippet */}
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Prompt Snippet</label>
                                            <input type="text" value={char.promptSnippet || ''} onChange={(e) => updateCharacter(char.id, 'promptSnippet', e.target.value)} placeholder="Short, optimized prompt text..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-emerald-300 focus:border-emerald-500 outline-none mt-1"/>
                                        </div>
                                        
                                        {/* Consistency Anchors */}
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Lock className="w-3 h-3"/> Consistency Anchors</label>
                                            <input type="text" value={char.consistencyAnchors || ''} onChange={(e) => updateCharacter(char.id, 'consistencyAnchors', e.target.value)} placeholder="e.g. Scar on left cheek, Red scarf" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:border-emerald-500 outline-none mt-1"/>
                                        </div>
                                        
                                        {/* Action Buttons Row */}
                                        <div className="flex gap-2 pt-2">
                                            {/* Auto-Visualize Button */}
                                            <button 
                                                onClick={() => handleAutoVisualize(char.id)}
                                                disabled={isGeneratingAvatar || !char.description}
                                                className="flex-1 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                            >
                                                {isGeneratingAvatar ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
                                                {isGeneratingAvatar ? 'Creating...' : 'Auto-Visualize'}
                                            </button>
                                            
                                            {/* Analyze Coverage Button */}
                                            <button 
                                                onClick={() => handleAnalyzeCoverage(char.id)}
                                                disabled={isAnalyzing || !hasRef}
                                                className="flex-1 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                            >
                                                {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Search className="w-3 h-3"/>}
                                                {isAnalyzing ? 'Analyzing...' : 'Analyze Coverage'}
                                            </button>
                                        </div>
                                        
                                        {/* Coverage Analysis Results */}
                                        {coverage && (
                                            <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-950/50 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Reference Coverage</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                        coverage.confidence === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        coverage.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {coverage.confidence.toUpperCase()}
                                                    </span>
                                                </div>
                                                
                                                {/* Existing Views */}
                                                {coverage.existingViews.length > 0 && (
                                                    <div>
                                                        <span className="text-[9px] text-emerald-400/80 font-medium">✓ Covered:</span>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {coverage.existingViews.map((view, i) => (
                                                                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 rounded">{view}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Missing Views - Clickable to Generate */}
                                                {coverage.missingViews.length > 0 && (
                                                    <div>
                                                        <span className="text-[9px] text-amber-400/80 font-medium">⚠ Missing (click to generate):</span>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {coverage.missingViews.map((view, i) => {
                                                                const isGenerating = generatingRefFor?.charId === char.id && generatingRefFor?.view === view;
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => handleGenerateMissingView(char.id, view)}
                                                                        disabled={isGenerating || !!generatingRefFor}
                                                                        className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300 rounded hover:bg-amber-500/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                                    >
                                                                        {isGenerating ? <Loader2 className="w-2 h-2 animate-spin"/> : <Plus className="w-2 h-2"/>}
                                                                        {view}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Recommendation */}
                                                <p className="text-[9px] text-zinc-500 italic mt-1">{coverage.recommendation}</p>
                                            </div>
                                        )}
                                        
                                        {/* Reference Coverage Categories */}
                                        <div className="border border-zinc-800 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setExpandedRefCoverage(expandedRefCoverage === char.id ? null : char.id)}
                                                className="w-full flex items-center justify-between p-2 bg-zinc-950/50 hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                                                    <Camera className="w-3 h-3"/> Reference Categories
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {char.refCoverage && (
                                                        <span className="text-[9px] text-emerald-400">
                                                            {Object.values(char.refCoverage).flat().filter(Boolean).length} categorized
                                                        </span>
                                                    )}
                                                    {expandedRefCoverage === char.id ? <ChevronUp className="w-3 h-3 text-zinc-500"/> : <ChevronDown className="w-3 h-3 text-zinc-500"/>}
                                                </div>
                                            </button>

                                            {expandedRefCoverage === char.id && (
                                                <div className="p-3 space-y-3 bg-zinc-950/30">
                                                    {/* Face References */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                                                <User className="w-3 h-3"/> Face (Close-ups)
                                                            </label>
                                                            <label className="p-1 bg-zinc-800 hover:bg-emerald-600 rounded cursor-pointer transition-colors">
                                                                <Plus className="w-3 h-3 text-zinc-400 hover:text-white"/>
                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleRefCoverageUpload(e, char.id, 'face')} />
                                                            </label>
                                                        </div>
                                                        <div className="flex gap-1 flex-wrap">
                                                            {char.refCoverage?.face?.map((ref, i) => (
                                                                <div key={i} className="relative group/ref w-10 h-10 rounded overflow-hidden border border-zinc-700">
                                                                    <img src={ref} className="w-full h-full object-cover" alt={`Face ${i+1}`}/>
                                                                    <button
                                                                        onClick={() => removeRefFromCoverage(char.id, 'face', i)}
                                                                        className="absolute inset-0 bg-red-600/80 opacity-0 group-hover/ref:opacity-100 transition-opacity flex items-center justify-center"
                                                                    >
                                                                        <X className="w-3 h-3 text-white"/>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {(!char.refCoverage?.face || char.refCoverage.face.length === 0) && (
                                                                <span className="text-[9px] text-zinc-600 italic">No face refs</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Full Body References */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                                                <Users className="w-3 h-3"/> Full Body (Wide)
                                                            </label>
                                                            <label className="p-1 bg-zinc-800 hover:bg-emerald-600 rounded cursor-pointer transition-colors">
                                                                <Plus className="w-3 h-3 text-zinc-400 hover:text-white"/>
                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleRefCoverageUpload(e, char.id, 'fullBody')} />
                                                            </label>
                                                        </div>
                                                        <div className="flex gap-1 flex-wrap">
                                                            {char.refCoverage?.fullBody?.map((ref, i) => (
                                                                <div key={i} className="relative group/ref w-10 h-10 rounded overflow-hidden border border-zinc-700">
                                                                    <img src={ref} className="w-full h-full object-cover" alt={`Full body ${i+1}`}/>
                                                                    <button
                                                                        onClick={() => removeRefFromCoverage(char.id, 'fullBody', i)}
                                                                        className="absolute inset-0 bg-red-600/80 opacity-0 group-hover/ref:opacity-100 transition-opacity flex items-center justify-center"
                                                                    >
                                                                        <X className="w-3 h-3 text-white"/>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {(!char.refCoverage?.fullBody || char.refCoverage.fullBody.length === 0) && (
                                                                <span className="text-[9px] text-zinc-600 italic">No full body refs</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 3/4 Angle References */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                                                <Camera className="w-3 h-3"/> 3/4 Angle (Medium)
                                                            </label>
                                                            <label className="p-1 bg-zinc-800 hover:bg-emerald-600 rounded cursor-pointer transition-colors">
                                                                <Plus className="w-3 h-3 text-zinc-400 hover:text-white"/>
                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleRefCoverageUpload(e, char.id, 'threeQuarter')} />
                                                            </label>
                                                        </div>
                                                        <div className="flex gap-1 flex-wrap">
                                                            {char.refCoverage?.threeQuarter?.map((ref, i) => (
                                                                <div key={i} className="relative group/ref w-10 h-10 rounded overflow-hidden border border-zinc-700">
                                                                    <img src={ref} className="w-full h-full object-cover" alt={`3/4 angle ${i+1}`}/>
                                                                    <button
                                                                        onClick={() => removeRefFromCoverage(char.id, 'threeQuarter', i)}
                                                                        className="absolute inset-0 bg-red-600/80 opacity-0 group-hover/ref:opacity-100 transition-opacity flex items-center justify-center"
                                                                    >
                                                                        <X className="w-3 h-3 text-white"/>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {(!char.refCoverage?.threeQuarter || char.refCoverage.threeQuarter.length === 0) && (
                                                                <span className="text-[9px] text-zinc-600 italic">No 3/4 refs</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action References */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-[9px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                                                                <Move className="w-3 h-3"/> Action (Dynamic)
                                                            </label>
                                                            <label className="p-1 bg-zinc-800 hover:bg-emerald-600 rounded cursor-pointer transition-colors">
                                                                <Plus className="w-3 h-3 text-zinc-400 hover:text-white"/>
                                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleRefCoverageUpload(e, char.id, 'action')} />
                                                            </label>
                                                        </div>
                                                        <div className="flex gap-1 flex-wrap">
                                                            {char.refCoverage?.action?.map((ref, i) => (
                                                                <div key={i} className="relative group/ref w-10 h-10 rounded overflow-hidden border border-zinc-700">
                                                                    <img src={ref} className="w-full h-full object-cover" alt={`Action ${i+1}`}/>
                                                                    <button
                                                                        onClick={() => removeRefFromCoverage(char.id, 'action', i)}
                                                                        className="absolute inset-0 bg-red-600/80 opacity-0 group-hover/ref:opacity-100 transition-opacity flex items-center justify-center"
                                                                    >
                                                                        <X className="w-3 h-3 text-white"/>
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {(!char.refCoverage?.action || char.refCoverage.action.length === 0) && (
                                                                <span className="text-[9px] text-zinc-600 italic">No action refs</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-[8px] text-zinc-600 mt-2 pt-2 border-t border-zinc-800">
                                                        Categorized refs are automatically selected based on shot type during generation.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Character Sheet (Turnaround) */}
                                        <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-950/30">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                                                    <Grid className="w-3 h-3"/> Character Sheet
                                                </label>
                                                {char.characterSheet && (
                                                    <button
                                                        onClick={() => updateCharacter(char.id, 'characterSheet', undefined)}
                                                        className="text-[9px] text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>

                                            {char.characterSheet ? (
                                                <div className="space-y-2">
                                                    <div
                                                        className="relative cursor-pointer group/sheet"
                                                        onClick={() => setExpandedSheetId(expandedSheetId === char.id ? null : char.id)}
                                                    >
                                                        <img
                                                            src={char.characterSheet}
                                                            alt="Character turnaround sheet"
                                                            className="w-full rounded-lg border border-zinc-700"
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/sheet:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                            <span className="text-[10px] text-white font-medium">Click to expand</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleGenerateSheet(char.id)}
                                                        disabled={generatingSheetFor === char.id}
                                                        className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg text-[10px] font-medium transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        {generatingSheetFor === char.id ? (
                                                            <><Loader2 className="w-3 h-3 animate-spin"/> Regenerating...</>
                                                        ) : (
                                                            <><RefreshCw className="w-3 h-3"/> Regenerate</>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleGenerateSheet(char.id)}
                                                    disabled={generatingSheetFor === char.id || !hasRef}
                                                    className="w-full py-2 bg-violet-600/20 text-violet-300 border border-violet-500/30 hover:bg-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    {generatingSheetFor === char.id ? (
                                                        <><Loader2 className="w-3 h-3 animate-spin"/> Generating...</>
                                                    ) : (
                                                        <><Grid className="w-3 h-3"/> Generate Turnaround Sheet</>
                                                    )}
                                                </button>
                                            )}
                                            <p className="text-[8px] text-zinc-600 mt-2">
                                                Creates a 2x2 grid with front, 3/4 left, 3/4 right, and back views.
                                            </p>
                                        </div>

                                        {/* Expression Bank Section */}
                                        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700/50">
                                            <h4 className="text-[10px] font-bold text-teal-400 mb-2 flex items-center gap-1.5">
                                                <Sparkles className="w-3 h-3"/>
                                                Expression Bank
                                            </h4>
                                            {char.expressionBank?.grid ? (
                                                <div className="space-y-2">
                                                    <div
                                                        className="relative cursor-pointer group/expression"
                                                        onClick={() => setExpandedExpressionId(expandedExpressionId === char.id ? null : char.id)}
                                                    >
                                                        <img
                                                            src={char.expressionBank.grid}
                                                            alt="Expression bank grid"
                                                            className="w-full rounded-lg border border-zinc-700"
                                                            style={{ maxHeight: '150px', objectFit: 'cover' }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/expression:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                            <span className="text-[10px] text-white font-medium">Click to expand</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleGenerateExpressions(char.id)}
                                                            disabled={generatingExpressionFor === char.id}
                                                            className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg text-[10px] font-medium transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            {generatingExpressionFor === char.id ? (
                                                                <><Loader2 className="w-3 h-3 animate-spin"/> Regenerating...</>
                                                            ) : (
                                                                <><RefreshCw className="w-3 h-3"/> Regenerate</>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => updateCharacter(char.id, 'expressionBank', undefined)}
                                                            className="py-1.5 px-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-[10px] font-medium transition-colors"
                                                        >
                                                            <Trash2 className="w-3 h-3"/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleGenerateExpressions(char.id)}
                                                    disabled={generatingExpressionFor === char.id || !hasRef}
                                                    className="w-full py-2 bg-teal-600/20 text-teal-300 border border-teal-500/30 hover:bg-teal-600/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                    {generatingExpressionFor === char.id ? (
                                                        <><Loader2 className="w-3 h-3 animate-spin"/> Generating...</>
                                                    ) : (
                                                        <><Sparkles className="w-3 h-3"/> Generate Expressions</>
                                                    )}
                                                </button>
                                            )}
                                            <p className="text-[8px] text-zinc-600 mt-2">
                                                Creates a 3x2 grid: Joy, Anger, Sorrow, Surprise, Fear, Neutral.
                                            </p>
                                        </div>

                                        {/* Lock Toggle */}
                                        <label className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                            isLocked ? 'bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15' : 'bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-800/70'
                                        }`}>
                                            <input
                                                type="checkbox"
                                                checked={isLocked}
                                                onChange={(e) => updateCharacter(char.id, 'isLocked', e.target.checked)}
                                                className="hidden"
                                            />
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isLocked ? 'bg-amber-500 border-amber-500' : 'border-zinc-600 bg-zinc-800'}`}>
                                                {isLocked && <CheckCircle2 className="w-3 h-3 text-black"/>}
                                            </div>
                                            <div className="flex-1">
                                                <span className={`text-[10px] font-bold ${isLocked ? 'text-amber-400' : 'text-zinc-400'}`}>
                                                    {isLocked ? '🔒 Locked Master Character' : 'Lock as Master Character'}
                                                </span>
                                                <span className="text-[8px] text-zinc-600 block">
                                                    {isLocked ? 'Protected from deletion' : 'Preserve across project'}
                                                </span>
                                            </div>
                                            {isLocked ? <Lock className="w-3 h-3 text-amber-500"/> : <Unlock className="w-3 h-3 text-zinc-600"/>}
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Expanded Character Sheet Modal */}
                    {expandedSheetId && (
                        <div
                            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
                            onClick={() => setExpandedSheetId(null)}
                        >
                            <div className="relative max-w-3xl w-full">
                                <button
                                    onClick={() => setExpandedSheetId(null)}
                                    className="absolute -top-12 right-0 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                {(() => {
                                    const char = characters.find(c => c.id === expandedSheetId);
                                    return char?.characterSheet ? (
                                        <>
                                            <img
                                                src={char.characterSheet}
                                                alt="Character turnaround sheet"
                                                className="w-full rounded-xl shadow-2xl"
                                            />
                                            <p className="text-center text-zinc-500 text-sm mt-4">
                                                {char.name} — Character Turnaround Sheet
                                            </p>
                                        </>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Expanded Expression Bank Modal */}
                    {expandedExpressionId && (
                        <div
                            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
                            onClick={() => setExpandedExpressionId(null)}
                        >
                            <div className="relative max-w-4xl w-full">
                                <button
                                    onClick={() => setExpandedExpressionId(null)}
                                    className="absolute -top-12 right-0 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                                {(() => {
                                    const char = characters.find(c => c.id === expandedExpressionId);
                                    return char?.expressionBank?.grid ? (
                                        <>
                                            <img
                                                src={char.expressionBank.grid}
                                                alt="Expression bank grid"
                                                className="w-full rounded-xl shadow-2xl"
                                            />
                                            <p className="text-center text-zinc-500 text-sm mt-4">
                                                {char.name} — Expression Bank (Joy, Anger, Sorrow, Surprise, Fear, Neutral)
                                            </p>
                                        </>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* LOCATION BIBLE TAB */}
            {activeTab === 'locations' && (
                <div className="flex-1 flex flex-col p-8 overflow-hidden">
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-6 flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-blue-400"/>
                        Location Bible
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20 custom-scrollbar pr-2">
                        {/* Add Card */}
                        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 min-h-[300px]">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center"><MapPin className="w-8 h-8 text-zinc-600" /></div>
                            <div className="flex w-full gap-2">
                                <input 
                                    type="text" 
                                    list="location-suggestions"
                                    value={newLocName} 
                                    onChange={(e) => setNewLocName(e.target.value)} 
                                    placeholder="Location Name" 
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-white"
                                />
                                <datalist id="location-suggestions">
                                    {allLocationNames.filter(n => !locations.find(l => l.name === n)).map(n => (
                                        <option key={n} value={n} />
                                    ))}
                                </datalist>
                                <button onClick={addLocation} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"><Plus className="w-5 h-5"/></button>
                            </div>
                        </div>

                        {locations.map(loc => {
                            const hasRef = loc.imageRefs && loc.imageRefs.length > 0;
                            return (
                                <div key={loc.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden group transition-all relative ${hasRef ? 'border-blue-500/30 shadow-blue-900/10 shadow-lg' : 'border-white/5'}`}>
                                    <div className="h-40 bg-zinc-950 relative">
                                        {hasRef ? (
                                            <img src={loc.imageRefs![0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={loc.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-700"><Building2 className="w-10 h-10"/></div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                                        <div className="absolute top-3 right-3 flex gap-2">
                                            {hasRef && <div className="bg-black/60 backdrop-blur-md text-blue-400 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-blue-500/30"><Lock className="w-3 h-3"/> Locked</div>}
                                            <button className="bg-black/60 hover:bg-blue-600 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors" onClick={() => document.getElementById(`upload-loc-${loc.id}`)?.click()}><Upload className="w-3 h-3" /></button>
                                            <button onClick={() => deleteLocation(loc.id)} className="bg-black/60 hover:bg-red-600 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <h3 className="absolute bottom-3 left-4 font-bold text-lg text-white">{loc.name}</h3>
                                        <input type="file" id={`upload-loc-${loc.id}`} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, loc.id, 'location', true)} />
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Description</label>
                                            <textarea value={loc.description} onChange={(e) => updateLocation(loc.id, 'description', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:border-blue-500 outline-none resize-none h-16 mt-1" placeholder="Detailed visual description of the environment..."/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Sun className="w-3 h-3"/> Time of Day</label>
                                                <input type="text" value={loc.timeOfDay || ''} onChange={(e) => updateLocation(loc.id, 'timeOfDay', e.target.value)} placeholder="Golden Hour..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:border-blue-500 outline-none mt-1"/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Cloud className="w-3 h-3"/> Weather</label>
                                                <input type="text" value={loc.weather || ''} onChange={(e) => updateLocation(loc.id, 'weather', e.target.value)} placeholder="Rainy, Fog..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:border-blue-500 outline-none mt-1"/>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Prompt Snippet</label>
                                            <input type="text" value={loc.promptSnippet || ''} onChange={(e) => updateLocation(loc.id, 'promptSnippet', e.target.value)} placeholder="Optimized environment prompt..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-blue-300 focus:border-blue-500 outline-none mt-1"/>
                                        </div>

                                        {/* Master Plate Upload */}
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1 mb-2">
                                                <ImageIcon className="w-3 h-3"/> Master Plate
                                            </label>
                                            {loc.anchorImage ? (
                                                <div className="relative group/plate">
                                                    <img
                                                        src={loc.anchorImage}
                                                        alt="Master plate"
                                                        className="w-full h-20 object-cover rounded-lg border border-blue-500/30"
                                                    />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/plate:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => updateLocation(loc.id, 'anchorImage', undefined)}
                                                            className="p-1.5 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="absolute bottom-1 left-1 bg-blue-600/90 text-[8px] text-white px-1.5 py-0.5 rounded font-bold">
                                                        ANCHOR
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="h-20 rounded-lg border-2 border-dashed border-zinc-700 hover:border-blue-500 bg-zinc-950 flex flex-col items-center justify-center cursor-pointer transition-colors group/upload">
                                                    <Upload className="w-4 h-4 text-zinc-600 group-hover/upload:text-blue-400 transition-colors" />
                                                    <span className="text-[9px] text-zinc-600 group-hover/upload:text-zinc-400 mt-1">Upload Anchor</span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                const reader = new FileReader();
                                                                reader.onload = (ev) => {
                                                                    const result = ev.target?.result as string;
                                                                    updateLocation(loc.id, 'anchorImage', result);
                                                                };
                                                                reader.readAsDataURL(e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                            <p className="text-[9px] text-zinc-600 mt-1">Master plate ensures all beat generations match this exact environment.</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* PRODUCT BIBLE TAB */}
            {activeTab === 'products' && (
                <div className="flex-1 flex flex-col p-8 overflow-hidden">
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-6 flex items-center gap-3">
                        <Package className="w-6 h-6 text-amber-400"/>
                        Product Bible
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20 custom-scrollbar pr-2">
                        {/* Add Card */}
                        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 min-h-[300px]">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center"><Package className="w-8 h-8 text-zinc-600" /></div>
                            <div className="flex w-full gap-2">
                                <input 
                                    type="text" 
                                    list="product-suggestions"
                                    value={newProdName} 
                                    onChange={(e) => setNewProdName(e.target.value)} 
                                    placeholder="Product Name" 
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none text-white"
                                />
                                <datalist id="product-suggestions">
                                    {allProductNames.filter(n => !products.find(p => p.name === n)).map(n => (
                                        <option key={n} value={n} />
                                    ))}
                                </datalist>
                                <button onClick={addProduct} className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-lg"><Plus className="w-5 h-5"/></button>
                            </div>
                        </div>

                        {products.map(prod => {
                            const hasRef = prod.imageRefs && prod.imageRefs.length > 0;
                            return (
                                <div key={prod.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden group transition-all relative ${hasRef ? 'border-amber-500/30 shadow-amber-900/10 shadow-lg' : 'border-white/5'}`}>
                                    <div className="h-40 bg-zinc-950 relative">
                                        {hasRef ? (
                                            <img src={prod.imageRefs![0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={prod.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-700"><Package className="w-10 h-10"/></div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                                        <div className="absolute top-3 right-3 flex gap-2">
                                            {hasRef && <div className="bg-black/60 backdrop-blur-md text-amber-400 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-amber-500/30"><Lock className="w-3 h-3"/> Locked</div>}
                                            <button className="bg-black/60 hover:bg-amber-600 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors" onClick={() => document.getElementById(`upload-prod-${prod.id}`)?.click()}><Upload className="w-3 h-3" /></button>
                                            <button onClick={() => deleteProduct(prod.id)} className="bg-black/60 hover:bg-red-600 text-white p-1.5 rounded-lg backdrop-blur-md transition-colors"><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                        <h3 className="absolute bottom-3 left-4 font-bold text-lg text-white">{prod.name}</h3>
                                        <input type="file" id={`upload-prod-${prod.id}`} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, prod.id, 'product', true)} />
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase">Description</label>
                                            <textarea value={prod.description} onChange={(e) => updateProduct(prod.id, 'description', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:border-amber-500 outline-none resize-none h-16 mt-1" placeholder="Visual description of the product..."/>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Category</label>
                                                <input type="text" value={prod.category || ''} onChange={(e) => updateProduct(prod.id, 'category', e.target.value)} placeholder="Footwear, Tech..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:border-amber-500 outline-none mt-1"/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Materials</label>
                                                <input type="text" value={prod.materialNotes || ''} onChange={(e) => updateProduct(prod.id, 'materialNotes', e.target.value)} placeholder="Leather, Metal..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:border-amber-500 outline-none mt-1"/>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Prompt Snippet</label>
                                            <input type="text" value={prod.promptSnippet || ''} onChange={(e) => updateProduct(prod.id, 'promptSnippet', e.target.value)} placeholder="Optimized product prompt..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-amber-300 focus:border-amber-500 outline-none mt-1"/>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        {/* AI Director Chat Sidebar */}
        <div className="w-80 border-l border-white/5 bg-zinc-900 flex flex-col shrink-0">
            <div className="p-4 border-b border-white/5 bg-zinc-950/50">
                <h3 className="font-bold text-white text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-emerald-400"/> Virtual Director</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Script & Coverage Expert</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatHistory.length === 0 && (
                    <div className="text-center text-zinc-600 text-xs py-8">
                        <Bot className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        <p>Ask me about your script, coverage, or character consistency...</p>
                    </div>
                )}
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-300 border border-white/5'}`}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {isChatting && <div className="flex items-center gap-2 text-xs text-zinc-500"><Loader2 className="w-3 h-3 animate-spin"/> Director is thinking...</div>}
            </div>
            <div className="p-4 border-t border-white/5 bg-zinc-950">
                <div className="relative">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendToDirector()} placeholder="Ask about script, coverage..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-10 py-3 text-xs focus:border-violet-500 outline-none text-white"/>
                    <button onClick={sendToDirector} className="absolute right-2 top-2 p-1.5 text-zinc-400 hover:text-white"><ArrowRight className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    </div>

    {/* Variant Explorer Modal */}
    {exploringBeat && (
        <VariantExplorer
            beat={exploringBeat}
            characters={characters}
            locations={locations}
            products={products}
            moodBoards={moodBoards}
            productionDesign={productionDesign}
            onSelectVariant={(variant) => {
                // Add to beat's generated images
                setBeats(prev => prev.map(b => {
                    if (b.id !== exploringBeat.id) return b;
                    return {
                        ...b,
                        generatedImageIds: [...(b.generatedImageIds || []), variant.id],
                        selectedVariantId: variant.id
                    };
                }));
                // Also save to history if handler provided
                if (onSaveVariantToHistory) {
                    onSaveVariantToHistory(variant);
                }
                setExploringBeat(null);
            }}
            onSaveAllVariants={(variants) => {
                // Save all variants to beat history
                setBeats(prev => prev.map(b => {
                    if (b.id !== exploringBeat.id) return b;
                    return {
                        ...b,
                        variantHistory: [...(b.variantHistory || []), variants],
                        generatedImageIds: [...(b.generatedImageIds || []), ...variants.map(v => v.id)]
                    };
                }));
                // Save each variant to global history
                if (onSaveVariantToHistory) {
                    variants.forEach(v => onSaveVariantToHistory(v));
                }
            }}
            onClose={() => setExploringBeat(null)}
            showNotification={showNotification}
        />
    )}
    </>
  );
};

export default ScriptStudio;
