/**
 * Reference Intelligence Service
 *
 * Extracts and applies visual vocabulary from reference images to ensure
 * consistent character, location, and product rendering across generations.
 */

import { GoogleGenAI, Part } from '@google/genai';

// ============================================================================
// TYPES
// ============================================================================

export interface PoseVocabulary {
  id: string;
  bodyAngle: string;        // 'three-quarter-left' | 'frontal' | 'profile-right' | etc
  headTilt: string;         // 'slight-left-tilt' | 'neutral' | 'chin-up' | etc
  shoulderLine: string;     // 'relaxed' | 'squared' | 'asymmetric' | etc
  gesture: string;          // 'hands-in-pockets' | 'arms-crossed' | 'hands-visible' | etc
  eyeDirection: string;     // 'camera-direct' | 'slight-left' | 'downcast' | etc
  weight: number;           // 0-1, how prominent this pose is in refs
}

export interface LightingDNA {
  keyLight: {
    direction: string;      // 'upper-left-45' | 'frontal' | 'rim-only' | etc
    quality: string;        // 'soft' | 'hard' | 'mixed'
    intensity: string;      // 'low-key' | 'high-key' | 'natural'
  };
  fillRatio: string;        // '1:2' | '1:4' | 'no-fill' | etc
  rimLight: boolean;
  practicalSources: string[]; // ['window-left', 'neon-signs', etc]
  colorTemp: string;        // 'warm-3200k' | 'daylight-5600k' | 'cool-6500k'
  confidence: number;       // 0-100
}

export interface FabricBehavior {
  material: string;         // 'cotton', 'silk', 'leather', 'denim'
  weight: string;           // 'light', 'medium', 'heavy'
  drape: string;            // 'structured', 'flowing', 'fitted'
  wrinklePattern: string[]; // ['elbow-creases', 'hem-bunch', etc]
  surfaceTexture: string;   // 'matte', 'slight-sheen', 'reflective'
  colorFastness: string;    // 'vibrant', 'muted', 'washed-out'
}

export interface CompositionRule {
  type: string;             // 'rule-of-thirds' | 'centered' | 'golden-ratio'
  subjectPlacement: string; // 'left-third' | 'center' | 'right-third'
  headRoom: string;         // 'tight' | 'generous' | 'none'
  lookingRoom: boolean;     // Follows look direction
  depthOfField: string;     // 'shallow-f1.4' | 'medium-f4' | 'deep-f11'
}

export interface ColorScience {
  dominantColors: Array<{
    hex: string;
    name: string;
    percentage: number;
  }>;
  skinTones: {
    highlights: string;
    midtones: string;
    shadows: string;
  };
  colorGrade: string;       // 'teal-orange' | 'natural' | 'desaturated' | etc
  saturation: string;       // 'punchy' | 'natural' | 'muted'
  contrast: string;         // 'high' | 'medium' | 'low'
}

export interface ReferenceVocabulary {
  id: string;
  sourceImages: string[];
  createdAt: number;
  focusArea: 'character' | 'location' | 'product' | 'style';

  // Extracted vocabularies
  poseVocabulary: PoseVocabulary[];
  lightingDNA: LightingDNA;
  fabricBehavior: FabricBehavior;
  compositionRules: CompositionRule[];
  colorScience: ColorScience;

  // Generation constraints
  generationConstraints: string;  // Pre-built constraint string for prompts
  styleFingerprint: string;       // Unique visual signature description

  // Quality metrics
  confidenceScore: number;        // 0-100, overall extraction confidence
  version: string;                // Schema version
}

export interface ValidationResult {
  aspect: string;           // 'pose' | 'lighting' | 'color' | 'fabric'
  isConsistent: boolean;
  confidence: number;       // 0-100
  deviation: string;        // Description of what's different
  severity: 'critical' | 'moderate' | 'minor';
  suggestion: string;       // How to fix
}

