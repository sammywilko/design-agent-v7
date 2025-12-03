/**
 * CollaborationPanel Component
 * UI for sharing projects and showing collaboration status
 */

import React, { useState, useCallback } from 'react';
import {
    Share2,
    Link,
    Copy,
    Check,
    X,
    Users,
    Cloud,
    CloudOff,
    RefreshCw,
    Loader2,
    AlertCircle,
    Wifi,
    WifiOff
} from 'lucide-react';
import { CollaborationMode, SyncStatus } from '../hooks/useCollaboration';

interface CollaborationPanelProps {
    mode: CollaborationMode;
    projectId: string | null;
    shareUrl: string | null;
    syncStatus: SyncStatus;
    lastSyncedAt: Date | null;
    lastEditedBy: string | null;
    isOwner: boolean;
    error: string | null;
    isFirebaseAvailable: boolean;
    onStartSharing: () => Promise<string | null>;
    onStopSharing: () => void;
    onSyncNow: () => Promise<void>;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
    mode,
    projectId,
    shareUrl,
    syncStatus,
    lastSyncedAt,
    lastEditedBy,
    isOwner,
    error,
    isFirebaseAvailable,
    onStartSharing,
    onStopSharing,
    onSyncNow
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    // Format time ago
    const formatTimeAgo = (date: Date | null): string => {
        if (!date) return 'Never';

        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

        if (seconds < 5) return 'Just now';
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    // Copy link to clipboard
    const copyLink = useCallback(async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, [shareUrl]);

    // Start sharing
    const handleStartSharing = useCallback(async () => {
        setIsStarting(true);
        await onStartSharing();
        setIsStarting(false);
    }, [onStartSharing]);

    // Sync status indicator
    const getSyncIcon = () => {
        switch (syncStatus) {
            case 'syncing':
                return <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />;
            case 'synced':
                return <Cloud className="w-3.5 h-3.5 text-green-400" />;
            case 'error':
                return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
            case 'offline':
                return <WifiOff className="w-3.5 h-3.5 text-amber-400" />;
            default:
                return <CloudOff className="w-3.5 h-3.5 text-zinc-500" />;
        }
    };

    const getSyncText = () => {
        switch (syncStatus) {
            case 'syncing':
                return 'Syncing...';
            case 'synced':
                return `Synced ${formatTimeAgo(lastSyncedAt)}`;
            case 'error':
                return error || 'Sync error';
            case 'offline':
                return 'Offline';
            default:
                return 'Local only';
        }
    };

    // If Firebase isn't configured, show minimal UI
    if (!isFirebaseAvailable) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 border border-white/5 rounded-lg text-xs text-zinc-500">
                <CloudOff className="w-3.5 h-3.5" />
                <span>Local mode</span>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${mode === 'shared'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'
                        : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                    }`}
            >
                {mode === 'shared' ? (
                    <>
                        {getSyncIcon()}
                        <span className="text-xs font-medium">{getSyncText()}</span>
                        <Users className="w-3.5 h-3.5 ml-1" />
                    </>
                ) : (
                    <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Share</span>
                    </>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {mode === 'shared' ? (
                                        <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                                            <Cloud className="w-4 h-4 text-sky-400" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                            <Share2 className="w-4 h-4 text-zinc-400" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-white font-semibold text-sm">
                                            {mode === 'shared' ? 'Live Collaboration' : 'Share Project'}
                                        </h3>
                                        <p className="text-[10px] text-zinc-500">
                                            {mode === 'shared'
                                                ? 'Changes sync automatically'
                                                : 'Collaborate in real-time'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-zinc-500 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {mode === 'shared' ? (
                                <>
                                    {/* Share Link */}
                                    <div className="mb-4">
                                        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
                                            Share Link
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 truncate">
                                                {shareUrl}
                                            </div>
                                            <button
                                                onClick={copyLink}
                                                className={`p-2 rounded-lg transition-colors ${copied
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                                    }`}
                                            >
                                                {copied ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sync Status */}
                                    <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs text-zinc-400">Status</span>
                                            <div className="flex items-center gap-1.5">
                                                {getSyncIcon()}
                                                <span className={`text-xs ${syncStatus === 'synced' ? 'text-green-400' :
                                                        syncStatus === 'error' ? 'text-red-400' :
                                                            syncStatus === 'syncing' ? 'text-sky-400' :
                                                                'text-zinc-500'
                                                    }`}>
                                                    {getSyncText()}
                                                </span>
                                            </div>
                                        </div>

                                        {lastEditedBy && lastEditedBy !== 'you' && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                                <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                                                    <span className="text-[8px] text-white font-bold">?</span>
                                                </div>
                                                <span>Someone else is editing...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={onSyncNow}
                                            disabled={syncStatus === 'syncing'}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                                            Sync Now
                                        </button>
                                        <button
                                            onClick={() => {
                                                onStopSharing();
                                                setIsOpen(false);
                                            }}
                                            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors"
                                        >
                                            Stop Sharing
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Not sharing yet */}
                                    <div className="text-center py-4">
                                        <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                                            <Users className="w-6 h-6 text-zinc-600" />
                                        </div>
                                        <h4 className="text-white font-medium mb-1">Collaborate in Real-Time</h4>
                                        <p className="text-xs text-zinc-500 mb-4">
                                            Share your project and work together. Changes sync automatically.
                                        </p>

                                        <button
                                            onClick={handleStartSharing}
                                            disabled={isStarting}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {isStarting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Creating link...
                                                </>
                                            ) : (
                                                <>
                                                    <Link className="w-4 h-4" />
                                                    Create Share Link
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Features */}
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <div className="space-y-2">
                                            {[
                                                { icon: Wifi, text: 'Changes sync every 2-3 seconds' },
                                                { icon: Users, text: 'Multiple people can edit at once' },
                                                { icon: Cloud, text: 'Images stored in cloud' }
                                            ].map((feature, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-[11px] text-zinc-500">
                                                    <feature.icon className="w-3.5 h-3.5" />
                                                    <span>{feature.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="px-4 pb-4">
                                <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                    <span className="text-xs text-red-400">{error}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CollaborationPanel;
