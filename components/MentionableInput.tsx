/**
 * MentionableInput - Wrapper component for @mention-enabled inputs
 * Wraps any textarea or input to provide @mention autocomplete functionality
 */

import React, { useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MentionPicker, useMentionTrigger } from './MentionPicker';
import { mentionService, SharedAsset, AssetType } from '../services/mentionService';

interface MentionableInputProps {
  /** Render prop that receives the ref to attach to your input/textarea */
  children: (ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>) => React.ReactNode;
  /** Callback when a mention is selected */
  onMentionSelect?: (asset: SharedAsset) => void;
  /** Filter suggestions by asset type */
  filterType?: AssetType;
  /** Current project ID for recording mentions */
  projectId?: string;
  /** Source app identifier */
  sourceApp?: 'design-agent' | 'script-engine';
  /** Context type for mention tracking (e.g., 'beat', 'script', 'chat') */
  contextType?: string;
  /** Context ID for mention tracking */
  contextId?: string;
  /** Whether to allow creating new assets */
  allowCreate?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export const MentionableInput: React.FC<MentionableInputProps> = ({
  children,
  onMentionSelect,
  filterType,
  projectId,
  sourceApp = 'design-agent',
  contextType,
  contextId,
  allowCreate = true,
  disabled = false
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const {
    isTriggered,
    triggerPosition,
    query,
    insertMention,
    close
  } = useMentionTrigger(inputRef);

  const handleSelect = useCallback(async (asset: SharedAsset) => {
    // Insert the mention into the input
    insertMention(asset);

    // Notify parent
    onMentionSelect?.(asset);

    // Record the mention for analytics/tracking
    if (projectId && contextType) {
      try {
        await mentionService.recordMention(
          asset.id,
          sourceApp,
          projectId,
          contextType,
          contextId
        );
      } catch (error) {
        console.error('Failed to record mention:', error);
      }
    }
  }, [insertMention, onMentionSelect, projectId, sourceApp, contextType, contextId]);

  // Calculate position with viewport bounds checking
  const getAdjustedPosition = () => {
    if (!triggerPosition) return undefined;

    const pickerWidth = 320;
    const pickerHeight = 300;
    const padding = 16;

    let { top, left } = triggerPosition;

    // Ensure picker doesn't go off right edge
    if (left + pickerWidth > window.innerWidth - padding) {
      left = window.innerWidth - pickerWidth - padding;
    }

    // Ensure picker doesn't go off left edge
    if (left < padding) {
      left = padding;
    }

    // If picker would go below viewport, show above the input instead
    if (top + pickerHeight > window.innerHeight - padding) {
      const inputRect = inputRef.current?.getBoundingClientRect();
      if (inputRect) {
        top = inputRect.top + window.scrollY - pickerHeight - 4;
      }
    }

    return { top, left };
  };

  return (
    <>
      {children(inputRef)}

      {isTriggered && !disabled && createPortal(
        <MentionPicker
          position={getAdjustedPosition()}
          onSelect={handleSelect}
          onClose={close}
          filterType={filterType}
          allowCreate={allowCreate}
          projectId={projectId}
        />,
        document.body
      )}
    </>
  );
};

export default MentionableInput;