export type ConsistencyLevel = 'subtle' | 'moderate' | 'strict';

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ReferenceIntelligenceService {
  private genAI: GoogleGenAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
  }

  // ==========================================================================
  // EXTRACTION
  // ==========================================================================

  /**
   * Extract visual vocabulary from reference images
   */
  async extractReferenceVocabulary(
    imageUrls: string[],
    focusArea: 'character' | 'location' | 'product' | 'style'
  ): Promise<ReferenceVocabulary> {
    const systemPrompt = this.buildExtractionPrompt(focusArea);

    // Build parts with images
    const parts: Part[] = [{ text: systemPrompt }];

    for (const imageUrl of imageUrls.slice(0, 5)) { // Max 5 images
      const base64 = imageUrl.startsWith('data:')
        ? imageUrl.split(',')[1]
        : imageUrl;

      parts.push({
        inlineData: {
          data: base64,
          mimeType: 'image/png'
        }
      });
    }

    parts.push({ text: '\n\nAnalyze these images and extract the visual vocabulary as specified. Return valid JSON only.' });

    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts }]
      });

      const response = result.text || '';

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const extracted = JSON.parse(jsonMatch[0]);

      // Build vocabulary object
      const vocabulary: ReferenceVocabulary = {
        id: `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceImages: imageUrls,
        createdAt: Date.now(),
        focusArea,
        poseVocabulary: extracted.poseVocabulary || [],
        lightingDNA: extracted.lightingDNA || this.getDefaultLightingDNA(),
        fabricBehavior: extracted.fabricBehavior || this.getDefaultFabricBehavior(),
        compositionRules: extracted.compositionRules || [],
        colorScience: extracted.colorScience || this.getDefaultColorScience(),
        generationConstraints: this.buildConstraintString(extracted),
        styleFingerprint: extracted.styleFingerprint || 'No distinct style fingerprint extracted',
        confidenceScore: extracted.confidenceScore || 70,
        version: '1.0'
      };

      return vocabulary;

    } catch (error) {
      console.error('Vocabulary extraction failed:', error);
      // Return default vocabulary on failure
      return this.getDefaultVocabulary(imageUrls, focusArea);
    }
  }

  private buildExtractionPrompt(focusArea: string): string {
    return `You are a visual analysis expert. Analyze the provided reference image(s) and extract detailed visual vocabulary.

Focus Area: ${focusArea.toUpperCase()}

Extract the following information and return as JSON:

{
  "poseVocabulary": [
    {
      "id": "pose-1",
      "bodyAngle": "three-quarter-left | frontal | profile-right | etc",
      "headTilt": "slight-left-tilt | neutral | chin-up | etc",
      "shoulderLine": "relaxed | squared | asymmetric",
      "gesture": "hands-in-pockets | arms-crossed | hands-visible | natural",
      "eyeDirection": "camera-direct | slight-left | downcast | etc",
      "weight": 0.8
    }
  ],

  "lightingDNA": {
    "keyLight": {
      "direction": "upper-left-45 | frontal | rim-only | etc",
      "quality": "soft | hard | mixed",
      "intensity": "low-key | high-key | natural"
    },
    "fillRatio": "1:2 | 1:4 | no-fill",
    "rimLight": true/false,
    "practicalSources": ["window-left", "neon-signs"],
    "colorTemp": "warm-3200k | daylight-5600k | cool-6500k",
    "confidence": 85
  },

  "fabricBehavior": {
    "material": "cotton | silk | leather | denim",
    "weight": "light | medium | heavy",
    "drape": "structured | flowing | fitted",
    "wrinklePattern": ["elbow-creases", "hem-bunch"],
    "surfaceTexture": "matte | slight-sheen | reflective",
    "colorFastness": "vibrant | muted | washed-out"
  },

  "compositionRules": [
    {
      "type": "rule-of-thirds | centered | golden-ratio",
      "subjectPlacement": "left-third | center | right-third",
      "headRoom": "tight | generous | none",
      "lookingRoom": true/false,
      "depthOfField": "shallow-f1.4 | medium-f4 | deep-f11"
    }
  ],

  "colorScience": {
    "dominantColors": [
      { "hex": "#3A5F7D", "name": "slate blue", "percentage": 35 }
    ],
    "skinTones": {
      "highlights": "warm peachy",
      "midtones": "neutral beige",
      "shadows": "cool olive"
    },
    "colorGrade": "teal-orange | natural | desaturated | warm-filmic",
    "saturation": "punchy | natural | muted",
    "contrast": "high | medium | low"
  },

  "styleFingerprint": "A brief 1-2 sentence description of the unique visual signature",

  "confidenceScore": 0-100
}

Be specific and technical. Base all analysis on what you actually see in the images.`;
  }

  // ==========================================================================
  // PROMPT ENHANCEMENT
  // ==========================================================================

  /**
   * Enhance a generation prompt with vocabulary constraints
   */
  enhancePromptWithVocabulary(
    basePrompt: string,
    vocabulary: ReferenceVocabulary,
    level: ConsistencyLevel = 'moderate'
  ): string {
    const constraints: string[] = [];

    // Lighting constraints
    if (vocabulary.lightingDNA.confidence > 60) {
      const light = vocabulary.lightingDNA;
      if (level === 'strict') {
        constraints.push(`LIGHTING: ${light.keyLight.direction} key light, ${light.keyLight.quality} quality, ${light.fillRatio} fill ratio, ${light.colorTemp} color temperature`);
      } else if (level === 'moderate') {
        constraints.push(`LIGHTING: ${light.keyLight.quality} ${light.keyLight.direction} lighting, ${light.colorTemp}`);
      } else {
        constraints.push(`LIGHTING: ${light.keyLight.quality} quality`);
      }

      if (light.rimLight && level !== 'subtle') {
        constraints.push('with rim/edge lighting');
      }
    }

    // Pose constraints (for characters)
    if (vocabulary.poseVocabulary.length > 0 && vocabulary.focusArea === 'character') {
      const pose = vocabulary.poseVocabulary[0];
      if (level === 'strict') {
        constraints.push(`POSE: ${pose.bodyAngle} body angle, ${pose.headTilt} head tilt, ${pose.gesture}, ${pose.eyeDirection} eye direction`);
      } else if (level === 'moderate') {
        constraints.push(`POSE: ${pose.bodyAngle}, ${pose.gesture}`);
      }
    }

    // Color constraints
    if (vocabulary.colorScience.dominantColors.length > 0) {
      const colors = vocabulary.colorScience;
      if (level === 'strict') {
        const colorNames = colors.dominantColors.slice(0, 3).map(c => c.name).join(', ');
        constraints.push(`COLOR PALETTE: ${colorNames}, ${colors.colorGrade} grade, ${colors.saturation} saturation`);
      } else if (level === 'moderate') {
        constraints.push(`COLOR: ${colors.colorGrade} color grade, ${colors.saturation} saturation`);
      }
    }

    // Fabric constraints (for characters/products)
    if (vocabulary.fabricBehavior.material && ['character', 'product'].includes(vocabulary.focusArea)) {
      const fabric = vocabulary.fabricBehavior;
      if (level === 'strict') {
        constraints.push(`FABRIC: ${fabric.material}, ${fabric.weight} weight, ${fabric.drape} drape, ${fabric.surfaceTexture} surface`);
      } else if (level === 'moderate') {
        constraints.push(`FABRIC: ${fabric.material}, ${fabric.surfaceTexture}`);
      }
    }

    // Composition constraints
    if (vocabulary.compositionRules.length > 0) {
      const comp = vocabulary.compositionRules[0];
      if (level === 'strict') {
        constraints.push(`COMPOSITION: ${comp.type}, subject ${comp.subjectPlacement}, ${comp.depthOfField} depth of field`);
      } else if (level === 'moderate') {
        constraints.push(`COMPOSITION: ${comp.depthOfField} depth of field`);
      }
    }

    // Style fingerprint (always include if available)
    if (vocabulary.styleFingerprint && vocabulary.styleFingerprint !== 'No distinct style fingerprint extracted') {
      constraints.push(`STYLE: ${vocabulary.styleFingerprint}`);
    }

    // Build enhanced prompt
    if (constraints.length === 0) {
      return basePrompt;
    }

    const constraintBlock = `\n\n=== VISUAL CONSISTENCY CONSTRAINTS ===\n${constraints.join('\n')}\n=== END CONSTRAINTS ===\n`;

    return basePrompt + constraintBlock;
  }

  /**
   * Get negative prompt additions based on vocabulary
   */
  getNegativePromptAdditions(
    vocabulary: ReferenceVocabulary,
    level: ConsistencyLevel = 'moderate'
  ): string {
    const negatives: string[] = [];

    // Lighting negatives
    if (vocabulary.lightingDNA.confidence > 60) {
      const light = vocabulary.lightingDNA;

      // Prevent opposite lighting
      if (light.keyLight.direction.includes('left')) {
        negatives.push('lighting from right');
      } else if (light.keyLight.direction.includes('right')) {
        negatives.push('lighting from left');
      }

      if (light.keyLight.quality === 'soft') {
        negatives.push('harsh lighting', 'hard shadows');
      } else if (light.keyLight.quality === 'hard') {
        negatives.push('flat lighting', 'no shadows');
      }

      if (light.colorTemp.includes('warm')) {
        negatives.push('cold lighting', 'blue tint');
      } else if (light.colorTemp.includes('cool')) {
        negatives.push('warm lighting', 'orange tint');
      }
    }

    // Color negatives
    if (vocabulary.colorScience.saturation === 'muted') {
      negatives.push('oversaturated', 'vivid colors', 'neon');
    } else if (vocabulary.colorScience.saturation === 'punchy') {
      negatives.push('desaturated', 'washed out', 'grey');
    }

    if (vocabulary.colorScience.contrast === 'low') {
      negatives.push('high contrast', 'crushed blacks');
    } else if (vocabulary.colorScience.contrast === 'high') {
      negatives.push('flat', 'no contrast', 'milky');
    }

    // Only include more negatives for stricter levels
    if (level === 'strict') {
      negatives.push('inconsistent style', 'style drift', 'different aesthetic');
    }

    return negatives.join(', ');
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate generated image against vocabulary
   */
  async validateConsistency(
    generatedImageUrl: string,
    vocabulary: ReferenceVocabulary,
    aspectsToCheck: string[] = ['pose', 'lighting', 'color', 'fabric']
  ): Promise<ValidationResult[]> {
    const validationPrompt = `You are a visual consistency validator. Compare the generated image against these reference specifications:

REFERENCE VOCABULARY:
${JSON.stringify(vocabulary, null, 2)}

ASPECTS TO VALIDATE: ${aspectsToCheck.join(', ')}

For each aspect, determine:
1. Is it consistent with the reference?
2. What is the confidence level (0-100)?
3. If inconsistent, what is different?
4. How severe is the deviation (critical/moderate/minor)?
5. What would fix it?

Return JSON array:
[
  {
    "aspect": "pose",
    "isConsistent": true/false,
    "confidence": 85,
    "deviation": "Description of what's different",
    "severity": "critical | moderate | minor",
    "suggestion": "How to fix"
  }
]

Be strict but fair. Small variations are expected.`;

    const base64 = generatedImageUrl.startsWith('data:')
      ? generatedImageUrl.split(',')[1]
      : generatedImageUrl;

    try {
      const parts: Part[] = [
        { text: validationPrompt },
        {
          inlineData: {
            data: base64,
            mimeType: 'image/png'
          }
        },
        { text: '\n\nValidate this generated image and return JSON array only.' }
      ];

      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts }]
      });

      const response = result.text || '';
      const jsonMatch = response.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        return this.getDefaultValidation(aspectsToCheck);
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('Validation failed:', error);
      return this.getDefaultValidation(aspectsToCheck);
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private buildConstraintString(extracted: any): string {
    const parts: string[] = [];

    if (extracted.lightingDNA) {
      parts.push(`Lighting: ${extracted.lightingDNA.keyLight?.direction || 'natural'}`);
    }
    if (extracted.colorScience?.colorGrade) {
      parts.push(`Color: ${extracted.colorScience.colorGrade}`);
    }
    if (extracted.poseVocabulary?.[0]) {
      parts.push(`Pose: ${extracted.poseVocabulary[0].bodyAngle}`);
    }

    return parts.join(' | ') || 'No specific constraints extracted';
  }

  private getDefaultLightingDNA(): LightingDNA {
    return {
      keyLight: {
        direction: 'upper-left-45',
        quality: 'soft',
        intensity: 'natural'
      },
      fillRatio: '1:2',
      rimLight: false,
      practicalSources: [],
      colorTemp: 'daylight-5600k',
      confidence: 50
    };
  }

  private getDefaultFabricBehavior(): FabricBehavior {
    return {
      material: 'cotton',
      weight: 'medium',
      drape: 'natural',
      wrinklePattern: [],
      surfaceTexture: 'matte',
      colorFastness: 'natural'
    };
  }

  private getDefaultColorScience(): ColorScience {
    return {
      dominantColors: [],
      skinTones: {
        highlights: 'neutral',
        midtones: 'neutral',
        shadows: 'neutral'
      },
      colorGrade: 'natural',
      saturation: 'natural',
      contrast: 'medium'
    };
  }

  private getDefaultVocabulary(
    imageUrls: string[],
    focusArea: 'character' | 'location' | 'product' | 'style'
  ): ReferenceVocabulary {
    return {
      id: `vocab-${Date.now()}-default`,
      sourceImages: imageUrls,
      createdAt: Date.now(),
      focusArea,
      poseVocabulary: [],
      lightingDNA: this.getDefaultLightingDNA(),
      fabricBehavior: this.getDefaultFabricBehavior(),
      compositionRules: [],
      colorScience: this.getDefaultColorScience(),
      generationConstraints: 'No specific constraints',
      styleFingerprint: 'No distinct style fingerprint extracted',
      confidenceScore: 30,
      version: '1.0'
    };
  }

  private getDefaultValidation(aspects: string[]): ValidationResult[] {
    return aspects.map(aspect => ({
      aspect,
      isConsistent: true,
      confidence: 50,
      deviation: 'Unable to validate - using default pass',
      severity: 'minor' as const,
      suggestion: 'Manual review recommended'
    }));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let serviceInstance: ReferenceIntelligenceService | null = null;

export const getReferenceIntelligenceService = (apiKey: string): ReferenceIntelligenceService => {
  if (!serviceInstance) {
    serviceInstance = new ReferenceIntelligenceService(apiKey);
  }
  return serviceInstance;
};

export default ReferenceIntelligenceService;
