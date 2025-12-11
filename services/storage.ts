/**
 * Storage Service - IndexedDB Only Mode
 * Cloud sync temporarily disabled while Firestore is being configured
 */

import { db as indexedDB } from './db';
import { getCurrentUser } from './firebase';
import { Project, ScriptData, MoodBoard, GeneratedImage, SavedEntity } from '../types';

// Cloud sync is temporarily disabled
const CLOUD_SYNC_ENABLED = false;

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
    return getCurrentUser() !== null;
};

/**
 * Get all projects (IndexedDB only for now)
 */
export const getProjects = async (): Promise<Project[]> => {
    return indexedDB.getProjects();
};

/**
 * Save/Create a project (IndexedDB only for now)
 */
export const saveProject = async (project: Project): Promise<void> => {
    await indexedDB.saveProject(project);
};

/**
 * Create a new project (IndexedDB only for now)
 */
export const createProject = async (name: string): Promise<Project> => {
    const projectId = crypto.randomUUID();
    const newProject: Project = { id: projectId, name, createdAt: Date.now() };
    await indexedDB.saveProject(newProject);
    return newProject;
};

/**
 * Delete a project (IndexedDB only for now)
 */
export const deleteProject = async (projectId: string): Promise<void> => {
    await indexedDB.deleteProject(projectId);
};

/**
 * Save project data (IndexedDB only for now)
 */
export const saveProjectData = async (
    projectId: string,
    data: {
        scriptData?: ScriptData;
        moodBoards?: MoodBoard[];
        globalHistory?: GeneratedImage[];
    }
): Promise<void> => {
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
 * Load project data (IndexedDB only for now)
 */
export const loadProjectData = async (projectId: string): Promise<{
    scriptData: ScriptData | null;
    moodBoards: MoodBoard[];
    globalHistory: GeneratedImage[];
    library: SavedEntity[];
}> => {
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
 * Save script data (IndexedDB only for now)
 */
export const saveScriptData = async (projectId: string, scriptData: ScriptData): Promise<void> => {
    await indexedDB.saveScriptData(projectId, scriptData);
};

/**
 * Save mood boards (IndexedDB only for now)
 */
export const saveMoodBoards = async (projectId: string, moodBoards: MoodBoard[]): Promise<void> => {
    for (const board of moodBoards) {
        await indexedDB.saveMoodBoard(projectId, board);
    }
};

/**
 * Save history image (IndexedDB only for now)
 */
export const saveHistoryImage = async (projectId: string, image: GeneratedImage, allHistory: GeneratedImage[]): Promise<void> => {
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
