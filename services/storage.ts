/**
 * Hybrid Storage Service
 * Routes storage operations to Firestore (authenticated) or IndexedDB (anonymous)
 */

import { db as indexedDB } from './db';
import {
    getCurrentUser,
    getUserProjects,
    createCloudProject as firebaseCreateProject,
    getCloudProject,
    updateCloudProject,
    deleteCloudProject as firebaseDeleteProject,
    saveProjectData as firebaseSaveProjectData,
    loadProjectData as firebaseLoadProjectData,
    CloudProject
} from './firebase';
import { Project, ScriptData, MoodBoard, GeneratedImage, SavedEntity } from '../types';

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    return getCurrentUser() !== null;
};

/**
 * Get all projects (from Firestore if authenticated, IndexedDB if not)
 */
export const getProjects = async (): Promise<Project[]> => {
    const user = getCurrentUser();

    if (user) {
        // Load from Firestore
        try {
            const cloudProjects = await getUserProjects(user.uid);
            return cloudProjects.map(cp => ({
                id: cp.id,
                name: cp.name,
                createdAt: cp.createdAt?.toMillis?.() || Date.now()
            }));
        } catch (error) {
            console.error('Failed to load projects from Firestore:', error);
            // Fallback to IndexedDB
            return indexedDB.getProjects();
        }
    }

    // Not authenticated - use IndexedDB
    return indexedDB.getProjects();
};

/**
 * Save/Create a project
 */
export const saveProject = async (project: Project): Promise<void> => {
    const user = getCurrentUser();

    if (user) {
        // Save to Firestore
        try {
            const existing = await getCloudProject(project.id);
            if (existing) {
                await updateCloudProject(project.id, { name: project.name });
            } else {
                // Create new project in Firestore with the same ID
                await firebaseCreateProject(user.uid, project.name);
            }
        } catch (error) {
            console.error('Failed to save project to Firestore:', error);
            // Fallback to IndexedDB
            await indexedDB.saveProject(project);
        }
    } else {
        // Not authenticated - use IndexedDB
        await indexedDB.saveProject(project);
    }
};

/**
 * Create a new project
 */
export const createProject = async (name: string): Promise<Project> => {
    const user = getCurrentUser();
    const projectId = crypto.randomUUID();

    if (user) {
        // Create in Firestore
        try {
            const cloudProjectId = await firebaseCreateProject(user.uid, name);
            if (cloudProjectId) {
                return {
                    id: cloudProjectId,
                    name,
                    createdAt: Date.now()
                };
            }
        } catch (error) {
            console.error('Failed to create project in Firestore:', error);
        }
    }

    // Fallback to IndexedDB
    const newProject: Project = { id: projectId, name, createdAt: Date.now() };
    await indexedDB.saveProject(newProject);
    return newProject;
};

/**
 * Delete a project
 */
export const deleteProject = async (projectId: string): Promise<void> => {
    const user = getCurrentUser();

    if (user) {
        // Delete from Firestore
        try {
            await firebaseDeleteProject(projectId, user.uid);
        } catch (error) {
            console.error('Failed to delete project from Firestore:', error);
        }
    }

    // Always delete from IndexedDB too (in case there's local data)
    await indexedDB.deleteProject(projectId);
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
    const user = getCurrentUser();

    if (user) {
        // Save to Firestore
        try {
            await firebaseSaveProjectData(projectId, data);
        } catch (error) {
            console.error('Failed to save project data to Firestore:', error);
        }
    }

    // Always save to IndexedDB as well (local cache)
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

    if (user) {
        // Try to load from Firestore first
        try {
            const cloudData = await firebaseLoadProjectData(projectId);
            if (cloudData) {
                // Also load library from IndexedDB (not stored in Firestore)
                const library = await indexedDB.getLibrary(projectId);
                return {
                    scriptData: cloudData.scriptData,
                    moodBoards: cloudData.moodBoards,
                    globalHistory: cloudData.globalHistory,
                    library
                };
            }
        } catch (error) {
            console.error('Failed to load project data from Firestore:', error);
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
    const user = getCurrentUser();

    if (user) {
        try {
            await firebaseSaveProjectData(projectId, { scriptData });
        } catch (error) {
            console.error('Failed to save script data to Firestore:', error);
        }
    }

    // Always save locally
    await indexedDB.saveScriptData(projectId, scriptData);
};

/**
 * Save mood boards
 */
export const saveMoodBoards = async (projectId: string, moodBoards: MoodBoard[]): Promise<void> => {
    const user = getCurrentUser();

    if (user) {
        try {
            await firebaseSaveProjectData(projectId, { moodBoards });
        } catch (error) {
            console.error('Failed to save mood boards to Firestore:', error);
        }
    }

    // Always save locally
    for (const board of moodBoards) {
        await indexedDB.saveMoodBoard(projectId, board);
    }
};

/**
 * Save history image
 */
export const saveHistoryImage = async (projectId: string, image: GeneratedImage, allHistory: GeneratedImage[]): Promise<void> => {
    const user = getCurrentUser();

    if (user) {
        try {
            await firebaseSaveProjectData(projectId, { globalHistory: allHistory });
        } catch (error) {
            console.error('Failed to save history to Firestore:', error);
        }
    }

    // Always save locally
    await indexedDB.saveHistoryImage(image);
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
