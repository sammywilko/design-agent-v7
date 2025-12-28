/**
 * Hybrid Storage Service
 * Routes storage operations to Supabase (authenticated) or IndexedDB (anonymous)
 *
 * Migration Note: Now uses Supabase for cloud storage instead of Firestore.
 * Firebase is still used for authentication (Google OAuth, email/password).
 */

import { db as indexedDB } from './db';
import { getCurrentUser } from './firebase';
import {
  getUserProjects as supabaseGetUserProjects,
  createProject as supabaseCreateProject,
  getProject as supabaseGetProject,
  updateProject as supabaseUpdateProject,
  deleteProject as supabaseDeleteProject,
  saveProjectData as supabaseSaveProjectData,
  loadProjectData as supabaseLoadProjectData,
  isSupabaseConfigured,
  SupabaseProject
} from './supabase';
import { Project, ScriptData, MoodBoard, GeneratedImage, SavedEntity } from '../types';

// Cloud sync is now enabled via Supabase
const CLOUD_SYNC_ENABLED = true;

// Timeout for Supabase operations (3 seconds - fail fast, use local)
const SUPABASE_TIMEOUT = 3000;

/**
 * Wrap a promise with a timeout
 */
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => {
        console.warn(`Supabase operation timed out after ${ms}ms, using fallback`);
        resolve(fallback);
      }, ms);
    })
  ]);
};

/**
 * Check if user is authenticated (via Firebase Auth)
 */
export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * Get all projects (merges local IndexedDB + cloud Supabase projects)
 * This ensures projects are visible across devices even if sync failed
 */
export const getProjects = async (): Promise<Project[]> => {
  const user = getCurrentUser();

  // Always get local projects first
  const localProjects = await indexedDB.getProjects();
  console.log('Local projects found:', localProjects.length);

  if (user && CLOUD_SYNC_ENABLED && isSupabaseConfigured()) {
    try {
      console.log('Fetching projects from Supabase for user:', user.email);
      const cloudProjects = await withTimeout(
        supabaseGetUserProjects(user.email || ''),
        SUPABASE_TIMEOUT,
        [] as SupabaseProject[]
      );

      console.log('Cloud projects found:', cloudProjects.length);

      // Convert cloud projects to Project format
      const cloudProjectsList: Project[] = cloudProjects.map(cp => ({
        id: cp.id,
        name: cp.name,
        createdAt: new Date(cp.created_at).getTime()
      }));

      // Merge: cloud projects take precedence for same ID
      const projectMap = new Map<string, Project>();

      // Add local projects first
      for (const project of localProjects) {
        projectMap.set(project.id, project);
      }

      // Cloud projects override local (they have the latest synced data)
      for (const project of cloudProjectsList) {
        projectMap.set(project.id, project);
      }

      // Convert to array and sort by createdAt (newest first)
      const mergedProjects = Array.from(projectMap.values());
      mergedProjects.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      console.log('Merged projects (local + cloud):', mergedProjects.length);
      return mergedProjects;
    } catch (error) {
      console.error('Failed to load projects from Supabase:', error);
      // Return local projects if cloud fails
      return localProjects;
    }
  }

  // Not authenticated or cloud sync disabled - use IndexedDB only
  return localProjects;
};

/**
 * Save/Create a project
 */
export const saveProject = async (project: Project): Promise<void> => {
  // Always save locally first
  await indexedDB.saveProject(project);

  const user = getCurrentUser();
  if (user && CLOUD_SYNC_ENABLED && isSupabaseConfigured()) {
    try {
      const existing = await withTimeout(
        supabaseGetProject(project.id),
        SUPABASE_TIMEOUT,
        null
      );

      if (existing) {
        await withTimeout(
          supabaseUpdateProject(project.id, { name: project.name }),
          SUPABASE_TIMEOUT,
          false
        );
      } else {
        await withTimeout(
          supabaseCreateProject(user.uid, user.email || '', project.name),
          SUPABASE_TIMEOUT,
          null
        );
      }
    } catch (error) {
      console.error('Failed to save project to Supabase:', error);
    }
  }
};

/**
 * Create a new project
 */
export const createProject = async (name: string): Promise<Project> => {
  const user = getCurrentUser();
  const localProjectId = crypto.randomUUID();

  // Always create locally first for instant response
  const localProject: Project = { id: localProjectId, name, createdAt: Date.now() };
  await indexedDB.saveProject(localProject);

  if (user && CLOUD_SYNC_ENABLED && isSupabaseConfigured()) {
    try {
      console.log('Creating project in Supabase...');
      const cloudProjectId = await withTimeout(
        supabaseCreateProject(user.uid, user.email || '', name),
        SUPABASE_TIMEOUT,
        null
      );

      if (cloudProjectId) {
        console.log('Cloud project created:', cloudProjectId);
        // Update with cloud ID
        const cloudProject: Project = {
          id: cloudProjectId,
          name,
          createdAt: Date.now()
        };
        // Delete local and save with cloud ID
        await indexedDB.deleteProject(localProjectId);
        await indexedDB.saveProject(cloudProject);
        return cloudProject;
      }
    } catch (error) {
      console.error('Failed to create project in Supabase:', error);
    }
  }

  return localProject;
};

