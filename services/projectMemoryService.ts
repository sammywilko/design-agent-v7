/**
 * Project Memory Service for Design Agent V9
 *
 * Persistent project context across sessions - never "forget" project state.
 * Stores character traits, style decisions, corrections, and learned preferences.
 */

import { getSupabase, TENANT_ID } from './supabase';

// ============================================
// TYPES
// ============================================

export type MemoryType =
  | 'character'    // Character-specific memories (appearance, traits)
  | 'location'     // Location-specific memories (atmosphere, features)
  | 'product'      // Product-specific memories (materials, colors)
  | 'style'        // Style preferences (lighting, color palette)
  | 'decision'     // Key decisions made during project
  | 'correction'   // User corrections to AI outputs
  | 'preference';  // General preferences

export type MemorySource =
  | 'user_input'      // Explicitly entered by user
  | 'ai_extraction'   // Extracted from AI response
  | 'correction'      // Correction of AI output
  | 'auto';           // Automatically inferred

export interface ProjectMemory {
  id: string;
  tenant_id: string;
  project_id: string;
  memory_type: MemoryType;
  key: string;
  value: Record<string, any>;
  confidence: number;
  source: MemorySource;
  created_at: string;
  updated_at: string;
}

export interface MemoryInput {
  key: string;
  value: Record<string, any>;
  confidence?: number;
  source?: MemorySource;
}

// ============================================
// CORE OPERATIONS
// ============================================

/**
 * Save a memory for a project
 */
