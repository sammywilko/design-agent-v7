// constants/v8-new/cameraMoves.ts
// Professional camera move templates for Stage 5 (Video Studio)

export interface CameraMove {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
  recommendedFor: string[];
}

/**
 * CAMERA MOVE TEMPLATES
 * Professional cinematography patterns
 */
export const CAMERA_MOVES: Record<string, CameraMove> = {
  
  static: {
    id: 'static',
    name: 'Static',
    description: 'Locked-off shot, no camera movement',
    prompt: 'Static locked-off shot on tripod, no camera movement, stable composition.',
    icon: '📷',
    recommendedFor: ['interviews', 'product reveals', 'formal scenes']
  },

  orbit: {
    id: 'orbit',
    name: 'Orbit',
    description: '360° rotation around subject',
    prompt: 'Camera orbits 360 degrees around the subject, keeping them centered in frame, smooth circular motion.',
    icon: '🔄',
    recommendedFor: ['product reveals', 'character intros', 'hero moments']
  },

  dollyIn: {
    id: 'dolly-in',
    name: 'Dolly In',
    description: 'Push in towards subject',
    prompt: 'Slow smooth dolly zoom in towards the subject, gradually getting closer, increasing tension and intimacy.',
    icon: '⬆️',
    recommendedFor: ['emotional beats', 'reveals', 'tension building']
  },

  dollyOut: {
    id: 'dolly-out',
    name: 'Dolly Out',
    description: 'Pull back from subject',
    prompt: 'Camera pulls back slowly revealing more of the environment, expanding context and scale.',
    icon: '⬇️',
    recommendedFor: ['establishing shots', 'context reveals', 'epic scale']
  },

  truckLeft: {
    id: 'truck-left',
    name: 'Truck Left',
    description: 'Lateral movement left',
    prompt: 'Camera trucks left laterally, following the subject movement, maintaining consistent framing.',
    icon: '⬅️',
    recommendedFor: ['following action', 'reveals', 'dynamic movement']
  },

  truckRight: {
    id: 'truck-right',
    name: 'Truck Right',
    description: 'Lateral movement right',
    prompt: 'Camera trucks right laterally, following the subject movement, maintaining consistent framing.',
    icon: '➡️',
    recommendedFor: ['following action', 'reveals', 'dynamic movement']
  },

  tiltUp: {
    id: 'tilt-up',
    name: 'Tilt Up',
    description: 'Vertical reveal from low to high',
    prompt: 'Camera tilts up from the ground or feet slowly revealing up to the subject face, emphasizing scale and power.',
    icon: '⬆️',
    recommendedFor: ['power reveals', 'establishing', 'authority']
  },

  tiltDown: {
    id: 'tilt-down',
    name: 'Tilt Down',
    description: 'Vertical reveal from high to low',
    prompt: 'Camera tilts down from high angle slowly revealing the scene below, emphasizing vulnerability or perspective.',
    icon: '⬇️',
    recommendedFor: ['dramatic reveals', 'establishing', 'scale']
  },

  crane: {
    id: 'crane',
    name: 'Crane Shot',
    description: 'Elevated camera rising or falling',
    prompt: 'High angle crane shot lifting up and away from the scene, revealing the full environment and context.',
    icon: '🏗️',
    recommendedFor: ['epic establishing', 'endings', 'grand reveals']
  },

  tracking: {
    id: 'tracking',
    name: 'Tracking',
    description: 'Follow subject in motion',
    prompt: 'Camera tracks alongside subject maintaining consistent distance, following their movement through space.',
    icon: '🎯',
    recommendedFor: ['action sequences', 'walking', 'chase scenes']
  },

  reveal: {
    id: 'reveal',
    name: 'Reveal',
    description: 'Movement reveals hidden element',
    prompt: 'Camera movement reveals a previously hidden element or subject, creating surprise or discovery.',
    icon: '👁️',
    recommendedFor: ['surprises', 'discoveries', 'dramatic beats']
  },

  push: {
    id: 'push',
    name: 'Push',
    description: 'Aggressive forward movement',
    prompt: 'Aggressive push forward towards subject, fast and direct, building intensity.',
    icon: '💨',
    recommendedFor: ['intense moments', 'confrontations', 'energy']
  }
};

/**
 * STABILITY PRESETS
 * Map slider value (0-100) to camera stability
 */
export interface StabilityPreset {
  range: [number, number];
  name: string;
  description: string;
  prompt: string;
}

export const STABILITY_PRESETS: StabilityPreset[] = [
  {
    range: [0, 30],
    name: 'Tripod',
    description: 'Rock solid, professional',
    prompt: 'Shot on a stable tripod, smooth fluid motion, steadycam, perfectly stable framing.'
  },
  {
    range: [31, 70],
    name: 'Handheld',
    description: 'Organic, documentary feel',
    prompt: 'Handheld camera movement, slight organic shake, realistic documentary feel, natural human movement.'
  },
  {
    range: [71, 100],
    name: 'Chaos',
    description: 'Intense, kinetic energy',
    prompt: 'Intense shaky cam, chaotic action camera, heavy vibration, kinetic action movie style.'
  }
];

/**
 * Get stability context for prompt
 */
export function getStabilityContext(stabilityValue: number): string {
  const preset = STABILITY_PRESETS.find(
    p => stabilityValue >= p.range[0] && stabilityValue <= p.range[1]
  );
  
  return preset?.prompt || STABILITY_PRESETS[1].prompt;
}

/**
 * Get stability name for UI
 */
export function getStabilityName(stabilityValue: number): string {
  const preset = STABILITY_PRESETS.find(
    p => stabilityValue >= p.range[0] && stabilityValue <= p.range[1]
  );
  
  return preset?.name || 'Handheld';
}

/**
 * Get camera move by ID
 */
export function getCameraMoveById(moveId: string): CameraMove | undefined {
  return CAMERA_MOVES[moveId];
}

/**
 * Get all camera move IDs
 */
export function getAllCameraMoveIds(): string[] {
  return Object.keys(CAMERA_MOVES);
}

/**
 * Get recommended moves for beat type
 */
export function getRecommendedMovesForBeat(
  beatType: 'action' | 'dialogue' | 'reveal' | 'establishing' | 'emotional'
): CameraMove[] {
  const moves = Object.values(CAMERA_MOVES);
  
  const typeKeywords: Record<string, string[]> = {
    action: ['action', 'chase', 'energy', 'intense'],
    dialogue: ['interviews', 'formal'],
    reveal: ['reveals', 'discoveries', 'surprise'],
    establishing: ['establishing', 'epic', 'scale'],
    emotional: ['emotional', 'tension', 'intimacy']
  };
  
  const keywords = typeKeywords[beatType] || [];
  
  return moves.filter(move =>
    keywords.some(keyword =>
      move.recommendedFor.some(rec => rec.includes(keyword))
    )
  );
}

/**
 * Build complete video prompt
 */
export function buildVideoPrompt(
  sceneDescription: string,
  cameraMove: string,
  stabilityValue: number
): string {
  const move = getCameraMoveById(cameraMove);
  const stabilityContext = getStabilityContext(stabilityValue);
  
  if (!move) {
    return `${sceneDescription}. ${stabilityContext}`;
  }
  
  return `${sceneDescription}

${move.prompt}

${stabilityContext}

Cinematic, professional cinematography, 4K quality, movie production style.`;
}
