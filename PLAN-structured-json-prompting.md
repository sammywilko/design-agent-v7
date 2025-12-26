# Design Agent v8: Structured JSON Prompting System

## Executive Summary

Elevate Design Agent from string-concatenation prompting to a **first-class JSON schema system** that preserves structured data through the entire generation pipeline. This transforms the tool from "good prompting with vocabulary extraction" to "programmatic visual specification with full reproducibility."

---

## The Problem

Currently, your system extracts rich structured data:
- `StyleDNA` (colorPalette, lightingCharacteristics, compositionPatterns, moodKeywords)
- `ReferenceVocabulary` (poseVocabulary, lightingDNA, fabricBehavior, colorScience)
- `CharacterSpecs`, `LocationSpecs`, `ProductSpecs`

But then flattens it all to strings:

```typescript
// moodBoardService.ts:224-226
const styledPrompt = `${styleDNA.promptSnippet}\n\n${basePrompt}`;

// referenceIntelligence.ts:342
const constraintBlock = `\n\n=== VISUAL CONSISTENCY CONSTRAINTS ===\n${constraints.join('\n')}\n=== END CONSTRAINTS ===\n`;
```

This loses:
1. **Field-level control** - Can't tweak `lighting.colorTemp` without regenerating the whole `promptSnippet`
2. **Reproducibility** - Two identical prompts can drift based on how strings were concatenated
3. **A/B testing** - Can't compare `{ colorGrade: "teal-orange" }` vs `{ colorGrade: "natural" }` programmatically
4. **Batch consistency** - Sister Jane 50-shot campaign can't lock fields while varying others
5. **Debugging** - When a shot fails, you can't inspect which field caused the issue

---

## The Solution: StructuredImagePrompt Schema

### Phase 1: Core Schema (`/services/structuredPrompt.ts`)

```typescript
/**
 * Unified JSON schema for all image generation requests.
 * This is the "single source of truth" that flows through the entire pipeline.
 */
export interface StructuredImagePrompt {
  // ===== IDENTITY =====
  schemaVersion: "1.0";
  id: string;              // UUID for tracking/debugging
  createdAt: number;

  // ===== SUBJECT LAYER =====
  subject: {
    type: "CHARACTER" | "LOCATION" | "PRODUCT" | "SCENE";
    description: string;   // The core creative intent

    // Character-specific (from CharacterSpecs)
    character?: {
      name: string;
      age?: string;
      gender?: string;
      ethnicity?: string;
      skinTone?: string;
      hairColor?: string;
      hairStyle?: string;
      bodyType?: string;
      distinctiveFeatures?: string[];
      clothing?: string;
      expression?: string;
    };

    // Location-specific (from LocationSpecs)
    location?: {
      name: string;
      type?: string;        // "urban street", "office", "beach"
      architectureStyle?: string;
      era?: string;
      keyElements?: string[];
      realWorldLocation?: string;  // For grounding
    };

    // Product-specific (from ProductSpecs)
    product?: {
      name: string;
      category?: string;
      materials?: string[];
      finishes?: string[];
      logoPlacement?: string;
      distinctiveFeatures?: string[];
    };
  };

  // ===== POSE LAYER ===== (from PoseVocabulary)
  pose?: {
    bodyAngle?: string;     // "three-quarter-left", "frontal", "profile-right"
    headTilt?: string;      // "slight-left-tilt", "neutral", "chin-up"
    shoulderLine?: string;  // "relaxed", "squared", "asymmetric"
    gesture?: string;       // "hands-in-pockets", "arms-crossed"
    eyeDirection?: string;  // "camera-direct", "slight-left", "downcast"
    action?: string;        // "walking", "jumping", "seated"
  };

  // ===== LIGHTING LAYER ===== (from LightingDNA)
  lighting: {
    keyLight: {
      direction: string;    // "upper-left-45", "frontal", "rim-only"
      quality: string;      // "soft", "hard", "mixed"
      intensity: string;    // "low-key", "high-key", "natural"
    };
    fillRatio?: string;     // "1:2", "1:4", "no-fill"
    rimLight?: boolean;
    practicalSources?: string[];  // ["window-left", "neon-signs"]
    colorTemperature: string;     // "warm-3200k", "daylight-5600k", "cool-6500k"
    timeOfDay?: string;           // "golden-hour", "blue-hour", "midday", "night"
    weather?: string;             // "overcast", "harsh-sun", "fog"
  };

  // ===== COLOR LAYER ===== (from ColorScience + StyleDNA)
  color: {
    palette: string[];      // Hex codes: ["#3A5F7D", "#FF6B9D"]
    colorGrade: string;     // "teal-orange", "natural", "desaturated", "warm-filmic"
    saturation: string;     // "punchy", "natural", "muted"
    contrast: string;       // "high", "medium", "low"
    skinTones?: {
      highlights: string;
      midtones: string;
      shadows: string;
    };
  };

  // ===== COMPOSITION LAYER ===== (from CompositionRules)
  composition: {
    rule: string;           // "rule-of-thirds", "centered", "golden-ratio"
    subjectPlacement: string;  // "left-third", "center", "right-third"
    headRoom?: string;      // "tight", "generous", "none"
    lookingRoom?: boolean;
    depthOfField: string;   // "shallow-f1.4", "medium-f4", "deep-f11"
    focalLength?: string;   // "24mm", "50mm", "85mm", "135mm"
  };

  // ===== CAMERA LAYER =====
  camera: {
    angle: string;          // "eye-level", "high-angle", "low-angle", "dutch"
    shotType: string;       // "ECU", "CU", "MCU", "MS", "MWS", "WS", "EWS"
    movement?: string;      // "static", "dolly-in", "tracking", "handheld"
    lens?: string;          // "anamorphic", "spherical"
  };

  // ===== STYLE LAYER ===== (from StyleDNA)
  style: {
    aesthetic: string;      // "cinematic-noir", "editorial-fashion", "documentary"
    medium?: string;        // "photography", "3d-render", "illustration"
    era?: string;           // "1980s", "futuristic", "contemporary"
    references?: string[];  // Style reference descriptions
    mood: string[];         // ["mysterious", "edgy", "contemplative"]
  };

  // ===== FABRIC/MATERIAL LAYER ===== (from FabricBehavior)
  materials?: {
    primary?: {
      material: string;     // "cotton", "silk", "leather"
      weight: string;       // "light", "medium", "heavy"
      drape: string;        // "structured", "flowing", "fitted"
      texture: string;      // "matte", "slight-sheen", "reflective"
    };
    secondary?: {
      material: string;
      texture: string;
    };
  };

  // ===== CONSTRAINTS =====
  constraints: {
    require: string[];      // Must include these elements
    avoid: string[];        // Never include these (negative prompt)
    strict?: string[];      // Hard requirements that override other fields
  };

  // ===== GENERATION CONFIG =====
  output: {
    aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
    resolution: "1K" | "2K" | "4K";
    model?: "nano-banana-pro" | "flash";
  };

  // ===== REFERENCE IMAGES =====
  references: {
    character?: string[];   // Base64 character reference images
    location?: string[];
    product?: string[];
    style?: string[];
  };

  // ===== METADATA =====
  metadata: {
    source: "manual" | "beat" | "coverage" | "variant";
    beatId?: string;
    shotId?: string;
    projectId?: string;
    parentPromptId?: string;  // For variants/iterations
  };
}
```

