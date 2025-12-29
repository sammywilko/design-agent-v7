import React, { useEffect, useState } from 'react';

interface SpotlightOverlayProps {
  targetId: string | null;
  onDismiss: () => void;
}

/**
 * SpotlightOverlay - Highlights a specific UI element by ID
 * Creates a dark overlay with a "spotlight" cutout around the target element
 */
const SpotlightOverlay: React.FC<SpotlightOverlayProps> = ({ targetId, onDismiss }) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!targetId) {
      setIsVisible(false);
      setTargetRect(null);
      return;
    }

    // Find the target element
    const element = document.getElementById(targetId) ||
                   document.querySelector(`[data-spotlight="${targetId}"]`);

    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      setIsVisible(true);

      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add pulsing animation to the element
      element.classList.add('spotlight-target');
    } else {
      console.warn(`SpotlightOverlay: Element with id "${targetId}" not found`);
      setIsVisible(false);
    }

    return () => {
      if (element) {
        element.classList.remove('spotlight-target');
      }
    };
  }, [targetId]);

  // Update position on window resize
  useEffect(() => {
    if (!targetId || !isVisible) return;

    const handleResize = () => {
      const element = document.getElementById(targetId) ||
                     document.querySelector(`[data-spotlight="${targetId}"]`);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [targetId, isVisible]);

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  if (!isVisible || !targetRect) return null;

  const padding = 8;
  const spotlightStyle = {
    left: targetRect.left - padding,
    top: targetRect.top - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  };

  return (
    <div
      className="fixed inset-0 z-[200] pointer-events-auto animate-in fade-in duration-300"
      onClick={onDismiss}
    >
      {/* Dark overlay with spotlight cutout using CSS mask */}
      <div
        className="absolute inset-0 bg-black/70"
        style={{
          maskImage: `radial-gradient(ellipse ${spotlightStyle.width + 40}px ${spotlightStyle.height + 40}px at ${spotlightStyle.left + spotlightStyle.width/2}px ${spotlightStyle.top + spotlightStyle.height/2}px, transparent 40%, black 70%)`,
          WebkitMaskImage: `radial-gradient(ellipse ${spotlightStyle.width + 40}px ${spotlightStyle.height + 40}px at ${spotlightStyle.left + spotlightStyle.width/2}px ${spotlightStyle.top + spotlightStyle.height/2}px, transparent 40%, black 70%)`,
        }}
      />

      {/* Highlight ring around target */}
      <div
        className="absolute border-2 border-violet-400 rounded-xl animate-pulse pointer-events-none"
        style={{
          left: spotlightStyle.left,
          top: spotlightStyle.top,
          width: spotlightStyle.width,
          height: spotlightStyle.height,
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.3)',
        }}
      />

      {/* Click to dismiss hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-zinc-300 px-4 py-2 rounded-full text-sm border border-zinc-700">
        Click anywhere to dismiss
      </div>
    </div>
  );
};

export default SpotlightOverlay;

// CSS to add to index.html or a global stylesheet:
// .spotlight-target {
//   animation: spotlight-pulse 1.5s ease-in-out infinite;
// }
// @keyframes spotlight-pulse {
//   0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
//   50% { box-shadow: 0 0 0 8px rgba(139, 92, 246, 0); }
// }
