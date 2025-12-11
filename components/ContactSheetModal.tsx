import React, { useState, useEffect, useRef } from 'react';
import { X, Grid, Loader2, Download, CheckCircle, XCircle, Camera, MessageSquare, Zap, Film, Lock, Unlock, User, MapPin, Package, AlertTriangle, ImagePlus, Palette, Trash2, Plus, BookOpen, RefreshCw } from 'lucide-react';
import {
  generateContactSheet,
  generateCoveragePack,
  generateCinematic9ShotSheet,
  ContactSheetResult,
  CinematicContactSheetResult,
  CONTACT_SHEET_12,
  COVERAGE_PACK_DIALOGUE,
  COVERAGE_PACK_ACTION,
  CINEMATIC_9_SHOT_GRID,
  ContentStylePreset,
  EntityLock,
  QCStatus
} from '../services/gemini';
import { ReferenceAsset, GenerationConfig, GeneratedImage, CharacterProfile, LocationProfile, ProductProfile } from '../types';
import JSZip from 'jszip';

interface ContactSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  references: ReferenceAsset[];
  config: GenerationConfig;
  onImagesGenerated?: (images: GeneratedImage[]) => void;
  showNotification: (msg: string) => void;
  // Bible data for entity locking
  characters?: CharacterProfile[];
  locations?: LocationProfile[];
  products?: ProductProfile[];
  // Action callbacks for shot integration
  onAddToStoryboard?: (image: GeneratedImage, shotType: string) => void;
  onSaveToBible?: (image: GeneratedImage, entityType: 'character' | 'location' | 'product') => void;
  onUseAsReference?: (image: GeneratedImage) => void;
}

type GeneratorMode = 'cinematic-9' | 'contact-sheet' | 'dialogue' | 'action';

const STYLE_PRESETS: { id: ContentStylePreset; label: string; description: string; color: string }[] = [
  { id: 'documentary', label: 'Documentary', description: 'Natural, authentic, observational', color: 'amber' },
  { id: 'commercial', label: 'Commercial', description: 'Clean, professional, polished', color: 'blue' },
  { id: 'narrative', label: 'Narrative', description: 'Story-driven, emotional, cinematic', color: 'violet' },
  { id: 'fashion', label: 'Fashion', description: 'Aspirational, editorial, beautiful', color: 'pink' },
  { id: 'music-video', label: 'Music Video', description: 'Bold, energetic, iconic', color: 'emerald' }
];

