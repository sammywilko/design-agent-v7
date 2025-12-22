/**
 * useProjectFolder Hook
 * Manages per-project download folder selection and persistence
 */

import { useState, useCallback, useEffect } from 'react';
import { db } from '../services/db';

interface UseProjectFolderResult {
    folderName: string | null;
    hasFolder: boolean;
    isSupported: boolean;
    isSaving: boolean;
    pickFolder: () => Promise<FileSystemDirectoryHandle | null>;
    saveToFolder: (filename: string, blob: Blob) => Promise<boolean>;
    clearFolder: () => Promise<void>;
}

export function useProjectFolder(projectId: string): UseProjectFolderResult {
    const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [folderName, setFolderName] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Check if File System Access API is supported
    const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

    // Load saved folder on mount
    useEffect(() => {
        if (!isSupported || !projectId) return;

        const loadFolder = async () => {
            try {
                const saved = await db.getProjectFolder(projectId);
                if (saved) {
                    // Verify we still have permission
                    const permission = await saved.queryPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        setFolderHandle(saved);
                        setFolderName(saved.name);
                    } else {
                        // Try to re-request permission
                        const newPermission = await saved.requestPermission({ mode: 'readwrite' });
                        if (newPermission === 'granted') {
                            setFolderHandle(saved);
                            setFolderName(saved.name);
                        } else {
                            // Permission denied, clear saved folder
                            await db.clearProjectFolder(projectId);
                        }
                    }
                }
            } catch (error) {
                console.warn('Could not load saved folder:', error);
            }
        };

        loadFolder();
    }, [projectId, isSupported]);

    /**
     * Open folder picker and save selection
     */
    const pickFolder = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
        if (!isSupported) return null;

        try {
            const handle = await (window as any).showDirectoryPicker({
                mode: 'readwrite',
                startIn: 'downloads'
            });

            // Save the handle for future use
            await db.saveProjectFolder(projectId, handle);
            setFolderHandle(handle);
            setFolderName(handle.name);

            return handle;
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Failed to pick folder:', error);
            }
            return null;
        }
    }, [projectId, isSupported]);

    /**
     * Save a file to the project folder
     */
    const saveToFolder = useCallback(async (filename: string, blob: Blob): Promise<boolean> => {
        setIsSaving(true);

        try {
            let handle = folderHandle;

            // If no folder selected, prompt user to pick one
            if (!handle) {
                handle = await pickFolder();
                if (!handle) {
                    setIsSaving(false);
                    return false;
                }
            }

            // Verify permission
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            if (permission !== 'granted') {
                const newPermission = await handle.requestPermission({ mode: 'readwrite' });
                if (newPermission !== 'granted') {
                    // Permission denied, need to pick new folder
                    handle = await pickFolder();
                    if (!handle) {
                        setIsSaving(false);
                        return false;
                    }
                }
            }

            // Create file and write
            const fileHandle = await handle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            setIsSaving(false);
            return true;
        } catch (error: any) {
            console.error('Failed to save file:', error);
            setIsSaving(false);

            // If it's a permission error, clear the saved folder
            if (error.name === 'NotAllowedError') {
                await db.clearProjectFolder(projectId);
                setFolderHandle(null);
                setFolderName(null);
            }

            return false;
        }
    }, [folderHandle, pickFolder, projectId]);

    /**
     * Clear the saved folder
     */
    const clearFolder = useCallback(async () => {
        await db.clearProjectFolder(projectId);
        setFolderHandle(null);
        setFolderName(null);
    }, [projectId]);

    return {
        folderName,
        hasFolder: !!folderHandle,
        isSupported,
        isSaving,
        pickFolder,
        saveToFolder,
        clearFolder
    };
}

export default useProjectFolder;
