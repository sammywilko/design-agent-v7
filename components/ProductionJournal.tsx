import React, { useState, useEffect } from 'react';
import {
  X, BookOpen, CheckCircle, XCircle, Clock, AlertTriangle,
  Image, Pencil, Grid, Film, Filter, Search, Trash2,
  ChevronDown, ChevronUp, Star, MessageSquare
} from 'lucide-react';
import { ProductionLogEntry } from '../types';
import { db } from '../services/db';

interface ProductionJournalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const STAGE_COLORS: Record<string, string> = {
  script: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  concept: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  edit: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  storyboard: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  video: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

const OUTCOME_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  success: { icon: CheckCircle, color: 'text-emerald-400' },
  failed: { icon: XCircle, color: 'text-red-400' },
  partial: { icon: AlertTriangle, color: 'text-amber-400' },
  pending: { icon: Clock, color: 'text-zinc-400' },
};

const ACTION_LABELS: Record<string, string> = {
  generate: 'Generated',
  edit: 'Edited',
  regenerate: 'Regenerated',
  contact_sheet: 'Contact Sheet',
  coverage: 'Coverage',
  delete: 'Deleted',
  accept: 'Accepted',
};

const ProductionJournal: React.FC<ProductionJournalProps> = ({ isOpen, onClose, projectId }) => {
  const [entries, setEntries] = useState<ProductionLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, byStage: {} as Record<string, number> });

  useEffect(() => {
    if (isOpen && projectId) {
      loadEntries();
    }
  }, [isOpen, projectId]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const [logEntries, logStats] = await Promise.all([
        db.getProductionLog(projectId),
        db.getProductionLogStats(projectId)
      ]);
      setEntries(logEntries);
      setStats(logStats);
    } catch (error) {
      console.error('Failed to load production log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await db.deleteProductionLogEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (filter === 'success' && entry.outcome !== 'success') return false;
    if (filter === 'failed' && entry.outcome !== 'failed') return false;
    if (stageFilter !== 'all' && entry.stage !== stageFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        entry.subject?.toLowerCase().includes(search) ||
        entry.prompt?.toLowerCase().includes(search) ||
        entry.notes?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] bg-zinc-900 border border-zinc-700 rounded-xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-violet-600 rounded-lg md:rounded-xl">
              <BookOpen className="w-4 md:w-5 h-4 md:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white">Production Journal</h2>
              <p className="text-[10px] md:text-xs text-zinc-500 hidden sm:block">Generation history & domain memory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-4 md:px-6 py-2 md:py-3 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3 md:gap-6 flex-wrap">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-xl md:text-2xl font-bold text-white">{stats.total}</span>
              <span className="text-[10px] md:text-xs text-zinc-500">Total</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <CheckCircle className="w-3 md:w-4 h-3 md:h-4 text-emerald-400" />
              <span className="text-xs md:text-sm font-medium text-emerald-400">{stats.success}</span>
              <span className="text-[10px] md:text-xs text-zinc-500 hidden sm:inline">Success</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <XCircle className="w-3 md:w-4 h-3 md:h-4 text-red-400" />
              <span className="text-xs md:text-sm font-medium text-red-400">{stats.failed}</span>
              <span className="text-[10px] md:text-xs text-zinc-500 hidden sm:inline">Failed</span>
            </div>
            <div className="flex-1" />
            <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
              {Object.entries(stats.byStage).map(([stage, count]) => (
                <span key={stage} className={`px-2 py-0.5 rounded border ${STAGE_COLORS[stage] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {stage}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 md:px-6 py-2 md:py-3 border-b border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500 hidden sm:block" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'success' | 'failed')}
              className="flex-1 sm:flex-none px-2 md:px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs md:text-sm text-white focus:outline-none focus:border-violet-500"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="flex-1 sm:flex-none px-2 md:px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs md:text-sm text-white focus:outline-none focus:border-violet-500"
            >
              <option value="all">All Stages</option>
              <option value="concept">Concept</option>
              <option value="edit">Edit</option>
              <option value="storyboard">Storyboard</option>
              <option value="video">Video</option>
            </select>
          </div>
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
              <BookOpen className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No entries yet</p>
              <p className="text-xs mt-1">Generation history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredEntries.map((entry) => {
                const OutcomeIcon = OUTCOME_ICONS[entry.outcome]?.icon || Clock;
                const outcomeColor = OUTCOME_ICONS[entry.outcome]?.color || 'text-zinc-400';
                const isExpanded = expandedEntry === entry.id;

                return (
                  <div key={entry.id} className="hover:bg-zinc-800/50 transition-colors">
                    <div
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Stage Badge */}
                        <div className={`px-2 py-1 rounded text-xs font-medium border shrink-0 ${STAGE_COLORS[entry.stage] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                          {entry.stage}
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">
                              {ACTION_LABELS[entry.action] || entry.action}
                            </span>
                            {entry.beatNumber !== undefined && (
                              <span className="text-xs text-zinc-500">Beat {entry.beatNumber + 1}</span>
                            )}
                            {entry.shotNumber !== undefined && (
                              <span className="text-xs text-zinc-500">Shot {entry.shotNumber + 1}</span>
                            )}
                            {entry.shotType && (
                              <span className="text-xs px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                                {entry.shotType}
                              </span>
                            )}
                          </div>

                          {entry.subject && (
                            <p className="text-sm text-zinc-400 truncate">{entry.subject}</p>
                          )}

                          {/* References Used */}
                          {entry.references && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {entry.references.characters?.length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                                  {entry.references.characters.length} character{entry.references.characters.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {entry.references.locations?.length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                                  {entry.references.locations.length} location{entry.references.locations.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {entry.references.products?.length > 0 && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                                  {entry.references.products.length} product{entry.references.products.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {entry.references.moodboard && (
                                <span className="text-xs px-1.5 py-0.5 bg-pink-500/10 text-pink-400 rounded">Moodboard</span>
                              )}
                              {entry.references.lookbook && (
                                <span className="text-xs px-1.5 py-0.5 bg-violet-500/10 text-violet-400 rounded">Lookbook</span>
                              )}
                              {entry.references.lightingRig && (
                                <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded">Lighting</span>
                              )}
                              {entry.references.cameraRig && (
                                <span className="text-xs px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">Camera</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right Side - Outcome & Time */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className={`flex items-center gap-1 ${outcomeColor}`}>
                            <OutcomeIcon className="w-4 h-4" />
                            <span className="text-xs capitalize">{entry.outcome}</span>
                          </div>
                          <span className="text-xs text-zinc-600">{formatTimestamp(entry.timestamp)}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-zinc-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-6 pb-4 border-t border-zinc-800 bg-zinc-900/50">
                        <div className="pt-4 space-y-3">
                          {/* Prompt */}
                          {entry.prompt && (
                            <div>
                              <label className="text-xs text-zinc-500 uppercase tracking-wider">Prompt</label>
                              <p className="mt-1 text-sm text-zinc-300 bg-zinc-800 p-3 rounded-lg max-h-32 overflow-y-auto">
                                {entry.prompt}
                              </p>
                            </div>
                          )}

                          {/* Error Message */}
                          {entry.errorMessage && (
                            <div>
                              <label className="text-xs text-red-400 uppercase tracking-wider">Error</label>
                              <p className="mt-1 text-sm text-red-300 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                {entry.errorMessage}
                              </p>
                            </div>
                          )}

                          {/* Notes */}
                          {entry.notes && (
                            <div>
                              <label className="text-xs text-zinc-500 uppercase tracking-wider">Notes</label>
                              <p className="mt-1 text-sm text-zinc-300">{entry.notes}</p>
                            </div>
                          )}

                          {/* Rating */}
                          {entry.rating && (
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-zinc-500 uppercase tracking-wider">Rating</label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${star <= entry.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full Reference List */}
                          {entry.references && (
                            <div>
                              <label className="text-xs text-zinc-500 uppercase tracking-wider">References Used</label>
                              <div className="mt-1 text-sm text-zinc-400 space-y-1">
                                {entry.references.characters?.length > 0 && (
                                  <p>Characters: {entry.references.characters.join(', ')}</p>
                                )}
                                {entry.references.locations?.length > 0 && (
                                  <p>Locations: {entry.references.locations.join(', ')}</p>
                                )}
                                {entry.references.products?.length > 0 && (
                                  <p>Products: {entry.references.products.join(', ')}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEntry(entry.id);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Showing {filteredEntries.length} of {entries.length} entries
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionJournal;
