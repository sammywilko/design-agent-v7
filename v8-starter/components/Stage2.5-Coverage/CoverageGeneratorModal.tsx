// components/Stage2.5-Coverage/CoverageGeneratorModal.tsx
// Modal for generating coverage packs for entities

import React, { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, Download } from 'lucide-react';
import { CoveragePackSelector } from './CoveragePackSelector';
import { generateCoverageLibrary, retryFailedAngles } from '../../services/coverageGenerationService';
import { CoverageLibrary, CoverageAngle, EntityType } from '../../types/coverage';
import { CharacterProfile, LocationProfile, ProductProfile } from '../../../types';
import { COVERAGE_PACKS } from '../../constants/coveragePacks';
import JSZip from 'jszip';

interface CoverageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: CharacterProfile | LocationProfile | ProductProfile;
  entityType: EntityType;
  generateImageFn: (prompt: string, referenceImages?: string[], aspectRatio?: string) => Promise<string>;
  onComplete?: (library: CoverageLibrary) => void;
}

export const CoverageGeneratorModal: React.FC<CoverageGeneratorModalProps> = ({
  isOpen,
  onClose,
  entity,
  entityType,
  generateImageFn,
  onComplete
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string>('contactSheet');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentAngle, setCurrentAngle] = useState<string>('');
  const [library, setLibrary] = useState<CoverageLibrary | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPack = COVERAGE_PACKS[selectedPackId];
  const entityName = 'name' in entity ? entity.name : 'Entity';

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setCompletedCount(0);
    setTotalCount(selectedPack?.shots || 0);

    try {
      const result = await generateCoverageLibrary(
        {
          entityId: entity.id,
          entityType,
          entity,
          packId: selectedPackId,
          options: {
            resolution: '2K',
            maxConcurrent: 5
          },
          onProgress: (prog, completed, total) => {
            setProgress(prog);
            setCompletedCount(completed);
            setTotalCount(total);
          },
          onAngleComplete: (angle) => {
            setCurrentAngle(`${angle.type} - ${angle.angle}`);
          }
        },
        generateImageFn
      );

      setLibrary(result);
      onComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!library) return;

    setIsGenerating(true);
    setError(null);

    try {
      const updatedLibrary = await retryFailedAngles(library, generateImageFn);
      setLibrary(updatedLibrary);
      onComplete?.(updatedLibrary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAll = async () => {
    if (!library) return;

    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const successfulAngles = library.angles.filter(a => a.status === 'success' && a.imageUrl);

      // Add each image to the zip
      for (let i = 0; i < successfulAngles.length; i++) {
        const angle = successfulAngles[i];
        const paddedIndex = String(i + 1).padStart(2, '0');
        const sanitizedType = angle.type.toLowerCase().replace(/\s+/g, '-');
        const sanitizedAngle = angle.angle.toLowerCase().replace(/\s+/g, '-');
        const filename = `${paddedIndex}-${sanitizedType}-${sanitizedAngle}.png`;

        // Convert base64 or fetch URL to blob
        let imageData: Blob;
        if (angle.imageUrl.startsWith('data:')) {
          // Base64 image
          const base64Data = angle.imageUrl.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          imageData = new Blob([bytes], { type: 'image/png' });
        } else {
          // URL - fetch it
          const response = await fetch(angle.imageUrl);
          imageData = await response.blob();
        }

        zip.file(filename, imageData);
      }

      // Add metadata JSON
      const metadata = {
        entityName: library.entityName,
        entityType: library.entityType,
        packName: library.packName,
        generatedAt: library.createdAt,
        totalAngles: library.angles.length,
        successfulAngles: library.generatedAngles,
        failedAngles: library.failedAngles,
        generationTime: library.metadata?.totalTime,
        angles: successfulAngles.map((angle, i) => ({
          index: i + 1,
          filename: `${String(i + 1).padStart(2, '0')}-${angle.type.toLowerCase().replace(/\s+/g, '-')}-${angle.angle.toLowerCase().replace(/\s+/g, '-')}.png`,
          type: angle.type,
          angle: angle.angle,
          description: angle.description,
          category: angle.category
        }))
      };

      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Generate and download
      const blob = await zip.generateAsync({ type: 'blob' });
      const sanitizedEntityName = entityName.toLowerCase().replace(/\s+/g, '-');
      const sanitizedPackName = library.packName.toLowerCase().replace(/\s+/g, '-');
      const downloadName = `${sanitizedEntityName}-${sanitizedPackName}-pack.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to create download');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">Generate Coverage Pack</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {entityType.charAt(0).toUpperCase() + entityType.slice(1)}: {entityName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!library && !isGenerating && (
            <CoveragePackSelector
              entityType={entityType}
              onSelectPack={setSelectedPackId}
              selectedPackId={selectedPackId}
            />
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Generating Coverage Pack
              </h3>
              <p className="text-zinc-400 mb-4">
                {currentAngle || 'Starting...'}
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-zinc-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-zinc-500 mt-2">
                {completedCount} / {totalCount} angles complete ({progress}%)
              </p>
            </div>
          )}

          {/* Results */}
          {library && !isGenerating && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl">
                {library.failedAngles === 0 ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {library.packName} Complete
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {library.generatedAngles} successful, {library.failedAngles} failed
                    {library.metadata?.totalTime && ` - ${library.metadata.totalTime}s total`}
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  {library.failedAngles > 0 && (
                    <button
                      onClick={handleRetryFailed}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Retry Failed ({library.failedAngles})
                    </button>
                  )}
                  <button
                    onClick={handleDownloadAll}
                    disabled={isDownloading || library.generatedAngles === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {isDownloading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Zipping...</>
                    ) : (
                      <><Download className="w-4 h-4" /> Download All ({library.generatedAngles})</>
                    )}
                  </button>
                </div>
              </div>

              {/* Angle Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {library.angles.map((angle) => (
                  <AngleCard key={angle.id} angle={angle} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            {library ? 'Close' : 'Cancel'}
          </button>
          {!library && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedPackId}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Generate {selectedPack?.shots || 0} Angles
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Angle Card Component
interface AngleCardProps {
  angle: CoverageAngle;
}

const AngleCard: React.FC<AngleCardProps> = ({ angle }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div
        className={`rounded-xl overflow-hidden border transition-all cursor-pointer ${
          angle.status === 'success'
            ? 'border-zinc-700 hover:border-zinc-500'
            : 'border-red-500/30 bg-red-500/5'
        }`}
        onClick={() => angle.status === 'success' && setIsExpanded(true)}
      >
        {angle.status === 'success' && angle.imageUrl ? (
          <img
            src={angle.imageUrl}
            alt={`${angle.type} - ${angle.angle}`}
            className="w-full aspect-square object-cover"
          />
        ) : (
          <div className="w-full aspect-square bg-zinc-800 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        )}
        <div className="p-2 bg-zinc-800/50">
          <p className="text-[10px] font-medium text-white truncate">{angle.type}</p>
          <p className="text-[9px] text-zinc-500 truncate">{angle.angle}</p>
        </div>
      </div>

      {/* Expanded View Modal */}
      {isExpanded && angle.imageUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-8"
          onClick={() => setIsExpanded(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute -top-12 right-0 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={angle.imageUrl}
              alt={`${angle.type} - ${angle.angle}`}
              className="w-full rounded-xl shadow-2xl"
            />
            <div className="mt-4 text-center">
              <p className="text-white font-medium">{angle.type} - {angle.angle}</p>
              <p className="text-zinc-500 text-sm mt-1">{angle.description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CoverageGeneratorModal;
