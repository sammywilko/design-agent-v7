import React, { useState, useMemo, useRef } from 'react';
import { X, Film, Loader2, Download, CheckCircle, XCircle, Lock, Unlock, User, MapPin, Package, AlertTriangle, Camera, ChevronRight, Layers, Upload, Palette, Image as ImageIcon, Scan, Shield } from 'lucide-react';
import {
  generateCinematic9ShotSheet,
  CinematicContactSheetResult,
  CINEMATIC_9_SHOT_GRID,
  ContentStylePreset,
  EntityLock,
  QCStatus,
  CinematicShotSpec
} from '../services/gemini';
import { ReferenceAsset, GenerationConfig, GeneratedImage, CharacterProfile, LocationProfile, ProductProfile, Beat, MoodBoard, ReferenceVocabulary } from '../types';
import { ReferenceIntelligenceService, ConsistencyLevel } from '../services/referenceIntelligence';
import JSZip from 'jszip';

interface SceneCoverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  beat: Beat;
  references: ReferenceAsset[];
  config: GenerationConfig;
  onImagesGenerated?: (images: GeneratedImage[], beatId: string) => void;
  showNotification: (msg: string) => void;
  // Bible data for entity locking
  characters?: CharacterProfile[];
  locations?: LocationProfile[];
  products?: ProductProfile[];
  // Mood boards for custom style references
  moodBoards?: MoodBoard[];
}

const STYLE_PRESETS: { id: ContentStylePreset; label: string; description: string; icon: string }[] = [
  { id: 'documentary', label: 'Documentary', description: 'Natural, authentic, observational', icon: '📹' },
  { id: 'commercial', label: 'Commercial', description: 'Clean, professional, polished', icon: '💼' },
  { id: 'narrative', label: 'Narrative', description: 'Story-driven, emotional, cinematic', icon: '🎬' },
  { id: 'fashion', label: 'Fashion', description: 'Aspirational, editorial, beautiful', icon: '👗' },
  { id: 'music-video', label: 'Music Video', description: 'Bold, energetic, iconic', icon: '🎵' }
];

type StyleMode = 'preset' | 'custom';

