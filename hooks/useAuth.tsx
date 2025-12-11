/**
 * useAuth Hook
 * Manages authentication state and provides auth methods
 */

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import {
    isFirebaseConfigured,
    initFirebase,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    subscribeToAuthState,
    getCurrentUser,
    getUserDocument,
    UserDocument,
    User
} from '../services/firebase';
import { db } from '../services/db';

export interface AuthState {
    user: User | null;
    userDoc: UserDocument | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
}

export interface AuthActions {
    signUp: (email: string, password: string, displayName?: string) => Promise<boolean>;
    signIn: (email: string, password: string) => Promise<boolean>;
    signInGoogle: () => Promise<boolean>;
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<boolean>;
    clearError: () => void;
}

export interface AuthContextValue extends AuthState, AuthActions {
    isFirebaseAvailable: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth Provider Component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        userDoc: null,
        isLoading: true,
        isAuthenticated: false,
        error: null
    });

    const isFirebaseAvailable = isFirebaseConfigured();

    // Initialize Firebase and subscribe to auth state
    useEffect(() => {
        if (!isFirebaseAvailable) {
            setState(prev => ({ ...prev, isLoading: false }));
            return;
        }

        initFirebase();

        const unsubscribe = subscribeToAuthState(async (user) => {
            if (user) {
                // Fetch user document from Firestore (non-blocking - don't let this fail auth)
                let userDoc = null;
                try {
                    userDoc = await getUserDocument(user.uid);
                } catch (error) {
                    // Firestore may be offline or rules may block - that's OK, auth still works
                    console.warn('Could not fetch user document (non-critical):', error);
                }
                setState({
                    user,
                    userDoc,
                    isLoading: false,
                    isAuthenticated: true,
                    error: null
                });
            } else {
                setState({
                    user: null,
                    userDoc: null,
                    isLoading: false,
                    isAuthenticated: false,
                    error: null
                });
            }
        });

        return () => {
            unsubscribe?.();
        };
    }, [isFirebaseAvailable]);

    /**
     * Sign up with email/password
     */
    const signUp = useCallback(async (
        email: string,
        password: string,
        displayName?: string
    ): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            await signUpWithEmail(email, password, displayName);
            return true;
        } catch (error: any) {
            const message = getAuthErrorMessage(error.code);
            setState(prev => ({ ...prev, isLoading: false, error: message }));
            return false;
        }
    }, []);

    /**
     * Sign in with email/password
     */
    const signIn = useCallback(async (
        email: string,
        password: string
    ): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            await signInWithEmail(email, password);
            return true;
        } catch (error: any) {
            const message = getAuthErrorMessage(error.code);
            setState(prev => ({ ...prev, isLoading: false, error: message }));
            return false;
        }
    }, []);

    /**
     * Sign in with Google
     */
    const signInGoogle = useCallback(async (): Promise<boolean> => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            await signInWithGoogle();
            return true;
        } catch (error: any) {
            const message = getAuthErrorMessage(error.code);
            setState(prev => ({ ...prev, isLoading: false, error: message }));
            return false;
        }
    }, []);

    /**
     * Sign out - clears local data and reloads
     */
    const logout = useCallback(async (): Promise<void> => {
        try {
            await signOut();
            // Clear all local IndexedDB data on logout
            await db.clearAllData();
            // Reload the page to reset all app state
            window.location.reload();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }, []);

    /**
     * Send password reset email
     */
    const sendPasswordReset = useCallback(async (email: string): Promise<boolean> => {
        setState(prev => ({ ...prev, error: null }));

        try {
            await resetPassword(email);
            return true;
        } catch (error: any) {
            const message = getAuthErrorMessage(error.code);
            setState(prev => ({ ...prev, error: message }));
            return false;
        }
    }, []);

    /**
     * Clear error
     */
    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const value: AuthContextValue = {
        ...state,
        isFirebaseAvailable,
        signUp,
        signIn,
        signInGoogle,
        logout,
        sendPasswordReset,
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getAuthErrorMessage(code: string): string {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Try signing in instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not enabled. Please contact support.';
        case 'auth/weak-password':
            return 'Password is too weak. Use at least 6 characters.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        case 'auth/user-not-found':
            return 'No account found with this email. Try signing up.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-credential':
            return 'Invalid credentials. Please check your email and password.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed. Please try again.';
        case 'auth/popup-blocked':
            return 'Sign-in popup was blocked. Please allow popups for this site.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        default:
            return 'An error occurred. Please try again.';
    }
}

export default useAuth;
