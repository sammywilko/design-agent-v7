/**
 * Asset Bank Service for Design Agent V9
 *
 * Save liked images directly to Supabase for social media selection.
 * Browse, filter, and export assets for content creation.
 */

import { getSupabase, TENANT_ID } from './supabase';
import { GeneratedImage } from '../types';

// ============================================
// TYPES
// ============================================

export type EntityType = 'character' | 'location' | 'product' | 'scene' | 'hero' | 'social' | 'other';

export interface AssetBankItem {
  id: string;
  tenant_id: string;
  project_id: string | null;
  project_name: string | null;

  // Image data
  image_url: string;
  thumbnail_url: string | null;

  // Metadata
  entity_type: EntityType;
  entity_name: string | null;
  tags: string[];
  title: string | null;
  description: string | null;

  // Generation context
  prompt_used: string | null;
  model_used: string | null;
  generation_params: Record<string, any> | null;
  aspect_ratio: string | null;

  // Social media tracking
  used_in_posts: string[];
  is_favorite: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface SaveToAssetBankOptions {
  projectId?: string;
  projectName?: string;
  entityType?: EntityType;
  entityName?: string;
  tags?: string[];
  title?: string;
  description?: string;
  isFavorite?: boolean;
}

export interface AssetBankFilter {
  entityType?: EntityType;
  tags?: string[];
  projectId?: string;
  isFavorite?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// CORE OPERATIONS
// ============================================

/**
 * Save an image to the asset bank
 */
export const saveToAssetBank = async (
  image: GeneratedImage,
  options: SaveToAssetBankOptions = {}
): Promise<AssetBankItem | null> => {
  const client = getSupabase();

  try {
    // Use thumbnail if available, otherwise main URL
    const thumbnailUrl = image.thumbnail || image.url;

    const assetData = {
      tenant_id: TENANT_ID,
      project_id: options.projectId || null,
      project_name: options.projectName || null,
      image_url: image.url,
      thumbnail_url: thumbnailUrl,
      entity_type: options.entityType || 'other',
      entity_name: options.entityName || null,
      tags: options.tags || [],
      title: options.title || null,
      description: options.description || null,
      prompt_used: image.prompt || null,
      model_used: image.generationContext?.model || null,
      generation_params: {
        beatId: image.linkedBeatId,
        aspectRatio: image.aspectRatio,
        version: image.version
      },
      aspect_ratio: image.aspectRatio || null,
      used_in_posts: [],
      is_favorite: options.isFavorite || false
    };

    const { data, error } = await client
      .from('asset_bank')
      .insert(assetData)
      .select()
      .single();

    if (error) {
      console.error('Failed to save to asset bank:', error);
      return null;
    }

    console.log('Asset saved to bank:', data.id);
    return data as AssetBankItem;
  } catch (error) {
    console.error('Failed to save to asset bank:', error);
    return null;
  }
};

/**
 * Get all assets from the bank with optional filters
 */
export const getAssets = async (
  filter: AssetBankFilter = {}
): Promise<AssetBankItem[]> => {
  const client = getSupabase();

  try {
    let query = client
      .from('asset_bank')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filter.entityType) {
      query = query.eq('entity_type', filter.entityType);
    }
    if (filter.projectId) {
      query = query.eq('project_id', filter.projectId);
    }
    if (filter.isFavorite !== undefined) {
      query = query.eq('is_favorite', filter.isFavorite);
    }
    if (filter.tags && filter.tags.length > 0) {
      query = query.overlaps('tags', filter.tags);
    }
    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%,entity_name.ilike.%${filter.search}%`);
    }
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get assets:', error);
      return [];
    }

    return (data || []) as AssetBankItem[];
  } catch (error) {
    console.error('Failed to get assets:', error);
    return [];
  }
};

/**
 * Get a single asset by ID
 */
export const getAsset = async (assetId: string): Promise<AssetBankItem | null> => {
  const client = getSupabase();

  try {
    const { data, error } = await client
      .from('asset_bank')
      .select('*')
      .eq('id', assetId)
      .single();

    if (error) {
      console.error('Failed to get asset:', error);
      return null;
    }

    return data as AssetBankItem;
  } catch (error) {
    console.error('Failed to get asset:', error);
    return null;
  }
};

/**
 * Update an asset
 */
export const updateAsset = async (
  assetId: string,
  updates: Partial<Pick<AssetBankItem, 'entity_type' | 'entity_name' | 'tags' | 'title' | 'description' | 'is_favorite' | 'used_in_posts'>>
): Promise<boolean> => {
  const client = getSupabase();

  try {
    const { error } = await client
      .from('asset_bank')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (error) {
      console.error('Failed to update asset:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update asset:', error);
    return false;
  }
};

/**
 * Toggle favorite status
 */
export const toggleFavorite = async (assetId: string): Promise<boolean> => {
  const asset = await getAsset(assetId);
  if (!asset) return false;

  return updateAsset(assetId, { is_favorite: !asset.is_favorite });
};

/**
 * Add tags to an asset
 */
export const addTags = async (assetId: string, newTags: string[]): Promise<boolean> => {
  const asset = await getAsset(assetId);
  if (!asset) return false;

  const updatedTags = [...new Set([...asset.tags, ...newTags])];
  return updateAsset(assetId, { tags: updatedTags });
};

/**
 * Remove tags from an asset
 */
export const removeTags = async (assetId: string, tagsToRemove: string[]): Promise<boolean> => {
  const asset = await getAsset(assetId);
  if (!asset) return false;

  const updatedTags = asset.tags.filter(tag => !tagsToRemove.includes(tag));
  return updateAsset(assetId, { tags: updatedTags });
};

/**
 * Delete an asset from the bank
 */
export const deleteAsset = async (assetId: string): Promise<boolean> => {
  const client = getSupabase();

  try {
    const { error } = await client
      .from('asset_bank')
      .delete()
      .eq('id', assetId);

    if (error) {
      console.error('Failed to delete asset:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete asset:', error);
    return false;
  }
};

/**
 * Mark asset as used in a social post
 */
export const markUsedInPost = async (
  assetId: string,
  postId: string
): Promise<boolean> => {
  const asset = await getAsset(assetId);
  if (!asset) return false;

  const usedInPosts = [...new Set([...asset.used_in_posts, postId])];
  return updateAsset(assetId, { used_in_posts: usedInPosts });
};

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Save multiple images to the asset bank
 */
export const saveMultipleToAssetBank = async (
  images: GeneratedImage[],
  options: SaveToAssetBankOptions = {}
): Promise<AssetBankItem[]> => {
  const results: AssetBankItem[] = [];

  for (const image of images) {
    const saved = await saveToAssetBank(image, options);
    if (saved) {
      results.push(saved);
    }
  }

  return results;
};

/**
 * Delete multiple assets
 */
export const deleteMultipleAssets = async (assetIds: string[]): Promise<number> => {
  let deleted = 0;

  for (const id of assetIds) {
    if (await deleteAsset(id)) {
      deleted++;
    }
  }

  return deleted;
};

// ============================================
// STATISTICS
// ============================================

/**
 * Get asset bank statistics
 */
export const getAssetBankStats = async (): Promise<{
  total: number;
  byType: Record<EntityType, number>;
  favorites: number;
  usedInPosts: number;
}> => {
  const client = getSupabase();

  try {
    const { data, error } = await client
      .from('asset_bank')
      .select('id, entity_type, is_favorite, used_in_posts')
      .eq('tenant_id', TENANT_ID);

    if (error || !data) {
      return { total: 0, byType: {} as Record<EntityType, number>, favorites: 0, usedInPosts: 0 };
    }

    const byType: Record<string, number> = {};
    let favorites = 0;
    let usedInPosts = 0;

    data.forEach((item: any) => {
      byType[item.entity_type] = (byType[item.entity_type] || 0) + 1;
      if (item.is_favorite) favorites++;
      if (item.used_in_posts?.length > 0) usedInPosts++;
    });

    return {
      total: data.length,
      byType: byType as Record<EntityType, number>,
      favorites,
      usedInPosts
    };
  } catch (error) {
    console.error('Failed to get stats:', error);
    return { total: 0, byType: {} as Record<EntityType, number>, favorites: 0, usedInPosts: 0 };
  }
};

/**
 * Get all unique tags in the asset bank
 */
export const getAllTags = async (): Promise<string[]> => {
  const client = getSupabase();

  try {
    const { data, error } = await client
      .from('asset_bank')
      .select('tags')
      .eq('tenant_id', TENANT_ID);

    if (error || !data) return [];

    const allTags = new Set<string>();
    data.forEach((item: any) => {
      (item.tags || []).forEach((tag: string) => allTags.add(tag));
    });

    return Array.from(allTags).sort();
  } catch (error) {
    console.error('Failed to get tags:', error);
    return [];
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  saveToAssetBank,
  saveMultipleToAssetBank,
  getAssets,
  getAsset,
  updateAsset,
  deleteAsset,
  deleteMultipleAssets,
  toggleFavorite,
  addTags,
  removeTags,
  markUsedInPost,
  getAssetBankStats,
  getAllTags
};
