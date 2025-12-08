/**
 * KeyboardShortcutsModal Component
 * Displays available keyboard shortcuts
 */

import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { SHORTCUT_DESCRIPTIONS } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cinematic-accent/20 rounded-lg">
                            <Keyboard className="w-5 h-5 text-cinematic-accent" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Shortcuts List */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-3">
                        {SHORTCUT_DESCRIPTIONS.map((shortcut, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                            >
                                <span className="text-zinc-300 text-sm">{shortcut.description}</span>
                                <kbd className="px-2 py-1 bg-zinc-700 rounded text-xs font-mono text-zinc-200 border border-zinc-600">
                                    {shortcut.keys}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                    <p className="text-xs text-zinc-500 text-center">
                        Press <kbd className="px-1.5 py-0.5 bg-zinc-700 rounded text-[10px] font-mono text-zinc-300 mx-1">?</kbd> anytime to show this help
                    </p>
                </div>
            </div>
        </div>
    );
};

export default KeyboardShortcutsModal;
