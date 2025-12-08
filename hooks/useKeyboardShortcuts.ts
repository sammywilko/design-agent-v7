/**
 * useKeyboardShortcuts Hook
 * Provides global keyboard shortcuts for power users
 */

import { useEffect, useCallback } from 'react';
import { AppStage } from '../types';

export interface KeyboardShortcutConfig {
    // Navigation
    setStage: (stage: AppStage) => void;
    // Actions
    onGenerate?: () => void;
    onSave?: () => void;
    onExport?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    // Panels
    toggleAssistant?: () => void;
    toggleMoodBoard?: () => void;
    // Modal
    onShowHelp?: () => void;
}

export interface ShortcutDefinition {
    key: string;
    ctrl?: boolean;
    meta?: boolean; // Cmd on Mac
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: () => void;
}

export const SHORTCUT_DESCRIPTIONS = [
    { keys: '1-5', description: 'Navigate between stages' },
    { keys: '⌘/Ctrl + G', description: 'Generate image' },
    { keys: '⌘/Ctrl + S', description: 'Save project' },
    { keys: '⌘/Ctrl + E', description: 'Export project' },
    { keys: '⌘/Ctrl + Z', description: 'Undo' },
    { keys: '⌘/Ctrl + Shift + Z', description: 'Redo' },
    { keys: '⌘/Ctrl + P', description: 'Toggle Producer Assistant' },
    { keys: '⌘/Ctrl + M', description: 'Toggle Mood Board' },
    { keys: '?', description: 'Show keyboard shortcuts' },
];

export function useKeyboardShortcuts(config: KeyboardShortcutConfig) {
    const {
        setStage,
        onGenerate,
        onSave,
        onExport,
        onUndo,
        onRedo,
        toggleAssistant,
        toggleMoodBoard,
        onShowHelp,
    } = config;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in inputs
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.isContentEditable;

        // Allow Cmd/Ctrl shortcuts even in inputs (for save, etc.)
        const hasModifier = e.metaKey || e.ctrlKey;

        // Stage navigation with number keys (only outside inputs)
        if (!isInput && !hasModifier) {
            const stageMap: Record<string, AppStage> = {
                '1': AppStage.STAGE_0_SCRIPT,
                '2': AppStage.STAGE_1_CONCEPT,
                '3': AppStage.STAGE_2_EDITING,
                '4': AppStage.STAGE_3_STORYBOARD,
                '5': AppStage.STAGE_4_VIDEO,
            };

            if (stageMap[e.key]) {
                e.preventDefault();
                setStage(stageMap[e.key]);
                return;
            }

            // Show help with ?
            if (e.key === '?' && onShowHelp) {
                e.preventDefault();
                onShowHelp();
                return;
            }
        }

        // Modifier-based shortcuts
        if (hasModifier) {
            const key = e.key.toLowerCase();

            // Cmd/Ctrl + G: Generate
            if (key === 'g' && onGenerate) {
                e.preventDefault();
                onGenerate();
                return;
            }

            // Cmd/Ctrl + S: Save
            if (key === 's' && onSave) {
                e.preventDefault();
                onSave();
                return;
            }

            // Cmd/Ctrl + E: Export
            if (key === 'e' && onExport) {
                e.preventDefault();
                onExport();
                return;
            }

            // Cmd/Ctrl + Z: Undo (Shift for Redo)
            if (key === 'z') {
                e.preventDefault();
                if (e.shiftKey && onRedo) {
                    onRedo();
                } else if (!e.shiftKey && onUndo) {
                    onUndo();
                }
                return;
            }

            // Cmd/Ctrl + P: Toggle Producer Assistant
            if (key === 'p' && toggleAssistant) {
                e.preventDefault();
                toggleAssistant();
                return;
            }

            // Cmd/Ctrl + M: Toggle Mood Board
            if (key === 'm' && toggleMoodBoard) {
                e.preventDefault();
                toggleMoodBoard();
                return;
            }
        }
    }, [setStage, onGenerate, onSave, onExport, onUndo, onRedo, toggleAssistant, toggleMoodBoard, onShowHelp]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
