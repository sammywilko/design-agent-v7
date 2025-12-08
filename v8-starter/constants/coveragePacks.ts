// constants/coveragePacks.ts
// Coverage pack definitions for Stage 2.5

export interface PackAngle {
  type: string;
  angle: string;
  description: string;
  category: 'rotational' | 'height' | 'distance' | 'specialty';
}

export interface CoveragePack {
  id: string;
  name: string;
  description: string;
  shots: number;
  estimatedTime: string;
  estimatedCost: string;
  recommended: boolean;
  angles: PackAngle[];
}

/**
 * COVERAGE PACKS - Systematic angle generation
 */
export const COVERAGE_PACKS: Record<string, CoveragePack> = {

  // QUICK REFERENCE (1-2 min)
  turnaround: {
    id: 'turnaround',
    name: 'Turnaround',
    description: 'Front, side, back views for reference',
    shots: 3,
    estimatedTime: '1-2 min',
    estimatedCost: '$0.03',
    recommended: false,
    angles: [
      {
        type: 'Full Body',
        angle: 'Front',
        description: 'Full body front view, neutral pose, eye level',
        category: 'rotational'
      },
      {
        type: 'Full Body',
        angle: 'Side Profile',
        description: 'Full body side profile, neutral pose, eye level',
        category: 'rotational'
      },
      {
        type: 'Full Body',
        angle: 'Back',
        description: 'Full body back view, neutral pose, eye level',
        category: 'rotational'
      }
    ]
  },

  // STANDARD LIBRARY (3-5 min) - RECOMMENDED
  contactSheet: {
    id: 'contact-sheet',
    name: '3x4 Contact Sheet',
    description: 'Complete visual reference library (12 shots)',
    shots: 12,
    estimatedTime: '3-5 min',
    estimatedCost: '$0.12',
    recommended: true,
    angles: [
      // Row 1: Establishing
      {
        type: 'Extreme Wide',
        angle: 'High Angle Establishing',
        description: 'Wide establishing shot from high angle',
        category: 'distance'
      },
      {
        type: 'Wide',
        angle: 'Eye Level Master',
        description: 'Wide master shot at eye level',
        category: 'distance'
      },
      {
        type: 'Full Body',
        angle: 'Low Angle Hero',
        description: 'Full body shot from low angle (power pose)',
        category: 'height'
      },

      // Row 2: Medium shots
      {
        type: 'Medium',
        angle: 'Front',
        description: 'Medium shot, front view, eye level',
        category: 'rotational'
      },
      {
        type: 'Medium',
        angle: '3/4 Profile',
        description: 'Medium shot, 3/4 profile angle',
        category: 'rotational'
      },
      {
        type: 'Medium',
        angle: 'Profile',
        description: 'Medium shot, side profile',
        category: 'rotational'
      },

      // Row 3: Close shots
      {
        type: 'Medium Close Up',
        angle: 'Front',
        description: 'Medium close up, front view',
        category: 'distance'
      },
      {
        type: 'Close Up',
        angle: 'Front',
        description: 'Close up, front view, eye level',
        category: 'distance'
      },
      {
        type: 'Close Up',
        angle: 'Side Profile',
        description: 'Close up, side profile',
        category: 'rotational'
      },

      // Row 4: Specialty
      {
        type: 'Extreme Close Up',
        angle: 'Eyes',
        description: 'Extreme close up of eyes/face',
        category: 'distance'
      },
      {
        type: 'Medium',
        angle: 'Dutch Angle',
        description: 'Medium shot with dutch angle for energy',
        category: 'specialty'
      },
      {
        type: 'Over The Shoulder',
        angle: 'Medium',
        description: 'Over-the-shoulder medium shot',
        category: 'specialty'
      }
    ]
  },

  // DIALOGUE COVERAGE (2 min)
  dialogue: {
    id: 'dialogue',
    name: 'Dialogue Pack',
    description: 'Master, OTS, close-ups for conversation scenes',
    shots: 5,
    estimatedTime: '2 min',
    estimatedCost: '$0.05',
    recommended: false,
    angles: [
      {
        type: 'Wide',
        angle: 'Master Shot',
        description: 'Wide master showing scene',
        category: 'distance'
      },
      {
        type: 'Medium',
        angle: 'Over The Shoulder Left',
        description: 'OTS shot from left',
        category: 'specialty'
      },
      {
        type: 'Medium',
        angle: 'Over The Shoulder Right',
        description: 'OTS shot from right',
        category: 'specialty'
      },
      {
        type: 'Close Up',
        angle: 'Front A',
        description: 'Close up front view',
        category: 'distance'
      },
      {
        type: 'Close Up',
        angle: 'Front B',
        description: 'Close up alternate angle',
        category: 'distance'
      }
    ]
  },

  // ACTION COVERAGE (2 min)
  action: {
    id: 'action',
    name: 'Action Pack',
    description: 'Dynamic shots for action sequences',
    shots: 5,
    estimatedTime: '2 min',
    estimatedCost: '$0.05',
    recommended: false,
    angles: [
      {
        type: 'Wide',
        angle: 'Action Master',
        description: 'Wide master shot showing action',
        category: 'distance'
      },
      {
        type: 'Low Angle',
        angle: 'Hero Power Shot',
        description: 'Low angle hero shot emphasizing power',
        category: 'height'
      },
      {
        type: 'Close Up',
        angle: 'Detail',
        description: 'Close up of key detail',
        category: 'distance'
      },
      {
        type: 'Overhead',
        angle: 'Bird Eye',
        description: 'Overhead shot showing layout',
        category: 'height'
      },
      {
        type: 'Medium',
        angle: 'Dutch Angle Tension',
        description: 'Dutch angle medium shot for tension',
        category: 'specialty'
      }
    ]
  },

  // PRODUCT HERO (2 min)
  productHero: {
    id: 'product-hero',
    name: 'Product Hero',
    description: 'Commercial product photography angles',
    shots: 6,
    estimatedTime: '2 min',
    estimatedCost: '$0.06',
    recommended: false,
    angles: [
      {
        type: 'Front View',
        angle: '3/4 Right',
        description: '3/4 front right view, hero angle',
        category: 'rotational'
      },
      {
        type: 'Close Up',
        angle: 'Logo Detail',
        description: 'Close up of brand logo/feature',
        category: 'distance'
      },
      {
        type: 'Wide',
        angle: 'Lifestyle Context',
        description: 'Product in lifestyle context',
        category: 'distance'
      },
      {
        type: 'Extreme Close Up',
        angle: 'Material Texture',
        description: 'Extreme close up of material/texture',
        category: 'distance'
      },
      {
        type: 'Side Profile',
        angle: 'Full Product',
        description: 'Clean side profile of full product',
        category: 'rotational'
      },
      {
        type: 'Overhead',
        angle: 'Top Down',
        description: 'Overhead top-down clean shot',
        category: 'height'
      }
    ]
  },

  // LOCATION PACK (3 min)
  location: {
    id: 'location',
    name: 'Location Pack',
    description: 'Environment variety for location shots',
    shots: 8,
    estimatedTime: '3 min',
    estimatedCost: '$0.08',
    recommended: false,
    angles: [
      {
        type: 'Extreme Wide',
        angle: 'Establishing',
        description: 'Extreme wide establishing shot',
        category: 'distance'
      },
      {
        type: 'Wide',
        angle: 'Environment Master',
        description: 'Wide master of environment',
        category: 'distance'
      },
      {
        type: 'Medium',
        angle: 'Detail Feature 1',
        description: 'Medium shot of key architectural detail',
        category: 'distance'
      },
      {
        type: 'Medium',
        angle: 'Detail Feature 2',
        description: 'Medium shot of secondary detail',
        category: 'distance'
      },
      {
        type: 'Close Up',
        angle: 'Texture Detail',
        description: 'Close up of surface texture',
        category: 'distance'
      },
      {
        type: 'Overhead',
        angle: 'Layout',
        description: 'Overhead showing spatial layout',
        category: 'height'
      },
      {
        type: 'Low Angle',
        angle: 'Architecture',
        description: 'Low angle emphasizing architecture',
        category: 'height'
      },
      {
        type: 'Dutch Angle',
        angle: 'Dynamic',
        description: 'Dutch angle for dynamic perspective',
        category: 'specialty'
      }
    ]
  }
};

