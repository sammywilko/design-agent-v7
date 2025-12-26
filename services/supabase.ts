/**
 * Supabase Client for Design Agent v7
 * Replaces Firestore for project storage while keeping Firebase Auth
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { ScriptData, MoodBoard, GeneratedImage } from '../types';

// Supabase configuration
const SUPABASE_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_URL || 'https://ajsbopbuejhhaxwtbbku.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqc2JvcGJ1ZWpoaGF4d3RiYmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMDY0NDgsImV4cCI6MjA4MTU4MjQ0OH0.dkUvAz7iShkuH0haytI0H2iEEGP6rUca6k-Yj6a-pcw';
const TENANT_ID = 'cc-internal-001';

// Singleton client
let supabase: SupabaseClient | null = null;

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
};

/**
 * Get Supabase client (lazy initialization)
 */
export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    console.log('Supabase client initialized');
  }
  return supabase;
};

// ============================================
// TYPES
// ============================================

export interface SupabaseProject {
  id: string;
  tenant_id: string;
  owner_id: string | null;
  owner_email: string | null;
  name: string;
  description: string | null;
  thumbnail: string | null;
  script_data: Record<string, any>;
  mood_boards: any[];
  global_history: any[];
  is_public: boolean;
  shared_with: string[];
  share_code: string | null;
  image_count: number;
  beat_count: number;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
}

export interface SupabaseSharedProject {
  id: string;
  tenant_id: string;
  last_edited_by: string | null;
  collaborators: Record<string, CollaboratorPresence>;
  script_data: Record<string, any>;
  mood_boards: any[];
  global_history: any[];
  created_at: string;
  updated_at: string;
}

export interface CollaboratorPresence {
  odometer: string;
  lastSeen: number;
  currentStage?: string;
  currentBeatId?: string;
  color: string;
}

// ============================================
// PROJECT CRUD OPERATIONS
// ============================================

/**
 * Generate a unique project ID
 */
export const generateProjectId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};

/**
 * Generate collaborator ID and color
 */
export const generateCollaboratorId = (): { id: string; color: string } => {
  const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
  return {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    color: colors[Math.floor(Math.random() * colors.length)]
  };
};

/**
 * Create a new project
 */
export const createProject = async (
  userId: string,
  userEmail: string,
  name: string,
  description?: string
): Promise<string | null> => {
  const client = getSupabase();
  const projectId = generateProjectId();

  try {
    const { error } = await client
      .from('design_agent_projects')
      .insert({
        id: projectId,
        tenant_id: TENANT_ID,
        owner_id: userId,
        owner_email: userEmail,
        name,
        description: description || null,
        script_data: {},
        mood_boards: [],
        global_history: [],
        is_public: false,
        shared_with: [],
        image_count: 0,
        beat_count: 0
      });

    if (error) {
      console.error('Failed to create project:', error);
      return null;
    }

    console.log('Project created in Supabase:', projectId);
    return projectId;
  } catch (error) {
    console.error('Failed to create project:', error);
    return null;
  }
};

/**
 * Get all projects for a user
 */
export const getUserProjects = async (userEmail: string): Promise<SupabaseProject[]> => {
  const client = getSupabase();

  try {
    const { data, error } = await client
      .from('design_agent_projects')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('owner_email', userEmail)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to get user projects:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get user projects:', error);
    return [];
  }
};

/**
 * Get a single project
 */
export const getProject = async (projectId: string): Promise<SupabaseProject | null> => {
  const client = getSupabase();

  try {
    const { data, error } = await client
      .from('design_agent_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Failed to get project:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get project:', error);
    return null;
  }
};

/**
 * Update project metadata
 */