const SceneCoverageModal: React.FC<SceneCoverageModalProps> = ({
  isOpen,
  onClose,
  beat,
  references,
  config,
  onImagesGenerated,
  showNotification,
  characters = [],
  locations = [],
  products = [],
  moodBoards = []
}) => {
  const [styleMode, setStyleMode] = useState<StyleMode>('preset');
  const [stylePreset, setStylePreset] = useState<ContentStylePreset>('narrative');
  const [customStyleImage, setCustomStyleImage] = useState<string | null>(null);
  const [selectedMoodBoard, setSelectedMoodBoard] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, current: '' });
  const [result, setResult] = useState<CinematicContactSheetResult | null>(null);

  const styleInputRef = useRef<HTMLInputElement>(null);

  // Selected shots - start with all selected
  const [selectedShots, setSelectedShots] = useState<string[]>(CINEMATIC_9_SHOT_GRID.map(s => s.id));

  // Entity locking state - auto-lock entities mentioned in beat
  const [lockedCharacters, setLockedCharacters] = useState<string[]>(() =>
    characters.filter(c => beat.characters.includes(c.name)).map(c => c.id)
  );
  const [lockedLocations, setLockedLocations] = useState<string[]>(() =>
    locations.filter(l => beat.locations.includes(l.name)).map(l => l.id)
  );
  const [lockedProducts, setLockedProducts] = useState<string[]>(() =>
    products.filter(p => beat.products.includes(p.name)).map(p => p.id)
  );

  // Override description from beat
  const [customDescription, setCustomDescription] = useState('');

  // Reference Intelligence - Consistency enforcement level
  const [consistencyLevel, setConsistencyLevel] = useState<ConsistencyLevel>('moderate');

  // Check for characters with vocabulary
  const charactersWithVocabulary = useMemo(() =>
    characters.filter(c => c.referenceVocabulary && c.referenceVocabulary.confidenceScore > 50),
    [characters]
  );

  if (!isOpen) return null;

  // Build scene description from beat data
  const sceneDescription = useMemo(() => {
    const charNames = beat.characters.length > 0 ? beat.characters.join(', ') : 'Subject';
    const locNames = beat.locations.length > 0 ? beat.locations.join(', ') : 'scene environment';
    return customDescription || `${charNames} in ${locNames}. ${beat.visualSummary}`;
  }, [beat, customDescription]);

  const sceneContext = useMemo(() => {
    const locNames = beat.locations.length > 0 ? beat.locations.join(', ') : 'cinematic environment';
    return `${locNames}. Mood: ${beat.mood}. ${beat.shotType || ''}.`;
  }, [beat]);

  // Build entity locks from Bible data with vocabulary enhancement
  const buildEntityLocks = (): EntityLock[] => {
    const locks: EntityLock[] = [];
    const apiKey = (import.meta as unknown as { env: { VITE_GEMINI_API_KEY?: string } }).env.VITE_GEMINI_API_KEY;
    const refIntelligence = apiKey ? new ReferenceIntelligenceService(apiKey) : null;

    lockedCharacters.forEach(charId => {
      const char = characters.find(c => c.id === charId);
      if (char) {
        let enhancedPromptSnippet = char.promptSnippet || char.description || '';

        // If character has vocabulary, enhance the prompt with consistency constraints
        if (char.referenceVocabulary && refIntelligence) {
          enhancedPromptSnippet = refIntelligence.enhancePromptWithVocabulary(
            enhancedPromptSnippet,
            char.referenceVocabulary,
            consistencyLevel
          );
        }

        locks.push({
          type: 'character',
          name: char.name,
          promptSnippet: enhancedPromptSnippet,
          referenceImages: char.imageRefs || []
        });
      }
    });

    lockedLocations.forEach(locId => {
      const loc = locations.find(l => l.id === locId);
      if (loc) {
        let enhancedPromptSnippet = loc.promptSnippet || loc.description || '';

        // If location has vocabulary, enhance the prompt
        if (loc.referenceVocabulary && refIntelligence) {
          enhancedPromptSnippet = refIntelligence.enhancePromptWithVocabulary(
            enhancedPromptSnippet,
            loc.referenceVocabulary,
            consistencyLevel
          );
        }

        locks.push({
          type: 'location',
          name: loc.name,
          promptSnippet: enhancedPromptSnippet,
          referenceImages: loc.imageRefs || []
        });
      }
    });

    lockedProducts.forEach(prodId => {
      const prod = products.find(p => p.id === prodId);
      if (prod) {
        let enhancedPromptSnippet = prod.promptSnippet || prod.description || '';

        // If product has vocabulary, enhance the prompt
        if (prod.referenceVocabulary && refIntelligence) {
          enhancedPromptSnippet = refIntelligence.enhancePromptWithVocabulary(
            enhancedPromptSnippet,
            prod.referenceVocabulary,
            consistencyLevel
          );
        }

        locks.push({
          type: 'product',
          name: prod.name,
          promptSnippet: enhancedPromptSnippet,
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

  const toggleShotSelection = (shotId: string) => {
    setSelectedShots(prev =>
      prev.includes(shotId) ? prev.filter(x => x !== shotId) : [...prev, shotId]
    );
  };

  // Handle custom style image upload
  const handleStyleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomStyleImage(reader.result as string);
        setSelectedMoodBoard(null); // Clear mood board selection
      };
      reader.readAsDataURL(file);
    }
  };

  // Build style references for custom mode
  const buildStyleReferences = (): ReferenceAsset[] => {
    const styleRefs: ReferenceAsset[] = [...references];

    if (styleMode === 'custom') {
      // Add custom uploaded image
      if (customStyleImage) {
        styleRefs.push({
          id: 'custom-style-ref',
          data: customStyleImage,
          type: 'Style',
          name: 'Custom Style Reference',
          styleDescription: 'Match this visual style, lighting, color palette, and mood'
        });
      }

      // Add selected mood board images
      if (selectedMoodBoard) {
        const moodBoard = moodBoards.find(mb => mb.id === selectedMoodBoard);
        if (moodBoard) {
          moodBoard.images.forEach((img, idx) => {
            styleRefs.push({
              id: `moodboard-${moodBoard.id}-${idx}`,
              data: img.url,
              type: 'Style',
              name: `${moodBoard.name} ref ${idx + 1}`,
              styleDescription: moodBoard.styleDNA?.promptSnippet || 'Match this visual style'
            });
          });
        }
      }
    }

    return styleRefs;
  };

  const handleGenerate = async () => {
    if (selectedShots.length === 0) {
      showNotification('Please select at least one shot type');
      return;
    }

    // Validate custom mode has a style reference
    if (styleMode === 'custom' && !customStyleImage && !selectedMoodBoard) {
      showNotification('Please upload a style reference or select a mood board');
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setProgress({ completed: 0, total: selectedShots.length, current: 'Starting...' });

    try {
      const entityLocks = buildEntityLocks();
      const styleReferences = buildStyleReferences();

      const cinematicRes = await generateCinematic9ShotSheet(
        sceneDescription,
        sceneContext,
        stylePreset, // Still passed for lighting defaults, but custom refs override
        entityLocks,
        styleReferences,
        config,
        (completed, total, current) => {
          setProgress({ completed, total, current });
        }
      );

      // Filter to only selected shots
      const filteredResult: CinematicContactSheetResult = {
        ...cinematicRes,
        shots: cinematicRes.shots.filter(s => selectedShots.includes(s.spec.id)),
        successCount: cinematicRes.shots.filter(s => selectedShots.includes(s.spec.id) && s.image).length,
        totalCount: selectedShots.length
      };

      setResult(filteredResult);

      // Collect successful images
      const successfulImages = filteredResult.shots
        .filter(s => s.image)
        .map(s => s.image!);

      if (successfulImages.length > 0 && onImagesGenerated) {
        onImagesGenerated(successfulImages, beat.id);
      }

      showNotification(`Generated ${filteredResult.successCount}/${filteredResult.totalCount} coverage shots for "${beat.visualSummary.slice(0, 30)}..."`);
    } catch (error) {
      console.error('Scene coverage generation failed:', error);
      showNotification('Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!result) return;

    const zip = new JSZip();
    const successfulShots = result.shots.filter(s => s.image);

    successfulShots.forEach((shot, idx) => {
      if (shot.image) {
        const base64Data = shot.image.url.split(',')[1];
        const beatPrefix = beat.id.slice(0, 8);
        const filename = `${beatPrefix}_${String(idx + 1).padStart(2, '0')}_${shot.spec.shotType}_${shot.spec.label.replace(/\s+/g, '_')}.png`;
        zip.file(filename, base64Data, { base64: true });
      }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scene_coverage_${beat.id.slice(0, 8)}_${stylePreset}_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const hasEntities = characters.length > 0 || locations.length > 0 || products.length > 0;
  const totalLocked = lockedCharacters.length + lockedLocations.length + lockedProducts.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-violet-400" />
                Scene Coverage Generator
              </h2>
              <p className="text-sm text-zinc-500 mt-1">Generate cinematographic coverage for this scene</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Beat Context Banner */}
          <div className="mt-4 bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center">
              <Film className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-white">{beat.visualSummary.slice(0, 60)}{beat.visualSummary.length > 60 ? '...' : ''}</div>
              <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                <span>{beat.shotType}</span>
                <ChevronRight className="w-3 h-3" />
                <span>{beat.mood}</span>
                <ChevronRight className="w-3 h-3" />
                <span>{beat.duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result ? (
            <div className="space-y-6">
              {/* Style Mode Toggle */}
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3">Visual Style</h3>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setStyleMode('preset')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      styleMode === 'preset'
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    Preset Styles
                  </button>
                  <button
                    onClick={() => setStyleMode('custom')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      styleMode === 'custom'
                        ? 'bg-fuchsia-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Custom Reference
                  </button>
                </div>

                {/* Preset Style Grid */}
                {styleMode === 'preset' && (
                  <div className="grid grid-cols-5 gap-2">
                    {STYLE_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => setStylePreset(preset.id)}
                        className={`p-3 rounded-lg text-center transition-all ${
                          stylePreset === preset.id
                            ? 'bg-violet-600 text-white ring-2 ring-violet-400'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        <div className="text-xl mb-1">{preset.icon}</div>
                        <div className="text-xs font-medium">{preset.label}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom Style Upload */}
                {styleMode === 'custom' && (
                  <div className="space-y-4">
                    {/* Upload Area */}
                    <div className="relative">
                      <input
                        ref={styleInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleStyleImageUpload}
                        className="hidden"
                      />
                      {customStyleImage ? (
                        <div className="relative group">
                          <img
                            src={customStyleImage}
                            alt="Style reference"
                            className="w-full h-40 object-cover rounded-lg border border-fuchsia-500"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => setCustomStyleImage(null)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-fuchsia-600 text-white text-xs rounded font-medium">
                            Custom Style Reference
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => styleInputRef.current?.click()}
                          className="w-full h-40 border-2 border-dashed border-zinc-700 hover:border-fuchsia-500 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors bg-zinc-800/50"
                        >
                          <Upload className="w-8 h-8 text-zinc-500" />
                          <span className="text-sm text-zinc-400">Upload style reference image</span>
                          <span className="text-xs text-zinc-600">Any image showing your desired look</span>
                        </button>
                      )}
                    </div>

                    {/* Mood Board Selection */}
                    {moodBoards.length > 0 && (
                      <div>
                        <div className="text-xs text-zinc-500 mb-2">Or select from your Mood Boards:</div>
                        <div className="flex gap-2 flex-wrap">
                          {moodBoards.map(mb => (
                            <button
                              key={mb.id}
                              onClick={() => {
                                setSelectedMoodBoard(mb.id === selectedMoodBoard ? null : mb.id);
                                if (mb.id !== selectedMoodBoard) setCustomStyleImage(null);
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                selectedMoodBoard === mb.id
                                  ? 'bg-fuchsia-600 text-white ring-2 ring-fuchsia-400'
                                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                              }`}
                            >
                              {mb.images[0] && (
                                <img src={mb.images[0].url} className="w-6 h-6 rounded object-cover" alt="" />
                              )}
                              {mb.name}
                              <span className="text-[10px] opacity-60">({mb.images.length})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom style info */}
                    <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg">
                      <p className="text-xs text-fuchsia-300">
                        <strong>Custom Reference:</strong> The AI will match the visual style, lighting, color palette, and mood of your reference image across all generated shots.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Shot Selection Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase">Select Coverage Shots</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedShots(CINEMATIC_9_SHOT_GRID.map(s => s.id))}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Select All
                    </button>
                    <span className="text-zinc-600">|</span>
                    <button
                      onClick={() => setSelectedShots([])}
                      className="text-xs text-zinc-500 hover:text-zinc-400"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CINEMATIC_9_SHOT_GRID.map(shot => (
                    <button
                      key={shot.id}
                      onClick={() => toggleShotSelection(shot.id)}
                      className={`p-3 rounded-lg text-left transition-all border ${
                        selectedShots.includes(shot.id)
                          ? 'bg-violet-600/20 border-violet-500 text-white'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-violet-400">{shot.shotType}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedShots.includes(shot.id)
                            ? 'bg-violet-600 border-violet-600'
                            : 'border-zinc-600'
                        }`}>
                          {selectedShots.includes(shot.id) && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <div className="text-[10px] text-white font-medium">{shot.label}</div>
                      <div className="text-[9px] text-zinc-500 mt-1">{shot.purpose}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Entity Locking */}
              {hasEntities && (
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
                    Entities from the beat are auto-locked. Toggle to adjust consistency.
                  </p>

                  <div className="space-y-3">
                    {/* Characters */}
                    {characters.length > 0 && (
                      <div>
                        <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                          <User className="w-3 h-3" /> Characters
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {characters.map(char => {
                            const isInBeat = beat.characters.includes(char.name);
                            return (
                              <button
                                key={char.id}
                                onClick={() => toggleEntityLock('character', char.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  lockedCharacters.includes(char.id)
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                } ${isInBeat ? 'ring-1 ring-violet-400/50' : ''}`}
                              >
                                {lockedCharacters.includes(char.id) ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                {char.name}
                                {char.referenceVocabulary && (
                                  <span title={`Visual vocabulary: ${char.referenceVocabulary.confidenceScore}% confidence`}>
                                    <Scan className="w-3 h-3 text-purple-400" />
                                  </span>
                                )}
                                {isInBeat && <span className="text-[8px] opacity-60">(in scene)</span>}
                              </button>
                            );
                          })}
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
                          {locations.map(loc => {
                            const isInBeat = beat.locations.includes(loc.name);
                            return (
                              <button
                                key={loc.id}
                                onClick={() => toggleEntityLock('location', loc.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  lockedLocations.includes(loc.id)
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                } ${isInBeat ? 'ring-1 ring-emerald-400/50' : ''}`}
                              >
                                {lockedLocations.includes(loc.id) ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                {loc.name}
                                {isInBeat && <span className="text-[8px] opacity-60">(in scene)</span>}
                              </button>
                            );
                          })}
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
                          {products.map(prod => {
                            const isInBeat = beat.products.includes(prod.name);
                            return (
                              <button
                                key={prod.id}
                                onClick={() => toggleEntityLock('product', prod.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  lockedProducts.includes(prod.id)
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                } ${isInBeat ? 'ring-1 ring-amber-400/50' : ''}`}
                              >
                                {lockedProducts.includes(prod.id) ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                {prod.name}
                                {isInBeat && <span className="text-[8px] opacity-60">(in scene)</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Consistency Enforcement Level - shown if any entity has vocabulary */}
                  {charactersWithVocabulary.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs font-medium text-purple-300">Visual Vocabulary Enforcement</span>
                        <span className="text-[10px] text-purple-400/60 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          {charactersWithVocabulary.length} character{charactersWithVocabulary.length > 1 ? 's' : ''} with vocabulary
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {(['subtle', 'moderate', 'strict'] as ConsistencyLevel[]).map((level) => (
                          <button
                            key={level}
                            onClick={() => setConsistencyLevel(level)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                              consistencyLevel === level
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                            }`}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-2">
                        {consistencyLevel === 'subtle' && 'Light consistency - more creative freedom in generation'}
                        {consistencyLevel === 'moderate' && 'Balanced - enforces key visual traits while allowing variation'}
                        {consistencyLevel === 'strict' && 'Maximum consistency - strictly adheres to extracted vocabulary'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Description Override */}
              <div>
                <label className="text-sm font-bold text-zinc-400 uppercase mb-2 block">
                  Scene Description Override <span className="text-zinc-600 font-normal">(optional)</span>
                </label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={sceneDescription}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder:text-zinc-600 h-20 resize-none focus:border-violet-500 outline-none"
                />
                <p className="text-xs text-zinc-600 mt-1">Leave empty to use auto-generated description from beat data</p>
              </div>

              {/* Progress */}
              {isGenerating && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-300">Generating coverage shots...</span>
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
                disabled={isGenerating || selectedShots.length === 0}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating {selectedShots.length} Coverage Shots...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    Generate {selectedShots.length} Coverage Shots
                    {totalLocked > 0 && (
                      <span className="text-xs bg-violet-500 px-2 py-0.5 rounded-full ml-2">
                        {totalLocked} entities locked
                      </span>
                    )}
                    {charactersWithVocabulary.length > 0 && (
                      <span className="text-xs bg-purple-500 px-2 py-0.5 rounded-full ml-1 flex items-center gap-1">
                        <Scan className="w-3 h-3" />
                        {consistencyLevel}
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
                  <h3 className="text-lg font-bold text-white">Coverage Results</h3>
                  <span className="text-sm text-zinc-400">
                    {result.successCount}/{result.totalCount} shots generated
                  </span>
                  <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded capitalize">
                    {stylePreset}
                  </span>
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
                    onClick={() => setResult(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Generate New
                  </button>
                </div>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-3 gap-4">
                {result.shots.map((shot, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl overflow-hidden border ${
                      shot.failed ? 'border-red-500/50 bg-red-950/20' : 'border-zinc-700 bg-zinc-800'
                    }`}
                  >
                    <div className="aspect-video bg-zinc-900 relative">
                      {shot.image ? (
                        <img
                          src={shot.image.url}
                          alt={shot.spec.label}
                          className="w-full h-full object-cover"
                        />
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneCoverageModal;
