/**
 * Firebase Configuration and Initialization
 * Supports real-time collaboration with Firestore
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getFirestore,
    Firestore,
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    DocumentReference,
    Unsubscribe
} from 'firebase/firestore';
import {
    getStorage,
    FirebaseStorage,
    ref,
    uploadString,
    getDownloadURL
} from 'firebase/storage';

// Firebase configuration - uses Vite env vars
const firebaseConfig = {
    apiKey: (import.meta as unknown as { env: Record<string, string> }).env.VITE_FIREBASE_API_KEY,
    authDomain: (import.meta as unknown as { env: Record<string, string> }).env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: (import.meta as unknown as { env: Record<string, string> }).env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: (import.meta as unknown as { env: Record<string, string> }).env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: (import.meta as unknown as { env: Record<string, string> }).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: (import.meta as unknown as { env: Record<string, string> }).env.VITE_FIREBASE_APP_ID
};

// Singleton instances
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

/**
 * Check if Firebase is configured
 */
export const isFirebaseConfigured = (): boolean => {
    return !!(
        firebaseConfig.apiKey &&
        firebaseConfig.projectId &&
        firebaseConfig.apiKey !== 'undefined'
    );
};

/**
 * Initialize Firebase (lazy initialization)
 */
export const initFirebase = (): { app: FirebaseApp; db: Firestore; storage: FirebaseStorage } | null => {
    if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured - collaboration features disabled');
        return null;
    }

    if (!app) {
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            storage = getStorage(app);
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return null;
        }
    }

    return { app, db: db!, storage: storage! };
};

/**
 * Get Firestore instance
 */
export const getDb = (): Firestore | null => {
    if (!db) initFirebase();
    return db;
};

/**
 * Get Storage instance
 */
export const getStorageInstance = (): FirebaseStorage | null => {
    if (!storage) initFirebase();
    return storage;
};

// ============================================
// COLLABORATION TYPES
// ============================================

export interface CollaboratorPresence {
    odometer: string; // Random ID for this session
    lastSeen: number;
    currentStage?: string;
    currentBeatId?: string;
    color: string;
}

export interface SharedProject {
    id: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastEditedBy?: string;
    collaborators: Record<string, CollaboratorPresence>;
    // Project data stored as JSON string for simplicity
    scriptData: string;
    moodBoards: string;
    globalHistory: string;
}

// ============================================
// PROJECT SHARING FUNCTIONS
// ============================================

/**
 * Generate a unique project ID for sharing
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
 * Generate a random collaborator ID and color
 */
export const generateCollaboratorId = (): { id: string; color: string } => {
    const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
    return {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        color: colors[Math.floor(Math.random() * colors.length)]
    };
};

/**
 * Create a new shared project
 */
export const createSharedProject = async (
    projectId: string,
    scriptData: any,
    moodBoards: any[],
    globalHistory: any[]
): Promise<string | null> => {
    const firestore = getDb();
    if (!firestore) return null;

    try {
        const projectRef = doc(firestore, 'projects', projectId);

        await setDoc(projectRef, {
            id: projectId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            collaborators: {},
            scriptData: JSON.stringify(scriptData),
            moodBoards: JSON.stringify(moodBoards),
            globalHistory: JSON.stringify(globalHistory)
        });

        return projectId;
    } catch (error) {
        console.error('Failed to create shared project:', error);
        return null;
    }
};

/**
 * Load a shared project
 */
export const loadSharedProject = async (projectId: string): Promise<{
    scriptData: any;
    moodBoards: any[];
    globalHistory: any[];
} | null> => {
    const firestore = getDb();
    if (!firestore) return null;

    try {
        const projectRef = doc(firestore, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
            return null;
        }

        const data = projectSnap.data() as SharedProject;

        return {
            scriptData: JSON.parse(data.scriptData || 'null'),
            moodBoards: JSON.parse(data.moodBoards || '[]'),
            globalHistory: JSON.parse(data.globalHistory || '[]')
        };
    } catch (error) {
        console.error('Failed to load shared project:', error);
        return null;
    }
};

/**
 * Update shared project data
 */
export const updateSharedProject = async (
    projectId: string,
    updates: {
        scriptData?: any;
        moodBoards?: any[];
        globalHistory?: any[];
    },
    collaboratorId?: string
): Promise<boolean> => {
    const firestore = getDb();
    if (!firestore) return false;

    try {
        const projectRef = doc(firestore, 'projects', projectId);

        const updateData: Record<string, any> = {
            updatedAt: serverTimestamp()
        };

        if (collaboratorId) {
            updateData.lastEditedBy = collaboratorId;
        }

        if (updates.scriptData !== undefined) {
            updateData.scriptData = JSON.stringify(updates.scriptData);
        }
        if (updates.moodBoards !== undefined) {
            updateData.moodBoards = JSON.stringify(updates.moodBoards);
        }
        if (updates.globalHistory !== undefined) {
            updateData.globalHistory = JSON.stringify(updates.globalHistory);
        }

        await updateDoc(projectRef, updateData);
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
        scriptData: any;
        moodBoards: any[];
        globalHistory: any[];
        lastEditedBy?: string;
        updatedAt?: Date;
    }) => void,
    onError?: (error: Error) => void
): Unsubscribe | null => {
    const firestore = getDb();
    if (!firestore) return null;

    try {
        const projectRef = doc(firestore, 'projects', projectId);

        return onSnapshot(projectRef, (snapshot) => {
            if (!snapshot.exists()) {
                onError?.(new Error('Project not found'));
                return;
            }

            const data = snapshot.data() as SharedProject;

            onUpdate({
                scriptData: JSON.parse(data.scriptData || 'null'),
                moodBoards: JSON.parse(data.moodBoards || '[]'),
                globalHistory: JSON.parse(data.globalHistory || '[]'),
                lastEditedBy: data.lastEditedBy,
                updatedAt: data.updatedAt?.toDate()
            });
        }, (error) => {
            console.error('Subscription error:', error);
            onError?.(error);
        });
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
    const firestore = getDb();
    if (!firestore) return;

    try {
        const projectRef = doc(firestore, 'projects', projectId);

        await updateDoc(projectRef, {
            [`collaborators.${collaboratorId}`]: {
                ...presence,
                lastSeen: Date.now()
            }
        });
    } catch (error) {
        console.error('Failed to update presence:', error);
    }
};

// ============================================
// IMAGE STORAGE FUNCTIONS
// ============================================

/**
 * Upload a base64 image to Firebase Storage
 * Returns the download URL
 */
export const uploadImage = async (
    projectId: string,
    imageId: string,
    base64Data: string
): Promise<string | null> => {
    const storageInstance = getStorageInstance();
    if (!storageInstance) return null;

    try {
        const imageRef = ref(storageInstance, `projects/${projectId}/images/${imageId}`);

        // Upload base64 string
        await uploadString(imageRef, base64Data, 'data_url');

        // Get download URL
        const url = await getDownloadURL(imageRef);
        return url;
    } catch (error) {
        console.error('Failed to upload image:', error);
        return null;
    }
};

/**
 * Batch upload images
 */
export const uploadImages = async (
    projectId: string,
    images: { id: string; base64: string }[]
): Promise<Map<string, string>> => {
    const results = new Map<string, string>();

    // Upload in parallel, max 5 at a time
    const batchSize = 5;
    for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        const uploads = await Promise.allSettled(
            batch.map(async (img) => {
                const url = await uploadImage(projectId, img.id, img.base64);
                if (url) results.set(img.id, url);
                return { id: img.id, url };
            })
        );
    }

    return results;
};

export { Timestamp };
