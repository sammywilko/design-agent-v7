import React, { useState } from 'react';
import { X, Grid, Loader2, Download, CheckCircle, XCircle, Camera, MessageSquare, Zap } from 'lucide-react';
import { generateContactSheet, generateCoveragePack, ContactSheetResult, CONTACT_SHEET_12, COVERAGE_PACK_DIALOGUE, COVERAGE_PACK_ACTION } from '../services/gemini';
import { ReferenceAsset, GenerationConfig, GeneratedImage } from '../types';
import JSZip from 'jszip';

interface ContactSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  references: ReferenceAsset[];
  config: GenerationConfig;
  onImagesGenerated?: (images: GeneratedImage[]) => void;
  showNotification: (msg: string) => void;
}

type GeneratorMode = 'contact-sheet' | 'dialogue' | 'action';

const ContactSheetModal: React.FC<ContactSheetModalProps> = ({
  isOpen,
  onClose,
  references,
  config,
  onImagesGenerated,
  showNotification
}) => {
  const [mode, setMode] = useState<GeneratorMode>('contact-sheet');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [sceneContext, setSceneContext] = useState('Cinematic scene with dramatic lighting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, current: '' });
  const [result, setResult] = useState<ContactSheetResult | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!subjectDescription.trim()) {
      showNotification('Please enter a subject description');
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setProgress({ completed: 0, total: mode === 'contact-sheet' ? 12 : 5, current: 'Starting...' });

    try {
      let contactResult: ContactSheetResult;

      if (mode === 'contact-sheet') {
        contactResult = await generateContactSheet(
          subjectDescription,
          sceneContext,
          references,
          config,
          (completed, total, current) => {
            setProgress({ completed, total, current });
          }
        );
      } else {
        contactResult = await generateCoveragePack(
          mode === 'dialogue' ? 'dialogue' : 'action',
          subjectDescription,
          sceneContext,
          references,
          config,
          (completed, total, current) => {
            setProgress({ completed, total, current });
          }
        );
      }

      setResult(contactResult);

      // Collect successful images and send to parent
      const successfulImages = contactResult.shots
        .filter(s => s.image)
        .map(s => s.image!);

      if (successfulImages.length > 0 && onImagesGenerated) {
        onImagesGenerated(successfulImages);
      }

      showNotification(`Generated ${contactResult.successCount}/${contactResult.totalCount} shots`);
    } catch (error) {
      console.error('Contact sheet generation failed:', error);
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
        const filename = `${String(idx + 1).padStart(2, '0')}_${shot.type.replace(/\s+/g, '_')}_${shot.angle.replace(/\s+/g, '_')}.png`;
        zip.file(filename, base64Data, { base64: true });
      }
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode}_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getModeConfig = () => {
    switch (mode) {
      case 'contact-sheet':
        return { shots: CONTACT_SHEET_12, label: '12-Shot Contact Sheet', icon: Grid, color: 'violet' };
      case 'dialogue':
        return { shots: COVERAGE_PACK_DIALOGUE, label: 'Dialogue Coverage (5 shots)', icon: MessageSquare, color: 'blue' };
      case 'action':
        return { shots: COVERAGE_PACK_ACTION, label: 'Action Coverage (5 shots)', icon: Zap, color: 'orange' };
    }
  };

  const modeConfig = getModeConfig();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-violet-400" />
              Professional Coverage Generator
            </h2>
            <p className="text-sm text-zinc-500 mt-1">Generate industry-standard shot coverage</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-4 border-b border-zinc-800 flex gap-2">
          {[
            { id: 'contact-sheet' as GeneratorMode, label: '12-Shot Grid', icon: Grid, shots: 12 },
            { id: 'dialogue' as GeneratorMode, label: 'Dialogue Pack', icon: MessageSquare, shots: 5 },
            { id: 'action' as GeneratorMode, label: 'Action Pack', icon: Zap, shots: 5 }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setResult(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m.id
                  ? 'bg-violet-600 text-white'
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
          {!result ? (
            <div className="space-y-6">
              {/* Shot Preview Grid */}
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3">Shot List Preview</h3>
                <div className={`grid gap-2 ${mode === 'contact-sheet' ? 'grid-cols-4' : 'grid-cols-5'}`}>
                  {modeConfig.shots.map((shot, idx) => (
                    <div key={idx} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-2 text-center">
                      <div className="text-[10px] font-bold text-violet-400">{shot.type}</div>
                      <div className="text-[9px] text-zinc-500">{shot.angle}</div>
                    </div>
                  ))}
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
                    {result.successCount}/{result.totalCount} shots generated
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
              <div className={`grid gap-4 ${mode === 'contact-sheet' ? 'grid-cols-4' : 'grid-cols-5'}`}>
                {result.shots.map((shot, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-xl overflow-hidden border ${
                      shot.failed ? 'border-red-500/50 bg-red-950/20' : 'border-zinc-700 bg-zinc-800'
                    }`}
                  >
                    <div className="aspect-video bg-zinc-900">
                      {shot.image ? (
                        <img
                          src={shot.image.url}
                          alt={`${shot.type} ${shot.angle}`}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactSheetModal;