const ContactSheetModal: React.FC<ContactSheetModalProps> = ({
  isOpen,
  onClose,
  references,
  config,
  onImagesGenerated,
  showNotification,
  characters = [],
  locations = [],
  products = [],
  onAddToStoryboard,
  onSaveToBible,
  onUseAsReference
}) => {
  const [mode, setMode] = useState<GeneratorMode>('cinematic-9');
  const [stylePreset, setStylePreset] = useState<ContentStylePreset>('narrative');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [sceneContext, setSceneContext] = useState('Cinematic scene with dramatic lighting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, current: '' });
  const [result, setResult] = useState<ContactSheetResult | null>(null);
  const [cinematicResult, setCinematicResult] = useState<CinematicContactSheetResult | null>(null);

  // Entity locking state
  const [lockedCharacters, setLockedCharacters] = useState<string[]>([]);
  const [lockedLocations, setLockedLocations] = useState<string[]>([]);
  const [lockedProducts, setLockedProducts] = useState<string[]>([]);

  // Reference image for style/character consistency
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [styleFromReference, setStyleFromReference] = useState(true);
  const [charactersFromReference, setCharactersFromReference] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle reference image upload
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setReferenceImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Build entity locks from Bible data
  const buildEntityLocks = (): EntityLock[] => {
    const locks: EntityLock[] = [];

    // Add locked characters
    lockedCharacters.forEach(charId => {
      const char = characters.find(c => c.id === charId);
      if (char) {
        locks.push({
          type: 'character',
          name: char.name,
          promptSnippet: char.promptSnippet || char.description || '',
          referenceImages: char.imageRefs || []
        });
      }
    });

    // Add locked locations
    lockedLocations.forEach(locId => {
      const loc = locations.find(l => l.id === locId);
      if (loc) {
        locks.push({
          type: 'location',
          name: loc.name,
          promptSnippet: loc.promptSnippet || loc.description || '',
          referenceImages: loc.imageRefs || []
        });
      }
    });

    // Add locked products
    lockedProducts.forEach(prodId => {
      const prod = products.find(p => p.id === prodId);
      if (prod) {
        locks.push({
          type: 'product',
          name: prod.name,
          promptSnippet: prod.promptSnippet || prod.description || '',
          referenceImages: prod.imageRefs || []
        });
      }
    });

    return locks;
  };

  const toggleEntityLock = (type: 'character' | 'location' | 'product', id: string) => {
    if (type === 'character') {
      setLockedCharacters(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else if (type === 'location') {
      setLockedLocations(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else {
      setLockedProducts(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    }
  };

  const handleGenerate = async () => {
    if (!subjectDescription.trim()) {
      showNotification('Please enter a subject description');
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setCinematicResult(null);

    const totalShots = mode === 'cinematic-9' ? 9 : mode === 'contact-sheet' ? 12 : 5;
    setProgress({ completed: 0, total: totalShots, current: 'Starting...' });

    try {
      // Build enhanced references including the reference image if provided
      let enhancedRefs = [...references];
      if (referenceImage) {
        // Add reference image as a high-priority style reference
        // IMPORTANT: generateImage() uses ref.data not ref.url for the image data
        const styleDesc = [
          styleFromReference ? 'CRITICAL: Match this EXACT visual style, color palette, lighting, and artistic treatment.' : '',
          charactersFromReference ? 'CRITICAL: Keep ALL characters looking EXACTLY like this - same face, body, clothes, colors.' : ''
        ].filter(Boolean).join(' ');

        enhancedRefs = [
          {
            id: 'style-reference',
            data: referenceImage,  // base64 data URL - this is what generateImage expects
            type: 'Style' as const,
            name: 'MASTER REFERENCE - Match This Exactly',
            styleDescription: styleDesc || 'Match this reference image style and characters exactly.'
          },
          ...enhancedRefs
        ];
      }

      // Build style instructions from reference toggles
      const styleInstructions = referenceImage ? [
        styleFromReference ? 'CRITICAL: Match the exact visual style, color palette, lighting, and artistic treatment from the reference image.' : '',
        charactersFromReference ? 'CRITICAL: Maintain exact character consistency - same appearance, proportions, colors, and design details as shown in the reference image.' : ''
      ].filter(Boolean).join(' ') : '';

      // Enhance subject description with style instructions
      const enhancedSubject = styleInstructions
        ? `${subjectDescription}\n\n[STYLE LOCK INSTRUCTIONS: ${styleInstructions}]`
        : subjectDescription;

      if (mode === 'cinematic-9') {
        const entityLocks = buildEntityLocks();
        const cinematicRes = await generateCinematic9ShotSheet(
          enhancedSubject,
          sceneContext,
          stylePreset,
          entityLocks,
          enhancedRefs,
          config,
          (completed, total, current) => {
            setProgress({ completed, total, current });
          }
        );
        setCinematicResult(cinematicRes);

        // Collect successful images
        const successfulImages = cinematicRes.shots
          .filter(s => s.image)
          .map(s => s.image!);

        if (successfulImages.length > 0 && onImagesGenerated) {
          onImagesGenerated(successfulImages);
        }

        showNotification(`Generated ${cinematicRes.successCount}/${cinematicRes.totalCount} cinematic shots`);
      } else {
        let contactResult: ContactSheetResult;

        if (mode === 'contact-sheet') {
          contactResult = await generateContactSheet(
            enhancedSubject,
            sceneContext,
            enhancedRefs,
            config,
            (completed, total, current) => {
              setProgress({ completed, total, current });
            }
          );
        } else {
          contactResult = await generateCoveragePack(
            mode === 'dialogue' ? 'dialogue' : 'action',
            enhancedSubject,
            sceneContext,
            enhancedRefs,
            config,
            (completed, total, current) => {
              setProgress({ completed, total, current });
            }
          );
        }

        setResult(contactResult);

        const successfulImages = contactResult.shots
          .filter(s => s.image)
          .map(s => s.image!);

        if (successfulImages.length > 0 && onImagesGenerated) {
          onImagesGenerated(successfulImages);
        }

        showNotification(`Generated ${contactResult.successCount}/${contactResult.totalCount} shots`);
      }
    } catch (error) {
      console.error('Contact sheet generation failed:', error);
      showNotification('Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();

    if (cinematicResult) {
      const successfulShots = cinematicResult.shots.filter(s => s.image);
      successfulShots.forEach((shot, idx) => {
        if (shot.image) {
          const base64Data = shot.image.url.split(',')[1];
          const filename = `${String(idx + 1).padStart(2, '0')}_${shot.spec.shotType}_${shot.spec.label.replace(/\s+/g, '_')}.png`;
          zip.file(filename, base64Data, { base64: true });
        }
      });
    } else if (result) {
      const successfulShots = result.shots.filter(s => s.image);
      successfulShots.forEach((shot, idx) => {
        if (shot.image) {
          const base64Data = shot.image.url.split(',')[1];
          const filename = `${String(idx + 1).padStart(2, '0')}_${shot.type.replace(/\s+/g, '_')}_${shot.angle.replace(/\s+/g, '_')}.png`;
          zip.file(filename, base64Data, { base64: true });
        }
      });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode}_${stylePreset}_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getModeConfig = () => {
    switch (mode) {
      case 'cinematic-9':
        return { shots: CINEMATIC_9_SHOT_GRID, label: 'Cinematic 9-Shot Grid', icon: Film, color: 'violet', count: 9 };
      case 'contact-sheet':
        return { shots: CONTACT_SHEET_12, label: '12-Shot Contact Sheet', icon: Grid, color: 'blue', count: 12 };
      case 'dialogue':
        return { shots: COVERAGE_PACK_DIALOGUE, label: 'Dialogue Coverage', icon: MessageSquare, color: 'cyan', count: 5 };
      case 'action':
        return { shots: COVERAGE_PACK_ACTION, label: 'Action Coverage', icon: Zap, color: 'orange', count: 5 };
    }
  };

  const modeConfig = getModeConfig();
  const hasEntities = characters.length > 0 || locations.length > 0 || products.length > 0;
  const totalLocked = lockedCharacters.length + lockedLocations.length + lockedProducts.length;

  const getQCBadge = (status?: QCStatus) => {
    if (!status) return null;
    switch (status) {
      case 'pass':
        return <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-green-500/90 text-white text-[9px] font-bold rounded">PASS</span>;
      case 'warning':
        return <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[9px] font-bold rounded flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />WARN</span>;
      case 'fail':
        return <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-500/90 text-white text-[9px] font-bold rounded">FAIL</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-violet-400" />
              Cinematic Contact Sheet
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Professional cinematographic coverage with entity locking</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-4 border-b border-zinc-800 flex gap-2 flex-wrap">
          {[
            { id: 'cinematic-9' as GeneratorMode, label: 'Cinematic 9-Shot', icon: Film, shots: 9, featured: true },
            { id: 'contact-sheet' as GeneratorMode, label: '12-Shot Grid', icon: Grid, shots: 12 },
            { id: 'dialogue' as GeneratorMode, label: 'Dialogue Pack', icon: MessageSquare, shots: 5 },
            { id: 'action' as GeneratorMode, label: 'Action Pack', icon: Zap, shots: 5 }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setResult(null); setCinematicResult(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m.id
                  ? m.featured ? 'bg-violet-600 text-white ring-2 ring-violet-400' : 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <m.icon className="w-4 h-4" />
              {m.label}
              <span className="text-[10px] opacity-60">({m.shots})</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result && !cinematicResult ? (
            <div className="space-y-6">
              {/* Style Presets - only for cinematic mode */}
              {mode === 'cinematic-9' && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3">Style Preset</h3>
                  <div className="flex gap-2 flex-wrap">
                    {STYLE_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setStylePreset(preset.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          stylePreset === preset.id
                            ? `bg-${preset.color}-600 text-white ring-2 ring-${preset.color}-400`
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                        style={{
                          backgroundColor: stylePreset === preset.id
                            ? preset.color === 'amber' ? '#d97706'
                            : preset.color === 'blue' ? '#2563eb'
                            : preset.color === 'violet' ? '#7c3aed'
                            : preset.color === 'pink' ? '#db2777'
                            : preset.color === 'emerald' ? '#059669'
                            : undefined
                            : undefined
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    {STYLE_PRESETS.find(p => p.id === stylePreset)?.description}
                  </p>
                </div>
              )}

              {/* Reference Image Upload */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase flex items-center gap-2">
                    <ImagePlus className="w-4 h-4" />
                    Reference Image (Style Lock)
                  </h3>
                  {referenceImage && (
                    <button
                      onClick={clearReferenceImage}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mb-3">
                  Upload a reference image to maintain consistent style and character appearance across all generated shots
                </p>

                {referenceImage ? (
                  <div className="space-y-3">
                    {/* Preview */}
                    <div className="relative w-48 h-32 rounded-lg overflow-hidden border border-zinc-600">
                      <img
                        src={referenceImage}
                        alt="Style reference"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-violet-600 text-white text-[9px] font-bold rounded">
                        REFERENCE
                      </div>
                    </div>

                    {/* Style Lock Options */}
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={styleFromReference}
                          onChange={(e) => setStyleFromReference(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-xs text-zinc-300 flex items-center gap-1">
                          <Palette className="w-3 h-3" />
                          Lock Visual Style
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={charactersFromReference}
                          onChange={(e) => setCharactersFromReference(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-xs text-zinc-300 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Lock Characters
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-600 rounded-lg cursor-pointer hover:border-violet-500/50 hover:bg-zinc-800/50 transition-all">
                    <ImagePlus className="w-8 h-8 text-zinc-500 mb-2" />
                    <span className="text-xs text-zinc-500">Click to upload reference image</span>
                    <span className="text-[10px] text-zinc-600 mt-1">PNG, JPG up to 10MB</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleReferenceUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Entity Locking - only for cinematic mode */}
              {mode === 'cinematic-9' && hasEntities && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Entity Locking
                    </h3>
                    {totalLocked > 0 && (
                      <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full">
                        {totalLocked} locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">
                    Lock entities from your Bibles to maintain visual consistency across all shots
                  </p>

                  <div className="space-y-3">
                    {/* Characters */}
                    {characters.length > 0 && (
                      <div>
                        <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                          <User className="w-3 h-3" /> Characters
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {characters.map(char => (
                            <button
                              key={char.id}
                              onClick={() => toggleEntityLock('character', char.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                lockedCharacters.includes(char.id)
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                              }`}
                            >
                              {lockedCharacters.includes(char.id) ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              {char.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Locations */}
                    {locations.length > 0 && (
                      <div>
                        <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Locations
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {locations.map(loc => (
                            <button
                              key={loc.id}
                              onClick={() => toggleEntityLock('location', loc.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                lockedLocations.includes(loc.id)
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                              }`}
                            >
                              {lockedLocations.includes(loc.id) ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              {loc.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Products */}
                    {products.length > 0 && (
                      <div>
                        <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                          <Package className="w-3 h-3" /> Products
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {products.map(prod => (
                            <button
                              key={prod.id}
                              onClick={() => toggleEntityLock('product', prod.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                lockedProducts.includes(prod.id)
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                              }`}
                            >
                              {lockedProducts.includes(prod.id) ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              {prod.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Shot Preview Grid */}
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3">Shot List Preview</h3>
                <div className={`grid gap-2 ${mode === 'cinematic-9' ? 'grid-cols-3' : mode === 'contact-sheet' ? 'grid-cols-4' : 'grid-cols-5'}`}>
                  {mode === 'cinematic-9' ? (
                    CINEMATIC_9_SHOT_GRID.map((shot, idx) => (
                      <div key={idx} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                        <div className="text-xs font-bold text-violet-400 mb-1">{shot.shotType}</div>
                        <div className="text-[10px] text-white font-medium">{shot.label}</div>
                        <div className="text-[9px] text-zinc-500 mt-1">{shot.purpose}</div>
                      </div>
                    ))
                  ) : (
                    modeConfig.shots.map((shot: any, idx: number) => (
                      <div key={idx} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2 text-center">
                        <div className="text-[10px] font-bold text-violet-400">{shot.type}</div>
                        <div className="text-[9px] text-zinc-500">{shot.angle}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-zinc-400 uppercase mb-2 block">Subject Description</label>
                  <textarea
                    value={subjectDescription}
                    onChange={(e) => setSubjectDescription(e.target.value)}
                    placeholder="e.g., Cyberpunk courier with neon visor, tactical vest, rain-soaked aesthetic"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder:text-zinc-600 h-32 resize-none focus:border-violet-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-zinc-400 uppercase mb-2 block">Scene Context</label>
                  <textarea
                    value={sceneContext}
                    onChange={(e) => setSceneContext(e.target.value)}
                    placeholder="e.g., Neon-lit alleyway, wet pavement reflecting lights, dystopian city"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder:text-zinc-600 h-32 resize-none focus:border-violet-500 outline-none"
                  />
                </div>
              </div>

              {/* Progress */}
              {isGenerating && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-300">Generating shots in parallel...</span>
                    <span className="text-sm font-mono text-violet-400">{progress.completed}/{progress.total}</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-2 mb-2">
                    <div
                      className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-zinc-500">{progress.current}</div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !subjectDescription.trim()}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating {modeConfig.label}...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    Generate {modeConfig.label}
                    {referenceImage && (
                      <span className="text-xs bg-emerald-500 px-2 py-0.5 rounded-full ml-2 flex items-center gap-1">
                        <ImagePlus className="w-3 h-3" />
                        Style Locked
                      </span>
                    )}
                    {totalLocked > 0 && (
                      <span className="text-xs bg-violet-500 px-2 py-0.5 rounded-full ml-2">
                        {totalLocked} entities
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-white">Results</h3>
                  <span className="text-sm text-zinc-400">
                    {cinematicResult
                      ? `${cinematicResult.successCount}/${cinematicResult.totalCount} shots generated`
                      : result ? `${result.successCount}/${result.totalCount} shots generated` : ''
                    }
                  </span>
                  {mode === 'cinematic-9' && (
                    <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded capitalize">
                      {stylePreset}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadAll}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download All (.zip)
                  </button>
                  <button
                    onClick={() => { setResult(null); setCinematicResult(null); }}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Generate New
                  </button>
                </div>
              </div>

              {/* Cinematic 9-Shot Results Grid (3x3) */}
              {cinematicResult && (
                <div className="grid grid-cols-3 gap-4">
                  {cinematicResult.shots.map((shot, idx) => (
                    <div
                      key={idx}
                      className={`relative rounded-xl overflow-hidden border group ${
                        shot.failed ? 'border-red-500/50 bg-red-950/20' : 'border-zinc-700 bg-zinc-800'
                      }`}
                    >
                      <div className="aspect-video bg-zinc-900 relative">
                        {shot.image ? (
                          <>
                            <img
                              src={shot.image.url}
                              alt={shot.spec.label}
                              className="w-full h-full object-cover"
                            />
                            {/* Action buttons overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {onAddToStoryboard && (
                                <button
                                  onClick={() => onAddToStoryboard(shot.image!, shot.spec.shotType)}
                                  className="p-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white transition-colors"
                                  title="Add to Storyboard"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                              {onSaveToBible && (
                                <button
                                  onClick={() => onSaveToBible(shot.image!, 'character')}
                                  className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors"
                                  title="Save to Bible"
                                >
                                  <BookOpen className="w-4 h-4" />
                                </button>
                              )}
                              {onUseAsReference && (
                                <button
                                  onClick={() => onUseAsReference(shot.image!)}
                                  className="p-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-white transition-colors"
                                  title="Use as Reference"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              <a
                                href={shot.image.url}
                                download={`${shot.spec.shotType}_${shot.spec.label}.png`}
                                className="p-2 bg-zinc-600 hover:bg-zinc-500 rounded-lg text-white transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {shot.failed ? (
                              <XCircle className="w-8 h-8 text-red-500" />
                            ) : (
                              <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
                            )}
                          </div>
                        )}
                        {getQCBadge(shot.qc?.status)}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {shot.image && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                          {shot.failed && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                          <span className="text-xs font-bold text-violet-400">{shot.spec.shotType}</span>
                          <span className="text-xs text-zinc-300">{shot.spec.label}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">{shot.spec.purpose}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Standard Results Grid */}
              {result && (
                <div className={`grid gap-4 ${mode === 'contact-sheet' ? 'grid-cols-4' : 'grid-cols-5'}`}>
                  {result.shots.map((shot, idx) => (
                    <div
                      key={idx}
                      className={`relative rounded-xl overflow-hidden border group ${
                        shot.failed ? 'border-red-500/50 bg-red-950/20' : 'border-zinc-700 bg-zinc-800'
                      }`}
                    >
                      <div className="aspect-video bg-zinc-900 relative">
                        {shot.image ? (
                          <>
                            <img
                              src={shot.image.url}
                              alt={`${shot.type} ${shot.angle}`}
                              className="w-full h-full object-cover"
                            />
                            {/* Action buttons overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              {onAddToStoryboard && (
                                <button
                                  onClick={() => onAddToStoryboard(shot.image!, shot.type)}
                                  className="p-1.5 bg-violet-600 hover:bg-violet-700 rounded text-white transition-colors"
                                  title="Add to Storyboard"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                              {onSaveToBible && (
                                <button
                                  onClick={() => onSaveToBible(shot.image!, 'character')}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-white transition-colors"
                                  title="Save to Bible"
                                >
                                  <BookOpen className="w-3 h-3" />
                                </button>
                              )}
                              {onUseAsReference && (
                                <button
                                  onClick={() => onUseAsReference(shot.image!)}
                                  className="p-1.5 bg-amber-600 hover:bg-amber-700 rounded text-white transition-colors"
                                  title="Use as Reference"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              )}
                              <a
                                href={shot.image.url}
                                download={`${shot.type}_${shot.angle}.png`}
                                className="p-1.5 bg-zinc-600 hover:bg-zinc-500 rounded text-white transition-colors"
                                title="Download"
                              >
                                <Download className="w-3 h-3" />
                              </a>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {shot.failed ? (
                              <XCircle className="w-8 h-8 text-red-500" />
                            ) : (
                              <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="flex items-center gap-1">
                          {shot.image && <CheckCircle className="w-3 h-3 text-green-500" />}
                          {shot.failed && <XCircle className="w-3 h-3 text-red-500" />}
                          <span className="text-[10px] font-bold text-zinc-300">{shot.type}</span>
                        </div>
                        <div className="text-[9px] text-zinc-500">{shot.angle}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactSheetModal;
