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

// Cloud sync is now enabled
const CLOUD_SYNC_ENABLED = true;

// Timeout for Firestore operations (3 seconds - fail fast, use local)
const FIRESTORE_TIMEOUT = 3000;

/**
 * Wrap a promise with a timeout
 */
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => {
            setTimeout(() => {
                console.warn(`Firestore operation timed out after ${ms}ms, using fallback`);
                resolve(fallback);
            }, ms);
        })
    ]);
};

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

    if (user && CLOUD_SYNC_ENABLED) {
        try {
            console.log('Fetching projects from Firestore for user:', user.uid);
            const cloudProjects = await withTimeout(
                getUserProjects(user.uid),
                FIRESTORE_TIMEOUT,
                [] as CloudProject[]
            );

            console.log('Cloud projects found:', cloudProjects.length);

            if (cloudProjects.length > 0) {
                return cloudProjects.map(cp => ({
                    id: cp.id,
                    name: cp.name,
                    createdAt: cp.createdAt?.toMillis?.() || Date.now()
                }));
            }

            // No cloud projects - check local
            console.log('No cloud projects, checking IndexedDB...');
            return indexedDB.getProjects();
        } catch (error) {
            console.error('Failed to load projects from Firestore:', error);
            return indexedDB.getProjects();
        }
    }

    // Not authenticated or cloud sync disabled - use IndexedDB
    return indexedDB.getProjects();
};

/**
 * Save/Create a project
 */
export const saveProject = async (project: Project): Promise<void> => {
    // Always save locally first
    await indexedDB.saveProject(project);

    const user = getCurrentUser();
    if (user && CLOUD_SYNC_ENABLED) {
        try {
            const existing = await withTimeout(
                getCloudProject(project.id),
                FIRESTORE_TIMEOUT,
                null
            );

            if (existing) {
                await withTimeout(
                    updateCloudProject(project.id, { name: project.name }),
                    FIRESTORE_TIMEOUT,
                    false
                );
            } else {
                await withTimeout(
                    firebaseCreateProject(user.uid, project.name),
                    FIRESTORE_TIMEOUT,
                    null
                );
            }
        } catch (error) {
            console.error('Failed to save project to Firestore:', error);
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

    if (user && CLOUD_SYNC_ENABLED) {
        try {
            console.log('Creating project in Firestore...');
            const cloudProjectId = await withTimeout(
                firebaseCreateProject(user.uid, name),
                FIRESTORE_TIMEOUT,
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
            console.error('Failed to create project in Firestore:', error);
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
    if (user && CLOUD_SYNC_ENABLED) {
        try {
            await withTimeout(
                firebaseDeleteProject(projectId, user.uid),
                FIRESTORE_TIMEOUT,
                false
            );
        } catch (error) {
            console.error('Failed to delete project from Firestore:', error);
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
    if (user && CLOUD_SYNC_ENABLED) {
        try {
            await withTimeout(
                firebaseSaveProjectData(projectId, data),
                FIRESTORE_TIMEOUT,
                false
            );
        } catch (error) {
            console.error('Failed to save project data to Firestore:', error);
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

    if (user && CLOUD_SYNC_ENABLED) {
        try {
            const cloudData = await withTimeout(
                firebaseLoadProjectData(projectId),
                FIRESTORE_TIMEOUT,
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
    await indexedDB.saveScriptData(projectId, scriptData);

    const user = getCurrentUser();
    if (user && CLOUD_SYNC_ENABLED) {
        try {
            await withTimeout(
                firebaseSaveProjectData(projectId, { scriptData }),
                FIRESTORE_TIMEOUT,
                false
            );
        } catch (error) {
            console.error('Failed to save script data to Firestore:', error);
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
    if (user && CLOUD_SYNC_ENABLED) {
        try {
            await withTimeout(
                firebaseSaveProjectData(projectId, { moodBoards }),
                FIRESTORE_TIMEOUT,
                false
            );
        } catch (error) {
            console.error('Failed to save mood boards to Firestore:', error);
        }
    }
};

/**
 * Save history image
 */
export const saveHistoryImage = async (projectId: string, image: GeneratedImage, allHistory: GeneratedImage[]): Promise<void> => {
    await indexedDB.saveHistoryImage(image);

    const user = getCurrentUser();
    if (user && CLOUD_SYNC_ENABLED) {
        try {
            await withTimeout(
                firebaseSaveProjectData(projectId, { globalHistory: allHistory }),
                FIRESTORE_TIMEOUT,
                false
            );
        } catch (error) {
            console.error('Failed to save history to Firestore:', error);
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
