/**
 * AssetBankPanel - Save and browse assets for social media
 *
 * Features:
 * - One-click save to asset bank
 * - Browse saved assets
 * - Filter by type, tags, favorites
 * - Quick export for social
 */

import React, { useState, useEffect } from 'react';
import {
  Heart,
  HeartOff,
  Download,
  Tag,
  Trash2,
  X,
  Search,
  Filter,
  ImagePlus,
  Loader2,
  CheckCircle,
  FolderOpen,
  Star,
  Copy,
  ExternalLink
} from 'lucide-react';
import { GeneratedImage } from '../types';
import {
  saveToAssetBank,
  getAssets,
  toggleFavorite,
  deleteAsset,
  addTags,
  AssetBankItem,
  EntityType,
  AssetBankFilter
} from '../services/assetBankService';

// ============================================
// SAVE TO BANK BUTTON (use anywhere)
// ============================================

interface SaveToAssetBankButtonProps {
  image: GeneratedImage;
  projectId?: string;
  projectName?: string;
  onSaved?: (asset: AssetBankItem) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SaveToAssetBankButton: React.FC<SaveToAssetBankButtonProps> = ({
  image,
  projectId,
  projectName,
  onSaved,
  size = 'md',
  className = ''
}) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedType, setSelectedType] = useState<EntityType>('hero');
  const [tags, setTags] = useState('');

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const handleQuickSave = async () => {
    setSaving(true);
    try {
      const asset = await saveToAssetBank(image, {
        projectId,
        projectName,
        entityType: 'hero',
        tags: ['quick-save']
      });
      if (asset) {
        setSaved(true);
        onSaved?.(asset);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWithOptions = async () => {
    setSaving(true);
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      const asset = await saveToAssetBank(image, {
        projectId,
        projectName,
        entityType: selectedType,
        tags: tagArray
      });
      if (asset) {
        setSaved(true);
        setShowOptions(false);
        onSaved?.(asset);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Save Button */}
      <button
        onClick={handleQuickSave}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowOptions(true);
        }}
        disabled={saving}
        className={`
          ${sizeClasses[size]}
          rounded-lg transition-all
          ${saved
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30 hover:border-violet-500/50'
          }
          disabled:opacity-50
        `}
        title="Save to Asset Bank (right-click for options)"
      >
        {saving ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : saved ? (
          <CheckCircle className={iconSizes[size]} />
        ) : (
          <ImagePlus className={iconSizes[size]} />
        )}
      </button>

      {/* Options Popup */}
      {showOptions && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-slate-800 rounded-xl border border-white/10 p-4 shadow-2xl min-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Save to Asset Bank</h4>
            <button onClick={() => setShowOptions(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Entity Type */}
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <div className="flex flex-wrap gap-1">
              {(['character', 'location', 'product', 'scene', 'hero', 'social'] as EntityType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`
                    px-2 py-1 text-xs rounded capitalize transition-all
                    ${selectedType === type
                      ? 'bg-violet-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="linkedin, banner, hero..."
              className="w-full px-3 py-2 bg-slate-900/50 rounded-lg border border-white/10 text-sm focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSaveWithOptions}
            disabled={saving}
            className="w-full py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save to Bank'}
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// ASSET BANK BROWSER PANEL
// ============================================

interface AssetBankPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: AssetBankItem) => void;
  projectId?: string; // Filter to specific project
}

const AssetBankPanel: React.FC<AssetBankPanelProps> = ({
  isOpen,
  onClose,
  onSelectAsset,
  projectId
}) => {
  const [assets, setAssets] = useState<AssetBankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<AssetBankFilter>({ limit: 50 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<EntityType | 'all'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Load assets
  const loadAssets = async () => {
    setLoading(true);
    try {
      const filterOptions: AssetBankFilter = {
        ...filter,
        projectId: projectId,
        entityType: selectedType === 'all' ? undefined : selectedType,
        isFavorite: showFavoritesOnly ? true : undefined,
        search: searchQuery || undefined
      };
      const result = await getAssets(filterOptions);
      setAssets(result);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen, selectedType, showFavoritesOnly, projectId]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      loadAssets();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleToggleFavorite = async (assetId: string) => {
    await toggleFavorite(assetId);
    loadAssets();
  };

  const handleDelete = async (assetId: string) => {
    if (confirm('Delete this asset from the bank?')) {
      await deleteAsset(assetId);
      loadAssets();
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleDownload = (asset: AssetBankItem) => {
    const link = document.createElement('a');
    link.href = asset.image_url;
    link.download = `asset-${asset.id.slice(0, 8)}.png`;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-slate-900 border-l border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Asset Bank</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 rounded-lg border border-white/10 text-sm focus:border-violet-500/50 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as EntityType | 'all')}
              className="px-3 py-1.5 bg-slate-800/50 rounded-lg border border-white/10 text-sm focus:border-violet-500/50 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="character">Characters</option>
              <option value="location">Locations</option>
              <option value="product">Products</option>
              <option value="scene">Scenes</option>
              <option value="hero">Hero Shots</option>
              <option value="social">Social</option>
            </select>

            {/* Favorites Toggle */}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all
                ${showFavoritesOnly
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800/50 text-slate-400 border border-white/10 hover:border-white/20'
                }
              `}
            >
              <Star className="w-3.5 h-3.5" />
              Favorites
            </button>

            {/* Refresh */}
            <button
              onClick={loadAssets}
              disabled={loading}
              className="p-1.5 bg-slate-800/50 text-slate-400 rounded-lg border border-white/10 hover:border-white/20 disabled:opacity-50"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Asset Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && assets.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No assets found</p>
              <p className="text-sm mt-1">Save images to build your library</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative bg-slate-800/50 rounded-xl overflow-hidden border border-white/5 hover:border-violet-500/30 transition-all"
                >
                  {/* Image */}
                  <div
                    className="aspect-video bg-slate-900 cursor-pointer"
                    onClick={() => onSelectAsset?.(asset)}
                  >
                    <img
                      src={asset.thumbnail_url || asset.image_url}
                      alt={asset.title || 'Asset'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Favorite Badge */}
                  {asset.is_favorite && (
                    <div className="absolute top-2 left-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className="absolute top-2 right-2">
                    <span className="px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[10px] text-white capitalize">
                      {asset.entity_type}
                    </span>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleToggleFavorite(asset.id)}
                      className="p-2 bg-slate-700/80 rounded-lg hover:bg-slate-600 transition-colors"
                      title={asset.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {asset.is_favorite ? (
                        <HeartOff className="w-4 h-4 text-slate-300" />
                      ) : (
                        <Heart className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(asset)}
                      className="p-2 bg-slate-700/80 rounded-lg hover:bg-slate-600 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-slate-300" />
                    </button>
                    <button
                      onClick={() => handleCopyUrl(asset.image_url)}
                      className="p-2 bg-slate-700/80 rounded-lg hover:bg-slate-600 transition-colors"
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4 text-slate-300" />
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    {asset.project_name && (
                      <p className="text-[10px] text-slate-500 truncate">{asset.project_name}</p>
                    )}
                    {asset.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {asset.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1 py-0.5 bg-slate-700/50 rounded text-[9px] text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-white/10 text-center text-sm text-slate-500">
          {assets.length} assets in bank
        </div>
      </div>
    </div>
  );
};

export default AssetBankPanel;