/**
 * Get pack by ID
 */
export function getPackById(packId: string): CoveragePack | undefined {
  return COVERAGE_PACKS[packId];
}

/**
 * Get recommended pack
 */
export function getRecommendedPack(): CoveragePack {
  return COVERAGE_PACKS.contactSheet;
}

/**
 * Get all pack IDs
 */
export function getAllPackIds(): string[] {
  return Object.keys(COVERAGE_PACKS);
}

/**
 * Get packs for specific entity type
 */
export function getPacksForEntityType(
  entityType: 'character' | 'product' | 'location'
): CoveragePack[] {
  const packEntries = Object.entries(COVERAGE_PACKS);

  switch (entityType) {
    case 'character':
      return packEntries
        .filter(([key]) => ['turnaround', 'contactSheet', 'dialogue', 'action'].includes(key))
        .map(([, pack]) => pack);
    case 'product':
      return packEntries
        .filter(([key]) => ['turnaround', 'productHero'].includes(key))
        .map(([, pack]) => pack);
    case 'location':
      // Location only gets location-appropriate packs - NO contactSheet (has character shots)
      return packEntries
        .filter(([key]) => ['location'].includes(key))
        .map(([, pack]) => pack);
    default:
      return Object.values(COVERAGE_PACKS);
  }
}