### Phase 2: Schema Builder Functions

```typescript
// ===== BUILDER FUNCTIONS =====

/**
 * Build a StructuredImagePrompt from existing vocabulary/style objects
 */
export function buildFromVocabulary(
  baseDescription: string,
  vocabulary?: ReferenceVocabulary,
  styleDNA?: StyleDNA,
  specs?: CharacterSpecs | LocationSpecs | ProductSpecs
): StructuredImagePrompt {
  // Merge all structured data into unified schema
}

/**
 * Build from @mention entity bundles (SmartPromptInput)
 */
export function buildFromBundles(
  textPrompt: string,
  bundles: ReferenceBundle[],
  moodBoard?: MoodBoard
): StructuredImagePrompt {
  // Extract entity data, merge with text intent
}

/**
 * Create variant by overriding specific fields
 */
export function createVariant(
  base: StructuredImagePrompt,
  overrides: Partial<StructuredImagePrompt>
): StructuredImagePrompt {
  // Deep merge with field-level control
}

/**
 * Serialize to Gemini-ready prompt
 * This is the ONLY place string conversion happens
 */
export function serializeForGemini(prompt: StructuredImagePrompt): string {
  return JSON.stringify(prompt, null, 2);
}

/**
 * Serialize to natural language (for comparison/debugging)
 */
export function serializeToNaturalLanguage(prompt: StructuredImagePrompt): string {
  // Convert JSON to readable prose
}
```

### Phase 3: Integration Points

#### 3.1 Update `gemini.ts` generateImage()

```typescript
// Current signature
export const generateImage = async (
  prompt: string,
  references: ReferenceAsset[],
  config: GenerationConfig,
  useGrounding: boolean = false
): Promise<GeneratedImage>

// New signature (backwards compatible)
export const generateImage = async (
  prompt: string | StructuredImagePrompt,
  references: ReferenceAsset[],
  config: GenerationConfig,
  useGrounding: boolean = false
): Promise<GeneratedImage> {

  // If structured prompt, serialize it
  const finalPrompt = typeof prompt === 'object'
    ? serializeForGemini(prompt)
    : prompt;

  // Store structured prompt in generation context for reproducibility
  const generationContext: GenerationContext = {
    structuredPrompt: typeof prompt === 'object' ? prompt : undefined,
    // ...existing context
  };
}
```