export const saveMemory = async (
  projectId: string,
  memoryType: MemoryType,
  input: MemoryInput
): Promise<ProjectMemory | null> => {
  const client = getSupabase();

  try {
    const memoryData = {
      tenant_id: TENANT_ID,
      project_id: projectId,
      memory_type: memoryType,
      key: input.key,
      value: input.value,
      confidence: input.confidence ?? 1.0,
      source: input.source ?? 'user_input',
      updated_at: new Date().toISOString()
    };

    // Upsert - update if exists, insert if not
    const { data, error } = await client
      .from('project_memory')
      .upsert(memoryData, {
        onConflict: 'project_id,memory_type,key'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save memory:', error);
      return null;
    }

    console.log(`Memory saved: ${memoryType}/${input.key}`);
    return data as ProjectMemory;
  } catch (error) {
    console.error('Failed to save memory:', error);
    return null;
  }
};

/**
 * Get a specific memory
 */
export const getMemory = async (
  projectId: string,
  memoryType: MemoryType,
  key: string
): Promise<ProjectMemory | null> => {
  const client = getSupabase();

  try {
    const { data, error } = await client
      .from('project_memory')
      .select('*')
      .eq('project_id', projectId)
      .eq('memory_type', memoryType)
      .eq('key', key)
      .single();

    if (error) {
      // Not found is not an error
      if (error.code === 'PGRST116') return null;
      console.error('Failed to get memory:', error);
      return null;
    }

    return data as ProjectMemory;
  } catch (error) {
    console.error('Failed to get memory:', error);
    return null;
  }
};

/**
 * Get all memories for a project
 */
export const getProjectMemories = async (
  projectId: string,
  memoryType?: MemoryType
): Promise<ProjectMemory[]> => {
  const client = getSupabase();

  try {
    let query = client
      .from('project_memory')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (memoryType) {
      query = query.eq('memory_type', memoryType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get project memories:', error);
      return [];
    }

    return (data || []) as ProjectMemory[];
  } catch (error) {
    console.error('Failed to get project memories:', error);
    return [];
  }
};

/**
 * Delete a specific memory
 */
export const deleteMemory = async (
  projectId: string,
  memoryType: MemoryType,
  key: string
): Promise<boolean> => {
  const client = getSupabase();

  try {
    const { error } = await client
      .from('project_memory')
      .delete()
      .eq('project_id', projectId)
      .eq('memory_type', memoryType)
      .eq('key', key);

    if (error) {
      console.error('Failed to delete memory:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete memory:', error);
    return false;
  }
};

/**
 * Clear all memories for a project
 */
export const clearProjectMemories = async (
  projectId: string,
  memoryType?: MemoryType
): Promise<boolean> => {
  const client = getSupabase();

  try {
    let query = client
      .from('project_memory')
      .delete()
      .eq('project_id', projectId);

    if (memoryType) {
      query = query.eq('memory_type', memoryType);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to clear memories:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to clear memories:', error);
    return false;
  }
};

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * Save a character memory
 */
export const saveCharacterMemory = async (
  projectId: string,
  characterName: string,
  attribute: string,
  value: any,
  source: MemorySource = 'user_input'
): Promise<ProjectMemory | null> => {
  return saveMemory(projectId, 'character', {
    key: `${characterName.toLowerCase()}_${attribute}`,
    value: {
      characterName,
      attribute,
      ...value
    },
    source
  });
};

/**
 * Save a style memory
 */
export const saveStyleMemory = async (
  projectId: string,
  styleName: string,
  value: Record<string, any>,
  source: MemorySource = 'user_input'
): Promise<ProjectMemory | null> => {
  return saveMemory(projectId, 'style', {
    key: styleName,
    value,
    source
  });
};

/**
 * Save a correction memory
 */
export const saveCorrection = async (
  projectId: string,
  correctionType: string,
  original: any,
  corrected: any
): Promise<ProjectMemory | null> => {
  return saveMemory(projectId, 'correction', {
    key: `${correctionType}_${Date.now()}`,
    value: {
      type: correctionType,
      original,
      corrected,
      timestamp: new Date().toISOString()
    },
    source: 'correction'
  });
};

/**
 * Save a decision memory
 */
export const saveDecision = async (
  projectId: string,
  decisionName: string,
  decision: Record<string, any>
): Promise<ProjectMemory | null> => {
  return saveMemory(projectId, 'decision', {
    key: decisionName,
    value: {
      ...decision,
      decidedAt: new Date().toISOString()
    },
    source: 'user_input'
  });
};

// ============================================
// CONTEXT INJECTION
// ============================================

/**
 * Build context string from project memories for AI prompt injection
 */
export const buildContextForPrompt = async (
  projectId: string,
  options: {
    includeCharacters?: boolean;
    includeLocations?: boolean;
    includeProducts?: boolean;
    includeStyle?: boolean;
    includeCorrections?: boolean;
  } = {}
): Promise<string> => {
  const {
    includeCharacters = true,
    includeLocations = true,
    includeProducts = true,
    includeStyle = true,
    includeCorrections = true
  } = options;

  const memories = await getProjectMemories(projectId);
  const contextParts: string[] = [];

  // Characters
  if (includeCharacters) {
    const charMemories = memories.filter(m => m.memory_type === 'character');
    if (charMemories.length > 0) {
      contextParts.push('CHARACTER MEMORIES:');
      charMemories.forEach(m => {
        contextParts.push(`- ${m.key}: ${JSON.stringify(m.value)}`);
      });
    }
  }

  // Locations
  if (includeLocations) {
    const locMemories = memories.filter(m => m.memory_type === 'location');
    if (locMemories.length > 0) {
      contextParts.push('LOCATION MEMORIES:');
      locMemories.forEach(m => {
        contextParts.push(`- ${m.key}: ${JSON.stringify(m.value)}`);
      });
    }
  }

  // Products
  if (includeProducts) {
    const prodMemories = memories.filter(m => m.memory_type === 'product');
    if (prodMemories.length > 0) {
      contextParts.push('PRODUCT MEMORIES:');
      prodMemories.forEach(m => {
        contextParts.push(`- ${m.key}: ${JSON.stringify(m.value)}`);
      });
    }
  }

  // Style
  if (includeStyle) {
    const styleMemories = memories.filter(m => m.memory_type === 'style');
    if (styleMemories.length > 0) {
      contextParts.push('STYLE PREFERENCES:');
      styleMemories.forEach(m => {
        contextParts.push(`- ${m.key}: ${JSON.stringify(m.value)}`);
      });
    }
  }

  // Corrections (important for consistency)
  if (includeCorrections) {
    const corrections = memories.filter(m => m.memory_type === 'correction');
    if (corrections.length > 0) {
      contextParts.push('PREVIOUS CORRECTIONS (avoid these mistakes):');
      corrections.slice(0, 5).forEach(m => { // Limit to recent 5
        const v = m.value as { original: any; corrected: any };
        contextParts.push(`- Original: ${JSON.stringify(v.original)} → Corrected: ${JSON.stringify(v.corrected)}`);
      });
    }
  }

  return contextParts.join('\n');
};

/**
 * Extract memories from AI response (for auto-learning)
 */
export const extractMemoriesFromResponse = async (
  projectId: string,
  response: string,
  entityNames: string[]
): Promise<number> => {
  let savedCount = 0;

  // This is a simplified extraction - could be enhanced with AI
  // For now, just look for explicit mentions of visual attributes

  const colorPatterns = /(?:hair|eyes|skin|color|colour):\s*([a-zA-Z\s]+)/gi;
  const stylePatterns = /(?:lighting|atmosphere|mood):\s*([a-zA-Z\s]+)/gi;

  let match;

  // Extract color mentions
  while ((match = colorPatterns.exec(response)) !== null) {
    const attribute = match[0].split(':')[0].trim().toLowerCase();
    const value = match[1].trim();

    // Try to associate with an entity
    for (const entityName of entityNames) {
      if (response.toLowerCase().includes(entityName.toLowerCase())) {
        await saveCharacterMemory(projectId, entityName, attribute, { value }, 'ai_extraction');
        savedCount++;
        break;
      }
    }
  }

  // Extract style mentions
  while ((match = stylePatterns.exec(response)) !== null) {
    const attribute = match[0].split(':')[0].trim().toLowerCase();
    const value = match[1].trim();

    await saveStyleMemory(projectId, attribute, { preference: value }, 'ai_extraction');
    savedCount++;
  }

  return savedCount;
};

// ============================================
// EXPORTS
// ============================================

export default {
  saveMemory,
  getMemory,
  getProjectMemories,
  deleteMemory,
  clearProjectMemories,
  saveCharacterMemory,
  saveStyleMemory,
  saveCorrection,
  saveDecision,
  buildContextForPrompt,
  extractMemoriesFromResponse
};
