/**
 * Firebase Configuration and Initialization
 * Supports real-time collaboration, authentication, and cloud storage
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getFirestore,
    initializeFirestore,
    Firestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    DocumentReference,
    Unsubscribe,
    query,
    where,
    orderBy,
    enableNetwork,
    disableNetwork,
    persistentLocalCache,
    persistentMultipleTabManager
} from 'firebase/firestore';
import {
    getStorage,
    FirebaseStorage,
    ref,
    uploadString,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import {
    getAuth,
    Auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    UserCredential,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { ScriptData, MoodBoard, GeneratedImage, Project } from '../types';

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
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();

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
export const initFirebase = (): { app: FirebaseApp; db: Firestore; storage: FirebaseStorage; auth: Auth } | null => {
    if (!isFirebaseConfigured()) {
        console.warn('Firebase not configured - collaboration features disabled');
        return null;
    }

    if (!app) {
        try {
            app = initializeApp(firebaseConfig);

            // Initialize Firestore with optimized settings for better connectivity
            try {
                db = initializeFirestore(app, {
                    localCache: persistentLocalCache({
                        tabManager: persistentMultipleTabManager()
                    })
                });
            } catch (e: any) {
                // If already initialized, just get the instance
                if (e.code === 'failed-precondition' || e.message?.includes('already been called')) {
                    db = getFirestore(app);
                } else {
                    throw e;
                }
            }

            storage = getStorage(app);
            auth = getAuth(app);
            console.log('Firebase initialized successfully');

            // Force enable network to fix "client is offline" issues
            enableNetwork(db).then(() => {
                console.log('Firestore network enabled');
            }).catch((err) => {
                console.warn('Could not enable Firestore network:', err);
            });
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return null;
        }
    }

    return { app, db: db!, storage: storage!, auth: auth! };
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
    scriptData: ScriptData,
    moodBoards: MoodBoard[],
    globalHistory: GeneratedImage[]
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
    scriptData: ScriptData;
    moodBoards: MoodBoard[];
    globalHistory: GeneratedImage[];
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
        scriptData?: ScriptData;
        moodBoards?: MoodBoard[];
        globalHistory?: GeneratedImage[];
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
        scriptData: ScriptData;
        moodBoards: MoodBoard[];
        globalHistory: GeneratedImage[];
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

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Get Auth instance
 */
export const getAuthInstance = (): Auth | null => {
    if (!auth) initFirebase();
    return auth;
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
    const authInstance = getAuthInstance();
    return authInstance?.currentUser || null;
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
): Promise<UserCredential> => {
    const authInstance = getAuthInstance();
    if (!authInstance) throw new Error('Firebase not configured');

    const credential = await createUserWithEmailAndPassword(authInstance, email, password);

    // Update display name if provided
    if (displayName && credential.user) {
        await updateProfile(credential.user, { displayName });
    }

    // Create user document in Firestore
    await createUserDocument(credential.user);

    return credential;
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
    email: string,
    password: string
): Promise<UserCredential> => {
    const authInstance = getAuthInstance();
    if (!authInstance) throw new Error('Firebase not configured');

    return signInWithEmailAndPassword(authInstance, email, password);
};

/**
 * Sign in with Google
 * Uses popup - the createUserDocument is non-blocking to prevent hangs
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
    const authInstance = getAuthInstance();
    if (!authInstance) throw new Error('Firebase not configured');

    console.log('Attempting Google sign-in popup...');
    const credential = await signInWithPopup(authInstance, googleProvider);
    console.log('Google sign-in popup successful, user:', credential.user.uid);

    // Create/update user document (non-blocking - don't wait for Firestore)
    // This prevents the spinner from hanging if Firestore is slow/offline
    createUserDocument(credential.user).catch(err => {
        console.warn('Could not create user document (non-critical):', err);
    });

    return credential;
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
    const authInstance = getAuthInstance();
    if (!authInstance) return;

    await firebaseSignOut(authInstance);
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
    const authInstance = getAuthInstance();
    if (!authInstance) throw new Error('Firebase not configured');

    await sendPasswordResetEmail(authInstance, email);
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthState = (
    callback: (user: User | null) => void
): Unsubscribe | null => {
    const authInstance = getAuthInstance();
    if (!authInstance) return null;

    return onAuthStateChanged(authInstance, callback);
};

// ============================================
// USER DOCUMENT FUNCTIONS
// ============================================

export interface UserDocument {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    createdAt: Timestamp;
    lastLoginAt: Timestamp;
    projectCount: number;
    storageUsed: number; // bytes
}

/**
 * Create or update user document in Firestore
 */