#### 3.2 Update SmartPromptInput

```typescript
// Current: builds ReferenceBundle[] and text string
// New: builds StructuredImagePrompt object

interface SmartPromptInputProps {
  value: string;
  onChange: (text: string) => void;
  onBundlesChange: (bundles: ReferenceBundle[]) => void;

  // NEW: Structured prompt output
  onStructuredPromptChange?: (prompt: StructuredImagePrompt) => void;
}

// When user types and @mentions entities:
const handleStructuredBuild = () => {
  const structured = buildFromBundles(value, activeBundles, activeMoodBoard);
  onStructuredPromptChange?.(structured);
};
```

#### 3.3 Update moodBoardService.ts

```typescript
// Current
export const injectStyleDNA = (basePrompt: string, styleDNA: StyleDNA): string => {
  const styledPrompt = `${styleDNA.promptSnippet}\n\n${basePrompt}`;
  return styledPrompt;
};

// New
export const applyStyleDNA = (
  prompt: StructuredImagePrompt,
  styleDNA: StyleDNA
): StructuredImagePrompt => {
  return {
    ...prompt,
    color: {
      ...prompt.color,
      palette: styleDNA.colorPalette,
    },
    lighting: {
      ...prompt.lighting,
      // Map lighting characteristics
    },
    style: {
      ...prompt.style,
      aesthetic: styleDNA.photographicStyle,
      mood: styleDNA.moodKeywords,
    },
    composition: {
      ...prompt.composition,
      rule: styleDNA.compositionPatterns[0] || prompt.composition.rule,
    }
  };
};
```

#### 3.4 Update referenceIntelligence.ts

```typescript
// Current
enhancePromptWithVocabulary(
  basePrompt: string,
  vocabulary: ReferenceVocabulary,
  level: ConsistencyLevel = 'moderate'
): string

// New
applyVocabulary(
  prompt: StructuredImagePrompt,
  vocabulary: ReferenceVocabulary,
  level: ConsistencyLevel = 'moderate'
): StructuredImagePrompt {
  return {
    ...prompt,
    pose: vocabulary.poseVocabulary[0] ? {
      bodyAngle: vocabulary.poseVocabulary[0].bodyAngle,
      headTilt: vocabulary.poseVocabulary[0].headTilt,
      gesture: vocabulary.poseVocabulary[0].gesture,
      eyeDirection: vocabulary.poseVocabulary[0].eyeDirection,
    } : prompt.pose,
    lighting: {
      ...prompt.lighting,
      keyLight: vocabulary.lightingDNA.keyLight,
      fillRatio: vocabulary.lightingDNA.fillRatio,
      rimLight: vocabulary.lightingDNA.rimLight,
      colorTemperature: vocabulary.lightingDNA.colorTemp,
    },
    color: {
      ...prompt.color,
      palette: vocabulary.colorScience.dominantColors.map(c => c.hex),
      colorGrade: vocabulary.colorScience.colorGrade,
      saturation: vocabulary.colorScience.saturation,
      contrast: vocabulary.colorScience.contrast,
    },
    materials: vocabulary.fabricBehavior ? {
      primary: {
        material: vocabulary.fabricBehavior.material,
        weight: vocabulary.fabricBehavior.weight,
        drape: vocabulary.fabricBehavior.drape,
        texture: vocabulary.fabricBehavior.surfaceTexture,
      }
    } : prompt.materials,
  };
}
```

### Phase 4: Batch Operations & Templates

#### 4.1 Coverage Pack Templates

```typescript
// Pre-built JSON templates for common generation patterns
export const COVERAGE_TEMPLATES = {
  'character-turnaround': [
    { pose: { bodyAngle: 'frontal' }, camera: { shotType: 'MS' } },
    { pose: { bodyAngle: 'three-quarter-left' }, camera: { shotType: 'MS' } },
    { pose: { bodyAngle: 'profile-left' }, camera: { shotType: 'MS' } },
    { pose: { bodyAngle: 'three-quarter-back' }, camera: { shotType: 'MS' } },
  ],

  'product-hero': [
    { camera: { angle: 'eye-level', shotType: 'MS' }, lighting: { keyLight: { quality: 'soft' } } },
    { camera: { angle: 'high-angle', shotType: 'WS' }, lighting: { keyLight: { quality: 'soft' } } },
    { camera: { angle: 'low-angle', shotType: 'CU' }, lighting: { keyLight: { direction: 'rim-only' } } },
  ],

  'location-establishment': [
    { camera: { shotType: 'EWS' }, lighting: { timeOfDay: 'golden-hour' } },
    { camera: { shotType: 'WS' }, lighting: { timeOfDay: 'blue-hour' } },
    { camera: { shotType: 'MS', angle: 'dutch' }, lighting: { timeOfDay: 'night' } },
  ],
};

/**
 * Generate batch from base prompt + template
 */
export function generateFromTemplate(
  base: StructuredImagePrompt,
  template: Partial<StructuredImagePrompt>[]
): StructuredImagePrompt[] {
  return template.map(overrides => createVariant(base, overrides));
}
```