export const updateProject = async (
  projectId: string,
  updates: Partial<Pick<SupabaseProject, 'name' | 'description' | 'thumbnail' | 'is_public' | 'shared_with'>>
): Promise<boolean> => {
  const client = getSupabase();

  try {
    const { error } = await client
      .from('design_agent_projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) {
      console.error('Failed to update project:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update project:', error);
    return false;
  }
};

/**
 * Save project data (script, moodboards, history)
 */
export const saveProjectData = async (
  projectId: string,
  data: {
    scriptData?: ScriptData;
    moodBoards?: MoodBoard[];
    globalHistory?: GeneratedImage[];
  }
): Promise<boolean> => {
  const client = getSupabase();

  try {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (data.scriptData !== undefined) {
      updates.script_data = data.scriptData;
      updates.beat_count = data.scriptData?.beats?.length || 0;
    }
    if (data.moodBoards !== undefined) {
      updates.mood_boards = data.moodBoards;
    }
    if (data.globalHistory !== undefined) {
      updates.global_history = data.globalHistory;
      updates.image_count = data.globalHistory.length;
    }

    const { error } = await client
      .from('design_agent_projects')
      .update(updates)
      .eq('id', projectId);

    if (error) {
      console.error('Failed to save project data:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to save project data:', error);
    return false;
  }
};

/**
 * Load project data
 */
export const loadProjectData = async (projectId: string): Promise<{
  scriptData: ScriptData | null;
  moodBoards: MoodBoard[];
  globalHistory: GeneratedImage[];
} | null> => {
  const project = await getProject(projectId);
  if (!project) return null;

  return {
    scriptData: project.script_data as ScriptData || null,
    moodBoards: project.mood_boards as MoodBoard[] || [],
    globalHistory: project.global_history as GeneratedImage[] || []
  };
};

/**
 * Delete a project
 */
export const deleteProject = async (projectId: string, userEmail: string): Promise<boolean> => {
  const client = getSupabase();

  try {
    // Verify ownership
    const project = await getProject(projectId);
    if (!project || project.owner_email !== userEmail) {
      console.error('Not authorized to delete this project');
      return false;
    }

    const { error } = await client
      .from('design_agent_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Failed to delete project:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete project:', error);
    return false;
  }
};

// ============================================
// SHARING FUNCTIONS
// ============================================

/**
 * Generate a share code for a project
 */
export const generateShareCode = async (projectId: string): Promise<string | null> => {
  const client = getSupabase();
  const shareCode = generateProjectId();

  try {
    const { error } = await client
      .from('design_agent_projects')
      .update({
        share_code: shareCode,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) {
      console.error('Failed to generate share code:', error);
      return null;
    }

    return shareCode;
  } catch (error) {
    console.error('Failed to generate share code:', error);
    return null;
  }
};

/**
 * Find project by share code
 */
export const findProjectByShareCode = async (shareCode: string): Promise<SupabaseProject | null> => {
  const client = getSupabase();

  try {
    const { data, error } = await client
      .from('design_agent_projects')
      .select('*')
      .eq('share_code', shareCode)
      .single();

    if (error) {
      console.error('Failed to find project by share code:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to find project by share code:', error);
    return null;
  }
};

// ============================================
// REAL-TIME COLLABORATION
// ============================================

/**
 * Create a shared project for real-time collaboration
 */
export const createSharedProject = async (
  projectId: string,
  scriptData: ScriptData,
  moodBoards: MoodBoard[],
  globalHistory: GeneratedImage[]
): Promise<string | null> => {
  const client = getSupabase();

  try {
    const { error } = await client
      .from('design_agent_shared')
      .upsert({
        id: projectId,
        tenant_id: TENANT_ID,
        collaborators: {},
        script_data: scriptData,
        mood_boards: moodBoards,
        global_history: globalHistory
      });

    if (error) {
      console.error('Failed to create shared project:', error);
      return null;
    }

    return projectId;
  } catch (error) {
    console.error('Failed to create shared project:', error);
    return null;
  }
};

/**
 * Load shared project
 */
export const loadSharedProject = async (projectId: string): Promise<{
  scriptData: ScriptData;
  moodBoards: MoodBoard[];
  globalHistory: GeneratedImage[];
} | null> => {
  const client = getSupabase();

  try {
    const { data, error } = await client
      .from('design_agent_shared')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      scriptData: data.script_data as ScriptData,
      moodBoards: data.mood_boards as MoodBoard[],
      globalHistory: data.global_history as GeneratedImage[]
    };
  } catch (error) {
    console.error('Failed to load shared project:', error);
    return null;
  }
};

/**
 * Update shared project
 */
export const updateSharedProject = async (
  projectId: string,
  updates: {
    scriptData?: ScriptData;
    moodBoards?: MoodBoard[];
    globalHistory?: GeneratedImage[];
  },
  collaboratorId?: string
): Promise<boolean> => {
  const client = getSupabase();

  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (collaboratorId) {
      updateData.last_edited_by = collaboratorId;
    }
    if (updates.scriptData !== undefined) {
      updateData.script_data = updates.scriptData;
    }
    if (updates.moodBoards !== undefined) {
      updateData.mood_boards = updates.moodBoards;
    }
    if (updates.globalHistory !== undefined) {
      updateData.global_history = updates.globalHistory;
    }

    const { error } = await client
      .from('design_agent_shared')
      .update(updateData)
      .eq('id', projectId);

    if (error) {
      console.error('Failed to update shared project:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update shared project:', error);
    return false;
  }
};

/**
 * Subscribe to real-time project updates
 */
export const subscribeToProject = (
  projectId: string,
  onUpdate: (data: {
    scriptData: ScriptData;
    moodBoards: MoodBoard[];
    globalHistory: GeneratedImage[];
    lastEditedBy?: string;
    updatedAt?: string;
  }) => void,
  onError?: (error: Error) => void
): (() => void) | null => {
  const client = getSupabase();

  try {
    const channel = client
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'design_agent_shared',
          filter: `id=eq.${projectId}`
        },
        (payload) => {
          if (payload.new) {
            const data = payload.new as SupabaseSharedProject;
            onUpdate({
              scriptData: data.script_data as ScriptData,
              moodBoards: data.mood_boards as MoodBoard[],
              globalHistory: data.global_history as GeneratedImage[],
              lastEditedBy: data.last_edited_by || undefined,
              updatedAt: data.updated_at
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          onError?.(new Error('Failed to subscribe to project'));
        }
      });

    // Return unsubscribe function
    return () => {
      client.removeChannel(channel);
    };
  } catch (error) {
    console.error('Failed to subscribe to project:', error);
    return null;
  }
};

/**
 * Update collaborator presence
 */
export const updatePresence = async (
  projectId: string,
  collaboratorId: string,
  presence: Partial<CollaboratorPresence>
): Promise<void> => {
  const client = getSupabase();

  try {
    // First get current collaborators
    const { data } = await client
      .from('design_agent_shared')
      .select('collaborators')
      .eq('id', projectId)
      .single();

    const collaborators = (data?.collaborators as Record<string, CollaboratorPresence>) || {};
    collaborators[collaboratorId] = {
      ...collaborators[collaboratorId],
      ...presence,
      lastSeen: Date.now()
    };

    await client
      .from('design_agent_shared')
      .update({ collaborators })
      .eq('id', projectId);
  } catch (error) {
    console.error('Failed to update presence:', error);
  }
};

export { TENANT_ID, SUPABASE_URL };
