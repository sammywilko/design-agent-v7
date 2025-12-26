/**
 * Mention Service - Cross-App Asset References
 * Enables @mentions for characters, locations, styles, products across CC apps
 */

import { getSupabase, TENANT_ID } from './supabase';

// ============================================
// TYPES
// ============================================

export type AssetType = 'character' | 'location' | 'style' | 'product' | 'project';
export type SourceApp = 'design-agent' | 'script-engine' | 'director' | 'marketing-suite';

export interface ReferenceImage {
  url: string;
  type: 'reference' | 'generated' | 'uploaded';
  label?: string;
}

export interface SharedAsset {
  id: string;
  tenant_id: string;
  asset_type: AssetType;
  handle: string;
  name: string;
  source_app: SourceApp;
  source_project_id?: string;
  description?: string;
  reference_images: ReferenceImage[];
  metadata: Record<string, any>;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetMention {
  id: string;
  asset_id: string;
  app: SourceApp;
  project_id: string;
  context?: string;
  context_id?: string;
  created_at: string;
}

export interface CreateAssetInput {
  asset_type: AssetType;
  handle: string;
  name: string;
  source_app: SourceApp;
  source_project_id?: string;
  description?: string;
  reference_images?: ReferenceImage[];
  metadata?: Record<string, any>;
}

// ============================================
// MENTION SERVICE
// ============================================

export const mentionService = {
  async search(query: string, type?: AssetType): Promise<SharedAsset[]> {
    const supabase = getSupabase();

    try {
      let queryBuilder = supabase
        .from('shared_assets')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .or(`handle.ilike.%${query}%,name.ilike.%${query}%`);

      if (type) {
        queryBuilder = queryBuilder.eq('asset_type', type);
      }

      const { data, error } = await queryBuilder
        .order('usage_count', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to search assets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to search assets:', error);
      return [];
    }
  },

  async getByHandle(handle: string): Promise<SharedAsset | null> {
    const supabase = getSupabase();

    try {
      const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;

      const { data, error } = await supabase
        .from('shared_assets')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('handle', normalizedHandle)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('Failed to get asset by handle:', error);
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get asset by handle:', error);
      return null;
    }
  },

  async getById(id: string): Promise<SharedAsset | null> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from('shared_assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Failed to get asset by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get asset by ID:', error);
      return null;
    }
  },

  async getByType(type: AssetType): Promise<SharedAsset[]> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from('shared_assets')
        .select('*')
        .eq('tenant_id', TENANT_ID)
        .eq('asset_type', type)
        .order('usage_count', { ascending: false });

      if (error) {
        console.error('Failed to get assets by type:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get assets by type:', error);
      return [];
    }
  },

  async getCharacters(): Promise<SharedAsset[]> {
    return this.getByType('character');
  },

  async getLocations(): Promise<SharedAsset[]> {
    return this.getByType('location');
  },

  async getStyles(): Promise<SharedAsset[]> {
    return this.getByType('style');
  },

  async getProducts(): Promise<SharedAsset[]> {
    return this.getByType('product');
  },

  async upsert(input: CreateAssetInput): Promise<SharedAsset | null> {
    const supabase = getSupabase();

    try {
      const handle = input.handle.startsWith('@')
        ? input.handle.slice(1)
        : input.handle;

      const { data, error } = await supabase
        .from('shared_assets')
        .upsert({
          tenant_id: TENANT_ID,
          asset_type: input.asset_type,
          handle,
          name: input.name,
          source_app: input.source_app,
          source_project_id: input.source_project_id || null,
          description: input.description || null,
          reference_images: input.reference_images || [],
          metadata: input.metadata || {},
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id,handle'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to upsert asset:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to upsert asset:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabase();

    try {
      const { error } = await supabase
        .from('shared_assets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete asset:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete asset:', error);
      return false;
    }
  },

  async recordMention(
    assetId: string,
    app: SourceApp,
    projectId: string,
    context?: string,
    contextId?: string
  ): Promise<boolean> {
    const supabase = getSupabase();

    try {
      const { error: mentionError } = await supabase
        .from('asset_mentions')
        .insert({
          asset_id: assetId,
          app,
          project_id: projectId,
          context: context || null,
          context_id: contextId || null
        });

      if (mentionError) {
        console.error('Failed to record mention:', mentionError);
        return false;
      }

      await supabase.rpc('increment_asset_usage', { p_asset_id: assetId });

      return true;
    } catch (error) {
      console.error('Failed to record mention:', error);
      return false;
    }
  },

  async getMentions(assetId: string): Promise<AssetMention[]> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from('asset_mentions')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get mentions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get mentions:', error);
      return [];
    }
  },

  async parseAndResolve(text: string): Promise<{ text: string; mentions: SharedAsset[] }> {
    const mentionPattern = /@(\w+)/g;
    const handles = [...text.matchAll(mentionPattern)].map(m => m[1]);

    if (handles.length === 0) {
      return { text, mentions: [] };
    }

    const mentions: SharedAsset[] = [];

    for (const handle of handles) {
      const asset = await this.getByHandle(handle);
      if (asset) {
        mentions.push(asset);
      }
    }

    return { text, mentions };
  },

  generateHandle(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  }
};

export type { SharedAsset, AssetMention, CreateAssetInput };