#### 4.2 A/B Variant Generation

```typescript
/**
 * Generate variants for comparison
 * Useful for "explore options" feature
 */
export function generateVariants(
  base: StructuredImagePrompt,
  dimension: keyof StructuredImagePrompt,
  options: any[]
): StructuredImagePrompt[] {
  return options.map(option => createVariant(base, { [dimension]: option }));
}

// Example: Test 3 different color grades
const colorVariants = generateVariants(basePrompt, 'color', [
  { ...basePrompt.color, colorGrade: 'teal-orange' },
  { ...basePrompt.color, colorGrade: 'natural' },
  { ...basePrompt.color, colorGrade: 'warm-filmic' },
]);
```

### Phase 5: Storage & Reproducibility

```typescript
// Extend GeneratedImage to store structured prompt
interface GeneratedImage {
  // ...existing fields

  // NEW: Full structured prompt for reproducibility
  structuredPrompt?: StructuredImagePrompt;
}

// Extend GenerationContext
interface GenerationContext {
  // ...existing fields

  // NEW
  structuredPrompt?: StructuredImagePrompt;
  serializationMethod: 'json' | 'natural-language';
}
```

---

## Implementation Roadmap

### Week 1: Foundation
1. Create `/services/structuredPrompt.ts` with full schema
2. Implement `buildFromVocabulary()` and `serializeForGemini()`
3. Add optional structured prompt support to `generateImage()`
4. Unit tests for schema validation and serialization

### Week 2: Integration
1. Update `SmartPromptInput` to emit structured prompts
2. Refactor `moodBoardService.ts` to use `applyStyleDNA()`
3. Refactor `referenceIntelligence.ts` to use `applyVocabulary()`
4. Store structured prompts in `GeneratedImage.structuredPrompt`

### Week 3: Templates & Batch
1. Create coverage pack templates
2. Implement `generateFromTemplate()` for batch generation
3. Add variant generation for "Explore Options"
4. UI for viewing/editing structured prompt JSON

### Week 4: Polish & Testing
1. Migration for existing prompts → structured format
2. Prompt diff tool (compare two generations)
3. Field-level override UI in Edit Canvas
4. Production testing with Sister Jane batch

---

## Business Impact

| Capability | Before | After |
|------------|--------|-------|
| Batch consistency | Manual prompt copy-paste | Lock fields, vary only subject |
| Client revision | Re-explain entire prompt | "Change `lighting.colorTemp` to 5600K" |
| Debugging | Read 200-word prompt, guess | Inspect JSON, identify field |
| Reproducibility | Hope prompt text matches | Exact JSON = exact result |
| A/B testing | Generate variations manually | `generateVariants('color', options)` |
| Coverage packs | Build each prompt manually | Apply template overlay |
| Producer suggestions | "Add warmer lighting" | "Set `lighting.colorTemp: 'warm-3200k'`" |

---

## Technical Notes

### Gemini Compatibility
Gemini models can interpret JSON prompts effectively. The key is consistent structure:
- Place JSON at the start of the prompt
- Keep field names semantic and readable
- Use concise values (not paragraphs)

### Backwards Compatibility
- All existing string prompts continue to work
- Structured prompts are optional enhancement
- Migration path: extract structured data from successful generations

### Performance
- JSON serialization is cheap (~1ms)
- No additional API calls
- Slightly larger prompts (by ~20%) but more precise

---

## Files to Create/Modify

### New Files
- `/services/structuredPrompt.ts` - Core schema and builders
- `/services/promptTemplates.ts` - Coverage pack templates
- `/components/StructuredPromptEditor.tsx` - Optional JSON editor UI

### Modified Files
- `/services/gemini.ts` - Accept structured prompts
- `/services/moodBoardService.ts` - Use `applyStyleDNA()`
- `/services/referenceIntelligence.ts` - Use `applyVocabulary()`
- `/components/SmartPromptInput.tsx` - Emit structured prompts
- `/types.ts` - Add StructuredImagePrompt, extend GeneratedImage
