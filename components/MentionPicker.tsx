/**
 * MentionPicker Component
 * Autocomplete dropdown for @mentions - works with characters, locations, styles, products
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, MapPin, Palette, Package, X, Plus, Loader2 } from 'lucide-react';
import { mentionService, SharedAsset, AssetType, CreateAssetInput } from '../services/mentionService';

interface MentionPickerProps {
  /** Triggered when user selects an asset */
  onSelect: (asset: SharedAsset) => void;
  /** Filter by asset type (optional) */
  filterType?: AssetType;
  /** Placeholder text for search */
  placeholder?: string;
  /** Allow creating new assets */
  allowCreate?: boolean;
  /** Current project ID for new assets */
  projectId?: string;
  /** Close handler */
  onClose?: () => void;
  /** Position (for dropdown positioning) */
  position?: { top: number; left: number };
}

const ASSET_ICONS: Record<AssetType, React.ReactNode> = {
  character: <User className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  style: <Palette className="w-4 h-4" />,
  product: <Package className="w-4 h-4" />,
  project: <Package className="w-4 h-4" />
};

const ASSET_COLORS: Record<AssetType, string> = {
  character: 'text-purple-400',
  location: 'text-green-400',
  style: 'text-pink-400',
  product: 'text-yellow-400',
  project: 'text-blue-400'
};

export const MentionPicker: React.FC<MentionPickerProps> = ({
  onSelect,
  filterType,
  placeholder = 'Search @mentions...',
  allowCreate = true,
  projectId,
  onClose,
  position
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SharedAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createType, setCreateType] = useState<AssetType>('character');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Search when query changes
  useEffect(() => {
    const searchAssets = async () => {
      if (query.length === 0) {
        // Show recent/popular when no query
        setIsLoading(true);
        const popular = await mentionService.search('', filterType);
        setResults(popular.slice(0, 8));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const assets = await mentionService.search(query, filterType);
      setResults(assets);
      setIsLoading(false);
      setSelectedIndex(0);
    };

    const debounce = setTimeout(searchAssets, 200);
    return () => clearTimeout(debounce);
  }, [query, filterType]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelect(results[selectedIndex]);
          onClose?.();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose?.();
        break;
    }
  }, [results, selectedIndex, onSelect, onClose]);

  // Create new asset
  const handleCreate = async (name: string, type: AssetType) => {
    const handle = mentionService.generateHandle(name);

    const input: CreateAssetInput = {
      asset_type: type,
      handle,
      name,
      source_app: 'design-agent',
      source_project_id: projectId
    };

    const asset = await mentionService.upsert(input);
    if (asset) {
      onSelect(asset);
      onClose?.();
    }
  };

  const containerStyle: React.CSSProperties = position ? {
    position: 'absolute',
    top: position.top,
    left: position.left,
    zIndex: 50
  } : {};

  return (
    <div
      ref={containerRef}
      className="w-80 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl overflow-hidden"
      style={containerStyle}
    >
      {/* Search Input */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <Search className="w-4 h-4 text-white/40" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
        />
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white/60">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <ul>
            {results.map((asset, index) => (
              <li key={asset.id}>
                <button
                  onClick={() => {
                    onSelect(asset);
                    onClose?.();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {/* Icon */}
                  <div className={`${ASSET_COLORS[asset.asset_type]}`}>
                    {ASSET_ICONS[asset.asset_type]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      @{asset.handle}
                    </div>
                    <div className="text-white/50 text-xs truncate">
                      {asset.name}
                    </div>
                  </div>

                  {/* Thumbnail */}
                  {asset.reference_images?.[0]?.url && (
                    <img
                      src={asset.reference_images[0].url}
                      alt=""
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}

                  {/* Source badge */}
                  <span className="text-[10px] text-white/30 uppercase">
                    {asset.source_app.split('-')[0]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.length > 0 ? (
          <div className="p-4 text-center text-white/40 text-sm">
            No results for "@{query}"
          </div>
        ) : (
          <div className="p-4 text-center text-white/40 text-sm">
            Type to search @mentions
          </div>
        )}
      </div>

      {/* Create New */}
      {allowCreate && (
        <div className="border-t border-white/10">
          {showCreateForm ? (
            <div className="p-3 space-y-2">
              {/* Type selector */}
              <div className="flex gap-1">
                {(['character', 'location', 'style', 'product'] as AssetType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setCreateType(type)}
                    className={`flex-1 px-2 py-1 text-xs rounded ${
                      createType === type
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Name input */}
              <input
                type="text"
                placeholder={`New ${createType} name...`}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm outline-none focus:border-white/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    handleCreate(e.currentTarget.value.trim(), createType);
                  }
                }}
              />

              <button
                onClick={() => setShowCreateForm(false)}
                className="w-full px-3 py-1.5 text-xs text-white/50 hover:text-white/70"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create new @mention
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Hook to detect @ trigger in text input
 */
export function useMentionTrigger(inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>) {
  const [isTriggered, setIsTriggered] = useState(false);
  const [triggerPosition, setTriggerPosition] = useState<{ top: number; left: number } | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = () => {
      const value = input.value;
      const cursorPos = input.selectionStart || 0;

      // Find @ before cursor
      const beforeCursor = value.slice(0, cursorPos);
      const atMatch = beforeCursor.match(/@(\w*)$/);

      if (atMatch) {
        setIsTriggered(true);
        setQuery(atMatch[1]);

        // Calculate dropdown position
        const rect = input.getBoundingClientRect();
        setTriggerPosition({
          top: rect.bottom + 4,
          left: rect.left
        });
      } else {
        setIsTriggered(false);
        setQuery('');
        setTriggerPosition(null);
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('keyup', handleInput);

    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keyup', handleInput);
    };
  }, [inputRef]);

  const insertMention = useCallback((asset: SharedAsset) => {
    const input = inputRef.current;
    if (!input) return;

    const value = input.value;
    const cursorPos = input.selectionStart || 0;

    // Find and replace @query with @handle
    const beforeCursor = value.slice(0, cursorPos);
    const afterCursor = value.slice(cursorPos);
    const newBefore = beforeCursor.replace(/@\w*$/, `@${asset.handle} `);

    input.value = newBefore + afterCursor;

    // Move cursor after mention
    const newPos = newBefore.length;
    input.setSelectionRange(newPos, newPos);
    input.focus();

    // Trigger input event for React
    input.dispatchEvent(new Event('input', { bubbles: true }));

    setIsTriggered(false);
    setQuery('');
    setTriggerPosition(null);
  }, [inputRef]);

  return {
    isTriggered,
    triggerPosition,
    query,
    insertMention,
    close: () => {
      setIsTriggered(false);
      setQuery('');
      setTriggerPosition(null);
    }
  };
}

export default MentionPicker;