const createUserDocument = async (user: User): Promise<void> => {
    const firestore = getDb();
    if (!firestore) return;

    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // Create new user document
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            projectCount: 0,
            storageUsed: 0
        });
    } else {
        // Update last login
        await updateDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        });
    }
};

/**
 * Get user document with retry and timeout handling
 */
export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
    const firestore = getDb();
    if (!firestore) return null;

    // Retry logic with exponential backoff
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Try to re-enable network on each attempt
            if (attempt > 1) {
                await enableNetwork(firestore).catch(() => {});
            }

            // Use a promise race with timeout
            const timeoutMs = 5000 * attempt; // Increase timeout on each retry
            const userRef = doc(firestore, 'users', uid);

            const userSnap = await Promise.race([
                getDoc(userRef),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
                )
            ]);

            if (!userSnap.exists()) {
                console.log('User Doc fetched: Not Found');
                return null;
            }

            console.log('User Doc fetched: Found');
            return userSnap.data() as UserDocument;
        } catch (error: any) {
            lastError = error;
            console.warn(`User doc fetch attempt ${attempt}/${maxRetries} failed:`, error?.message || error);

            if (attempt < maxRetries) {
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    console.error('Failed to get user document after retries:', lastError);
    return null;
};

// ============================================
// USER-OWNED PROJECT FUNCTIONS
// ============================================

export interface CloudProject {
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    thumbnail?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    lastOpenedAt?: Timestamp;
    // Project data (JSON strings for simplicity)
    scriptData?: string;
    moodBoards?: string;
    globalHistory?: string;
    // Sharing
    isPublic: boolean;
    sharedWith: string[]; // Array of user IDs
    shareCode?: string; // For link sharing
    // Stats
    imageCount: number;
    beatCount: number;
}

/**
 * Create a new cloud project for user
 */
export const createCloudProject = async (
    userId: string,
    name: string,
    description?: string
): Promise<string | null> => {
    const firestore = getDb();
    if (!firestore) return null;

    try {
        const projectId = generateProjectId();
        const projectRef = doc(firestore, 'userProjects', projectId);

        await setDoc(projectRef, {
            id: projectId,
            ownerId: userId,
            name,
            description: description || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isPublic: false,
            sharedWith: [],
            imageCount: 0,
            beatCount: 0
        });

        // Increment user's project count
        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, {
            projectCount: (await getDoc(userRef)).data()?.projectCount + 1 || 1
        });

        return projectId;
    } catch (error) {
        console.error('Failed to create cloud project:', error);
        return null;
    }
};

/**
 * Get all projects for a user with retry and timeout handling
 */
export const getUserProjects = async (userId: string): Promise<CloudProject[]> => {
    const firestore = getDb();
    if (!firestore) {
        console.warn('Firestore not initialized');
        return [];
    }

    // Retry logic
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Try to re-enable network on retry
            if (attempt > 1) {
                console.log(`Retry attempt ${attempt}/${maxRetries} for getUserProjects`);
                await enableNetwork(firestore).catch(() => {});
            }

            const projectsRef = collection(firestore, 'userProjects');
            const q = query(
                projectsRef,
                where('ownerId', '==', userId)
            );

            // Add timeout
            const timeoutMs = 8000 * attempt;
            const snapshot = await Promise.race([
                getDocs(q),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
                )
            ]);

            const projects = snapshot.docs.map(doc => doc.data() as CloudProject);

            // Sort client-side
            return projects.sort((a, b) => {
                const aTime = a.updatedAt?.toMillis?.() || 0;
                const bTime = b.updatedAt?.toMillis?.() || 0;
                return bTime - aTime;
            });
        } catch (error: any) {
            lastError = error;
            console.warn(`getUserProjects attempt ${attempt}/${maxRetries} failed:`, error?.message || error);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    console.error('Failed to get user projects after retries:', lastError?.message || lastError);
    throw lastError; // Re-throw so storage.ts can handle fallback
};