/**
 * Delete a project
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  // Always delete from IndexedDB first for instant response
  await indexedDB.deleteProject(projectId);

  const user = getCurrentUser();
  if (user && CLOUD_SYNC_ENABLED && isSupabaseConfigured()) {
    try {
      await withTimeout(
        supabaseDeleteProject(projectId, user.email || ''),
        SUPABASE_TIMEOUT,
        false
      );
    } catch (error) {
      console.error('Failed to delete project from Supabase:', error);
    }
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
): Promise<void> => {
  // Always save to IndexedDB first (local cache)
  if (data.scriptData) {
    await indexedDB.saveScriptData(projectId, data.scriptData);
  }
  if (data.moodBoards) {
    for (const board of data.moodBoards) {
      await indexedDB.saveMoodBoard(projectId, board);
    }
  }
  if (data.globalHistory) {
    for (const image of data.globalHistory) {
      await indexedDB.saveHistoryImage(image);
    }
  }

  const user = getCurrentUser();
  if (user && CLOUD_SYNC_ENABLED && isSupabaseConfigured()) {
    try {
      await withTimeout(
        supabaseSaveProjectData(projectId, data),
        SUPABASE_TIMEOUT,
        false
      );
    } catch (error) {
      console.error('Failed to save project data to Supabase:', error);
    }
  }
};

/**
 * Load project data
 */
export const loadProjectData = async (projectId: string): Promise<{
  scriptData: ScriptData | null;
  moodBoards: MoodBoard[];
  globalHistory: GeneratedImage[];
  library: SavedEntity[];
}> => {
  const user = getCurrentUser();

  if (user && CLOUD_SYNC_ENABLED && isSupabaseConfigured()) {
    try {
      const cloudData = await withTimeout(
        supabaseLoadProjectData(projectId),
        SUPABASE_TIMEOUT,
        null
      );

      if (cloudData && (cloudData.scriptData || cloudData.moodBoards.length > 0 || cloudData.globalHistory.length > 0)) {
        const library = await indexedDB.getLibrary(projectId);
        return {
          scriptData: cloudData.scriptData,
          moodBoards: cloudData.moodBoards,
          globalHistory: cloudData.globalHistory,
          library
        };
      }
    } catch (error) {
      console.error('Failed to load project data from Supabase:', error);
    }
  }

  // Fallback to IndexedDB
  const [history, library, savedScript, savedMoodBoards] = await Promise.all([
    indexedDB.getHistory(projectId),
    indexedDB.getLibrary(projectId),
    indexedDB.getScriptData(projectId),
    indexedDB.getMoodBoards(projectId)
  ]);

  return {
    scriptData: savedScript,
    moodBoards: savedMoodBoards,
    globalHistory: history,
    library
  };
};

/**
 * Save script data
 */
export const saveScriptData = async (projectId: string, scriptData: ScriptData): Promise<void> => {
  await indexedDB.saveScriptData(projectId, scriptData);

  const user = getCurrentUser();
  if (user && CLOUD_SYNC_ENABLED && isSupabaseConfigured()) {
    try {
      await withTimeout(
        supabaseSaveProjectData(projectId, { scriptData }),
        SUPABASE_TIMEOUT,
        false
      );
    } catch (error) {
      console.error('Failed to save script data to Supabase:', error);
    }
  }
};

/**
 * Save mood boards
 */
export const saveMoodBoards = async (projectId: string, moodBoards: MoodBoard[]): Promise<void> => {
  for (const board of moodBoards) {
    await indexedDB.saveMoodBoard(projectId, board);
  }

  const user = getCurrentUser();
  if (user && CLOUD_SYNC_ENABLED && isSupabaseConfigured()) {
    try {
      await withTimeout(
        supabaseSaveProjectData(projectId, { moodBoards }),
        SUPABASE_TIMEOUT,
        false
      );
    } catch (error) {
      console.error('Failed to save mood boards to Supabase:', error);
    }
  }
};

/**
 * Save history image
 */
export const saveHistoryImage = async (projectId: string, image: GeneratedImage, allHistory: GeneratedImage[]): Promise<void> => {
  await indexedDB.saveHistoryImage(image);

  const user = getCurrentUser();
  if (user && CLOUD_SYNC_ENABLED && isSupabaseConfigured()) {
    try {
      await withTimeout(
        supabaseSaveProjectData(projectId, { globalHistory: allHistory }),
        SUPABASE_TIMEOUT,
        false
      );
    } catch (error) {
      console.error('Failed to save history to Supabase:', error);
    }
  }
};

// Re-export IndexedDB functions for operations not yet migrated
export const getHistory = indexedDB.getHistory;
export const getLibrary = indexedDB.getLibrary;
export const saveLibraryItem = indexedDB.saveLibraryItem;
export const deleteLibraryItem = indexedDB.deleteLibraryItem;
export const getScriptData = indexedDB.getScriptData;
export const getMoodBoards = indexedDB.getMoodBoards;
export const saveMoodBoard = indexedDB.saveMoodBoard;
export const deleteMoodBoard = indexedDB.deleteMoodBoard;
export const deleteHistoryImage = indexedDB.deleteHistoryImage;
export const getVideos = indexedDB.getVideos;
export const saveVideo = indexedDB.saveVideo;
export const deleteVideo = indexedDB.deleteVideo;
export const getSavedPrompts = indexedDB.getSavedPrompts;
export const savePrompt = indexedDB.savePrompt;
export const deletePrompt = indexedDB.deletePrompt;
export const clearAllData = indexedDB.clearAllData;
