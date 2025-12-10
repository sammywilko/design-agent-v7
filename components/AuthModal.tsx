/**
 * AuthModal Component
 * Login/Signup modal with Google OAuth and Email/Password options
 */

import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, Loader2, Chrome } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'signup';
}

type AuthMode = 'login' | 'signup' | 'reset';

const AuthModal: React.FC<AuthModalProps> = ({
    isOpen,
    onClose,
    initialMode = 'login'
}) => {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const {
        isLoading,
        error,
        signUp,
        signIn,
        signInGoogle,
        sendPasswordReset,
        clearError
    } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        if (mode === 'login') {
            const success = await signIn(email, password);
            if (success) onClose();
        } else if (mode === 'signup') {
            const success = await signUp(email, password, displayName || undefined);
            if (success) onClose();
        } else if (mode === 'reset') {
            const success = await sendPasswordReset(email);
            if (success) {
                setResetSent(true);
            }
        }
    };

    const handleGoogleSignIn = async () => {
        clearError();
        const success = await signInGoogle();
        if (success) onClose();
    };

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        clearError();
        setResetSent(false);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold text-white">
                        {mode === 'login' && 'Welcome Back'}
                        {mode === 'signup' && 'Create Account'}
                        {mode === 'reset' && 'Reset Password'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Reset Success */}
                    {mode === 'reset' && resetSent && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-sm text-green-400">
                                Password reset email sent! Check your inbox.
                            </p>
                        </div>
                    )}

                    {/* Google Sign In */}
                    {mode !== 'reset' && (
                        <>
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl transition-colors disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Chrome className="w-5 h-5" />
                                )}
                                Continue with Google
                            </button>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-zinc-700" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-zinc-900 text-zinc-500">or</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Email Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                    Display Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Your name"
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {mode !== 'reset' && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' && 'Sign In'}
                                    {mode === 'signup' && 'Create Account'}
                                    {mode === 'reset' && 'Send Reset Email'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Links */}
                    <div className="mt-6 text-center space-y-2">
                        {mode === 'login' && (
                            <>
                                <button
                                    onClick={() => switchMode('reset')}
                                    className="text-sm text-zinc-400 hover:text-violet-400 transition-colors"
                                >
                                    Forgot password?
                                </button>
                                <p className="text-sm text-zinc-500">
                                    Don't have an account?{' '}
                                    <button
                                        onClick={() => switchMode('signup')}
                                        className="text-violet-400 hover:text-violet-300 font-medium"
                                    >
                                        Sign up
                                    </button>
                                </p>
                            </>
                        )}

                        {mode === 'signup' && (
                            <p className="text-sm text-zinc-500">
                                Already have an account?{' '}
                                <button
                                    onClick={() => switchMode('login')}
                                    className="text-violet-400 hover:text-violet-300 font-medium"
                                >
                                    Sign in
                                </button>
                            </p>
                        )}

                        {mode === 'reset' && (
                            <button
                                onClick={() => switchMode('login')}
                                className="text-sm text-violet-400 hover:text-violet-300"
                            >
                                ← Back to sign in
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
