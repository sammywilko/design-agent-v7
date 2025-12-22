/**
 * useProjectFolder Hook
 * Manages per-project download folder selection and persistence
 * With permission caching and reauthorization support
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { db } from '../services/db';

interface UseProjectFolderResult {
    folderName: string | null;
    hasFolder: boolean;
    isSupported: boolean;
    isSaving: boolean;
    permissionLost: boolean;
    pickFolder: () => Promise<FileSystemDirectoryHandle | null>;
    saveToFolder: (filename: string, blob: Blob) => Promise<boolean>;
    clearFolder: () => Promise<void>;
    reauthorize: () => Promise<boolean>;
}

// Cache permission checks for 30 seconds
const PERMISSION_CACHE_MS = 30000;

export function useProjectFolder(projectId: string): UseProjectFolderResult {
    const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null);
    const [folderName, setFolderName] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [permissionLost, setPermissionLost] = useState(false);

    // Permission cache
    const lastPermissionCheck = useRef<number>(0);
    const cachedPermission = useRef<boolean>(false);

    // Check if File System Access API is supported
    const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

    // Load saved folder on mount
    useEffect(() => {
        if (!isSupported || !projectId) return;

        const loadFolder = async () => {
            try {
                const saved = await db.getProjectFolder(projectId);
                if (saved) {
                    setFolderHandle(saved);
                    setFolderName(saved.name);
                    // Don't check permission on load - wait until user tries to save
                    // This avoids annoying permission prompts on page load
                }
            } catch (error) {
                console.warn('Could not load saved folder:', error);
            }
        };

        loadFolder();
    }, [projectId, isSupported]);

    /**
     * Check if we have permission (with caching)
     */
    const checkPermission = useCallback(async (handle: FileSystemDirectoryHandle): Promise<boolean> => {
        const now = Date.now();

        // Use cached result if recent
        if (now - lastPermissionCheck.current < PERMISSION_CACHE_MS) {
            return cachedPermission.current;
        }

        try {
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            const hasPermission = permission === 'granted';

            // Update cache
            lastPermissionCheck.current = now;
            cachedPermission.current = hasPermission;
            setPermissionLost(!hasPermission);

            return hasPermission;
        } catch (error) {
            console.warn('Permission check failed:', error);
            setPermissionLost(true);
            return false;
        }
    }, []);

    /**
     * Request permission for the saved folder
     */
    const reauthorize = useCallback(async (): Promise<boolean> => {
        if (!folderHandle) return false;

        try {
            const permission = await folderHandle.requestPermission({ mode: 'readwrite' });
            const granted = permission === 'granted';

            // Update cache
            lastPermissionCheck.current = Date.now();
            cachedPermission.current = granted;
            setPermissionLost(!granted);

            return granted;
        } catch (error) {
            console.warn('Reauthorization failed:', error);
            return false;
        }
    }, [folderHandle]);

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
            setPermissionLost(false);

            // Update cache - we just got permission
            lastPermissionCheck.current = Date.now();
            cachedPermission.current = true;

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

            // Check permission (uses cache if recent)
            const hasPermission = await checkPermission(handle);

            if (!hasPermission) {
                // Try to request permission
                const granted = await reauthorize();
                if (!granted) {
                    // Permission denied - prompt to pick new folder
                    setIsSaving(false);
                    setPermissionLost(true);
                    return false; // Don't silently fall back - let user see amber state
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

            // If it's a permission error, mark as lost
            if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
                setPermissionLost(true);
                // Invalidate cache
                lastPermissionCheck.current = 0;
                cachedPermission.current = false;
            }

            return false;
        }
    }, [folderHandle, pickFolder, checkPermission, reauthorize]);

    /**
     * Clear the saved folder
     */
    const clearFolder = useCallback(async () => {
        await db.clearProjectFolder(projectId);
        setFolderHandle(null);
        setFolderName(null);
        setPermissionLost(false);
        // Clear cache
        lastPermissionCheck.current = 0;
        cachedPermission.current = false;
    }, [projectId]);

    return {
        folderName,
        hasFolder: !!folderHandle,
        isSupported,
        isSaving,
        permissionLost,
        pickFolder,
        saveToFolder,
        clearFolder,
        reauthorize
    };
}

export default useProjectFolder;