/**
 * Get a single cloud project
 */
export const getCloudProject = async (projectId: string): Promise<CloudProject | null> => {
    const firestore = getDb();
    if (!firestore) return null;

    try {
        const projectRef = doc(firestore, 'userProjects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) return null;

        return projectSnap.data() as CloudProject;
    } catch (error) {
        console.error('Failed to get cloud project:', error);
        return null;
    }
};

/**
 * Update a cloud project
 */
export const updateCloudProject = async (
    projectId: string,
    updates: Partial<Omit<CloudProject, 'id' | 'ownerId' | 'createdAt'>>
): Promise<boolean> => {
    const firestore = getDb();
    if (!firestore) return false;

    try {
        const projectRef = doc(firestore, 'userProjects', projectId);

        await updateDoc(projectRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Failed to update cloud project:', error);
        return false;
    }
};

/**
 * Save project data (scriptData, moodBoards, globalHistory)
 */
export const saveProjectData = async (
    projectId: string,
    data: {
        scriptData?: ScriptData;
        moodBoards?: MoodBoard[];
        globalHistory?: GeneratedImage[];
    }
): Promise<boolean> => {
    const firestore = getDb();
    if (!firestore) return false;

    try {
        const projectRef = doc(firestore, 'userProjects', projectId);

        const updateData: Record<string, any> = {
            updatedAt: serverTimestamp()
        };

        if (data.scriptData !== undefined) {
            updateData.scriptData = JSON.stringify(data.scriptData);
            updateData.beatCount = data.scriptData?.beats?.length || 0;
        }
        if (data.moodBoards !== undefined) {
            updateData.moodBoards = JSON.stringify(data.moodBoards);
        }
        if (data.globalHistory !== undefined) {
            updateData.globalHistory = JSON.stringify(data.globalHistory);
            updateData.imageCount = data.globalHistory.length;
        }

        await updateDoc(projectRef, updateData);
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
    const project = await getCloudProject(projectId);
    if (!project) return null;

    return {
        scriptData: project.scriptData ? JSON.parse(project.scriptData) : null,
        moodBoards: project.moodBoards ? JSON.parse(project.moodBoards) : [],
        globalHistory: project.globalHistory ? JSON.parse(project.globalHistory) : []
    };
};

/**
 * Delete a cloud project
 */
export const deleteCloudProject = async (projectId: string, userId: string): Promise<boolean> => {
    const firestore = getDb();
    if (!firestore) return false;

    try {
        // Verify ownership
        const project = await getCloudProject(projectId);
        if (!project || project.ownerId !== userId) {
            console.error('Not authorized to delete this project');
            return false;
        }

        const projectRef = doc(firestore, 'userProjects', projectId);
        await deleteDoc(projectRef);

        // Decrement user's project count
        const userRef = doc(firestore, 'users', userId);
        const userDoc = await getDoc(userRef);
        const currentCount = userDoc.data()?.projectCount || 1;
        await updateDoc(userRef, {
            projectCount: Math.max(0, currentCount - 1)
        });

        return true;
    } catch (error) {
        console.error('Failed to delete cloud project:', error);
        return false;
    }
};

/**
 * Generate a share code for a project
 */
export const generateShareCode = async (projectId: string): Promise<string | null> => {
    const firestore = getDb();
    if (!firestore) return null;

    try {
        const shareCode = generateProjectId(); // 8-char code
        const projectRef = doc(firestore, 'userProjects', projectId);

        await updateDoc(projectRef, {
            shareCode,
            updatedAt: serverTimestamp()
        });

        return shareCode;
    } catch (error) {
        console.error('Failed to generate share code:', error);
        return null;
    }
};

/**
 * Find project by share code
 */
export const findProjectByShareCode = async (shareCode: string): Promise<CloudProject | null> => {
    const firestore = getDb();
    if (!firestore) return null;

    try {
        const projectsRef = collection(firestore, 'userProjects');
        const q = query(projectsRef, where('shareCode', '==', shareCode));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;

        return snapshot.docs[0].data() as CloudProject;
    } catch (error) {
        console.error('Failed to find project by share code:', error);
        return null;
    }
};

export { Timestamp };
export type { User };
