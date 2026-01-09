/**
 * UndoRedoControls - Reusable undo/redo UI component
 *
 * Usage:
 * ```tsx
 * const { state, setState, undo, redo, canUndo, canRedo } = useHistory(initialState);
 *
 * <UndoRedoControls
 *   canUndo={canUndo}
 *   canRedo={canRedo}
 *   onUndo={undo}
 *   onRedo={redo}
 * />
 * ```
 */

import React, { useEffect, useCallback } from 'react';
import { Undo2, Redo2 } from 'lucide-react';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  showKeyboardHints?: boolean;
  enableKeyboardShortcuts?: boolean;
  className?: string;
}

const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  size = 'md',
  showLabels = false,
  showKeyboardHints = true,
  enableKeyboardShortcuts = true,
  className = ''
}) => {
  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enableKeyboardShortcuts) return;

    // Check for Cmd/Ctrl + Z (undo) or Cmd/Ctrl + Shift + Z (redo)
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey && canRedo) {
        onRedo();
      } else if (!e.shiftKey && canUndo) {
        onUndo();
      }
    }

    // Also support Cmd/Ctrl + Y for redo
    if ((e.metaKey || e.ctrlKey) && e.key === 'y' && canRedo) {
      e.preventDefault();
      onRedo();
    }
  }, [canUndo, canRedo, onUndo, onRedo, enableKeyboardShortcuts]);

  useEffect(() => {
    if (enableKeyboardShortcuts) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enableKeyboardShortcuts]);

  // Size variants
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 'w-3.5 h-3.5',
      gap: 'gap-1'
    },
    md: {
      button: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-1.5'
    },
    lg: {
      button: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2'
    }
  };

  const { button: buttonSize, icon: iconSize, gap } = sizeClasses[size];

  const baseButtonClass = `
    flex items-center ${gap} ${buttonSize}
    rounded-lg transition-all duration-150
    disabled:opacity-40 disabled:cursor-not-allowed
  `;

  const activeButtonClass = `
    bg-slate-700/50 hover:bg-slate-600/50
    text-slate-200 hover:text-white
    border border-white/10 hover:border-white/20
  `;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Undo Button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`${baseButtonClass} ${canUndo ? activeButtonClass : 'bg-slate-800/30 text-slate-500 border border-white/5'}`}
        title={showKeyboardHints ? 'Undo (Cmd+Z)' : 'Undo'}
      >
        <Undo2 className={iconSize} />
        {showLabels && <span>Undo</span>}
      </button>

      {/* Redo Button */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`${baseButtonClass} ${canRedo ? activeButtonClass : 'bg-slate-800/30 text-slate-500 border border-white/5'}`}
        title={showKeyboardHints ? 'Redo (Cmd+Shift+Z)' : 'Redo'}
      >
        <Redo2 className={iconSize} />
        {showLabels && <span>Redo</span>}
      </button>
    </div>
  );
};

export default UndoRedoControls;
