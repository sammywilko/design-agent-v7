/**
 * useCollaboration Hook
 * Manages real-time collaboration state and syncing with Firebase
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    isFirebaseConfigured,
    initFirebase,
    generateProjectId,
    generateCollaboratorId,
    createSharedProject,
    loadSharedProject,
    updateSharedProject,
    subscribeToProject,
    updatePresence,
    CollaboratorPresence
} from '../services/firebase';
import { ScriptData, MoodBoard, GeneratedImage } from '../types';

export type CollaborationMode = 'local' | 'shared';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface CollaborationState {
    mode: CollaborationMode;
    projectId: string | null;
    shareUrl: string | null;
    syncStatus: SyncStatus;
    lastSyncedAt: Date | null;
    lastEditedBy: string | null;
    collaborators: CollaboratorPresence[];
    isOwner: boolean;
    error: string | null;
}

interface UseCollaborationProps {
    scriptData: ScriptData | undefined;
    moodBoards: MoodBoard[];
    globalHistory: GeneratedImage[];
    setScriptData: (data: ScriptData) => void;
    setMoodBoards: (boards: MoodBoard[]) => void;
    setGlobalHistory: (history: GeneratedImage[]) => void;
}

interface UseCollaborationReturn extends CollaborationState {
    // Actions
    startSharing: () => Promise<string | null>;
    joinProject: (projectId: string) => Promise<boolean>;
    stopSharing: () => void;
    syncNow: () => Promise<void>;
    isFirebaseAvailable: boolean;
}

// Debounce time for syncing (ms)
const SYNC_DEBOUNCE = 2000;

// Presence update interval (ms)
const PRESENCE_INTERVAL = 30000;

export function useCollaboration({
    scriptData,
    moodBoards,
    globalHistory,
    setScriptData,
    setMoodBoards,
    setGlobalHistory
}: UseCollaborationProps): UseCollaborationReturn {
    // State
    const [state, setState] = useState<CollaborationState>({
        mode: 'local',
        projectId: null,
        shareUrl: null,
        syncStatus: 'idle',
        lastSyncedAt: null,
        lastEditedBy: null,
        collaborators: [],
        isOwner: false,
        error: null
    });

    // Refs
    const collaboratorRef = useRef(generateCollaboratorId());
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSyncedDataRef = useRef<string>('');
    const isReceivingUpdateRef = useRef(false);

    // Check if Firebase is available
    const isFirebaseAvailable = isFirebaseConfigured();

    // Initialize Firebase on mount
    useEffect(() => {
        if (isFirebaseAvailable) {
            initFirebase();
        }
    }, [isFirebaseAvailable]);

    // Check URL for shared project ID on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sharedId = params.get('project');

        if (sharedId && isFirebaseAvailable) {
            joinProject(sharedId);
        }
    }, [isFirebaseAvailable]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    // Debounced sync when local data changes
    useEffect(() => {
        if (state.mode !== 'shared' || !state.projectId || isReceivingUpdateRef.current) {
            return;
        }

        // Create hash of current data to detect changes
        const dataHash = JSON.stringify({
            scriptData,
            moodBoards: moodBoards.map(mb => ({ ...mb, images: mb.images.length })), // Simplified for comparison
            historyCount: globalHistory.length
        });

        if (dataHash === lastSyncedDataRef.current) {
            return; // No changes
        }

        // Clear existing timeout
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        // Set syncing status
        setState(prev => ({ ...prev, syncStatus: 'syncing' }));

        // Debounce the sync
        syncTimeoutRef.current = setTimeout(async () => {
            await syncToCloud();
            lastSyncedDataRef.current = dataHash;
        }, SYNC_DEBOUNCE);

    }, [scriptData, moodBoards, globalHistory, state.mode, state.projectId]);

    // Presence heartbeat
    useEffect(() => {
        if (state.mode !== 'shared' || !state.projectId) return;

        const updateMyPresence = () => {
            updatePresence(state.projectId!, collaboratorRef.current.id, {
                color: collaboratorRef.current.color,
                currentStage: 'editing' // Could be more specific
            });
        };

        updateMyPresence();
        const interval = setInterval(updateMyPresence, PRESENCE_INTERVAL);

        return () => clearInterval(interval);
    }, [state.mode, state.projectId]);

    /**
     * Sync current data to cloud
     */
    const syncToCloud = useCallback(async () => {
        if (!state.projectId) return;

        try {
            const success = await updateSharedProject(
                state.projectId,
                { scriptData, moodBoards, globalHistory },
                collaboratorRef.current.id
            );

            if (success) {
                setState(prev => ({
                    ...prev,
                    syncStatus: 'synced',
                    lastSyncedAt: new Date(),
                    error: null
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    syncStatus: 'error',
                    error: 'Failed to sync'
                }));
            }
        } catch (error) {
            setState(prev => ({
                ...prev,
                syncStatus: 'error',
                error: 'Sync error'
            }));
        }
    }, [state.projectId, scriptData, moodBoards, globalHistory]);

    /**
     * Start sharing the current project
     */
    const startSharing = useCallback(async (): Promise<string | null> => {
        if (!isFirebaseAvailable) {
            setState(prev => ({ ...prev, error: 'Firebase not configured' }));
            return null;
        }

        try {
            setState(prev => ({ ...prev, syncStatus: 'syncing' }));

            const projectId = generateProjectId();
            const created = await createSharedProject(
                projectId,
                scriptData,
                moodBoards,
                globalHistory
            );

            if (!created) {
                setState(prev => ({
                    ...prev,
                    syncStatus: 'error',
                    error: 'Failed to create shared project'
                }));
                return null;
            }

            // Subscribe to updates
            const unsubscribe = subscribeToProject(
                projectId,
                handleRemoteUpdate,
                (error) => {
                    setState(prev => ({ ...prev, error: error.message, syncStatus: 'error' }));
                }
            );

            if (unsubscribe) {
                unsubscribeRef.current = unsubscribe;
            }

            const shareUrl = `${window.location.origin}${window.location.pathname}?project=${projectId}`;

            // Update URL without reload
            window.history.pushState({}, '', shareUrl);

            setState(prev => ({
                ...prev,
                mode: 'shared',
                projectId,
                shareUrl,
                syncStatus: 'synced',
                lastSyncedAt: new Date(),
                isOwner: true,
                error: null
            }));

            return shareUrl;
        } catch (error) {
            setState(prev => ({
                ...prev,
                syncStatus: 'error',
                error: 'Failed to start sharing'
            }));
            return null;
        }
    }, [isFirebaseAvailable, scriptData, moodBoards, globalHistory]);

    /**
     * Join an existing shared project
     */
    const joinProject = useCallback(async (projectId: string): Promise<boolean> => {
        if (!isFirebaseAvailable) {
            setState(prev => ({ ...prev, error: 'Firebase not configured' }));
            return false;
        }

        try {
            setState(prev => ({ ...prev, syncStatus: 'syncing' }));

            // Load project data
            const data = await loadSharedProject(projectId);

            if (!data) {
                setState(prev => ({
                    ...prev,
                    syncStatus: 'error',
                    error: 'Project not found'
                }));
                return false;
            }

            // Apply data
            isReceivingUpdateRef.current = true;
            if (data.scriptData) setScriptData(data.scriptData);
            if (data.moodBoards) setMoodBoards(data.moodBoards);
            if (data.globalHistory) setGlobalHistory(data.globalHistory);
            setTimeout(() => { isReceivingUpdateRef.current = false; }, 100);

            // Subscribe to updates
            const unsubscribe = subscribeToProject(
                projectId,
                handleRemoteUpdate,
                (error) => {
                    setState(prev => ({ ...prev, error: error.message, syncStatus: 'error' }));
                }
            );

            if (unsubscribe) {
                unsubscribeRef.current = unsubscribe;
            }

            const shareUrl = `${window.location.origin}${window.location.pathname}?project=${projectId}`;

            setState(prev => ({
                ...prev,
                mode: 'shared',
                projectId,
                shareUrl,
                syncStatus: 'synced',
                lastSyncedAt: new Date(),
                isOwner: false,
                error: null
            }));

            return true;
        } catch (error) {
            setState(prev => ({
                ...prev,
                syncStatus: 'error',
                error: 'Failed to join project'
            }));
            return false;
        }
    }, [isFirebaseAvailable, setScriptData, setMoodBoards, setGlobalHistory]);

    /**
     * Handle updates from other collaborators
     */
    const handleRemoteUpdate = useCallback((data: {
        scriptData: ScriptData;
        moodBoards: MoodBoard[];
        globalHistory: GeneratedImage[];
        lastEditedBy?: string;
        updatedAt?: Date;
    }) => {
        // Skip if this update is from ourselves
        if (data.lastEditedBy === collaboratorRef.current.id) {
            return;
        }

        // Flag that we're receiving an update (prevents sync loop)
        isReceivingUpdateRef.current = true;

        // Apply updates
        if (data.scriptData) setScriptData(data.scriptData);
        if (data.moodBoards) setMoodBoards(data.moodBoards);
        if (data.globalHistory) setGlobalHistory(data.globalHistory);

        setState(prev => ({
            ...prev,
            lastEditedBy: data.lastEditedBy || null,
            lastSyncedAt: data.updatedAt || new Date(),
            syncStatus: 'synced'
        }));

        // Reset flag after a short delay
        setTimeout(() => {
            isReceivingUpdateRef.current = false;
        }, 100);
    }, [setScriptData, setMoodBoards, setGlobalHistory]);

    /**
     * Stop sharing and return to local mode
     */
    const stopSharing = useCallback(() => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        // Remove project ID from URL
        window.history.pushState({}, '', window.location.pathname);

        setState({
            mode: 'local',
            projectId: null,
            shareUrl: null,
            syncStatus: 'idle',
            lastSyncedAt: null,
            lastEditedBy: null,
            collaborators: [],
            isOwner: false,
            error: null
        });
    }, []);

    /**
     * Force sync now
     */
    const syncNow = useCallback(async () => {
        if (state.mode !== 'shared' || !state.projectId) return;

        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
        }

        await syncToCloud();
    }, [state.mode, state.projectId, syncToCloud]);

    return {
        ...state,
        startSharing,
        joinProject,
        stopSharing,
        syncNow,
        isFirebaseAvailable
    };
}
