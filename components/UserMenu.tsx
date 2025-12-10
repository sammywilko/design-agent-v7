/**
 * UserMenu Component
 * User avatar dropdown with profile info and logout
 */

import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, Cloud, CloudOff, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface UserMenuProps {
    onSignInClick: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onSignInClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const {
        isAuthenticated,
        isLoading,
        user,
        userDoc,
        logout,
        isFirebaseAvailable
    } = useAuth();

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Not configured
    if (!isFirebaseAvailable) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg">
                <CloudOff className="w-4 h-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">Local Mode</span>
            </div>
        );
    }

    // Loading
    if (isLoading) {
        return (
            <div className="w-8 h-8 bg-zinc-800 rounded-full animate-pulse" />
        );
    }

    // Not authenticated
    if (!isAuthenticated || !user) {
        return (
            <button
                onClick={onSignInClick}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
                <User className="w-4 h-4" />
                Sign In
            </button>
        );
    }

    // Authenticated - show user menu
    const initials = user.displayName
        ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user.email?.[0].toUpperCase() || '?';

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1 hover:bg-zinc-800 rounded-lg transition-colors"
            >
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {initials}
                    </div>
                )}
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info */}
                    <div className="p-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt={user.displayName || 'User'}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                                    {initials}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {user.displayName || 'User'}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">
                                    {user.email}
                                </p>
                            </div>
                        </div>

                        {/* Cloud Sync Status */}
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <Cloud className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-zinc-400">Cloud sync enabled</span>
                        </div>

                        {/* Stats */}
                        {userDoc && (
                            <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                                <span>{userDoc.projectCount || 0} projects</span>
                            </div>
                        )}
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                        <button
                            onClick={() => {
                                // TODO: Open settings
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>

                        <button
                            onClick={async () => {
                                await logout();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
