
export const APP_VERSION = '7.0';

// Tool Modes for Deterministic Asset Generation
export type ToolMode = 
  | 'STANDARD' 
  | 'CHARACTER_SHEET' 
  | 'HERO_SHOT' 
  | 'INFOGRAPHIC' 
  | 'FASHION_RUNWAY' 
  | 'PRODUCT_SHOWCASE'
  | 'ENVIRONMENT_PLATE';

// Visual DNA / Lookbook - The "Visual Constitution" of a project
export interface Lookbook {
  visualStyleTags: string[];      // ['Cyberpunk', 'Noir', 'Sport-Fashion']
  colourPalette: string;          // "Teal, Magenta, Deep Black"
  typographyNotes: string;        // "Bold Sans-Serif, Industrial"
  compositionRules: string;       // "Rule of thirds, center framing"
  grainTextureRules: string;      // "16mm film grain"
  cameraLanguage: string;         // "Anamorphic, Handheld"
  lightingApproach: string;       // "High contrast, neon practicals"
  referenceFrames: string[];      // URLs to style reference images
}

// Reference Bundle for @mention injection
export interface ReferenceBundle {
  type: 'CHARACTER' | 'LOCATION' | 'PRODUCT';
  id: string;
  name: string;
  primaryRef: string;       // Hero image (character sheet preferred)
  auxiliaryRefs: string[];  // Coverage shots
  promptSnippet?: string;   // Style description
}

export enum AppStage {
  STAGE_0_SCRIPT = 'STAGE_0_SCRIPT',
  STAGE_1_CONCEPT = 'STAGE_1_CONCEPT',
  STAGE_2_EDITING = 'STAGE_2_EDITING',
  STAGE_3_STORYBOARD = 'STAGE_3_STORYBOARD',
  STAGE_4_VIDEO = 'STAGE_4_VIDEO'
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type ImageResolution = '1K' | '2K' | '4K';
export type ReferenceType = 'Character' | 'Location' | 'Product' | 'Style' | 'General';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
}

export interface ReferenceAsset {
  id: string;
  data: string; // Base64
  type: ReferenceType;
  name?: string;
  styleDescription?: string; // The extracted DNA
}

export interface SavedEntity {
  id: string;
  projectId: string; // Database Index
  name: string;
  data: string; // Base64
  type: ReferenceType;
  styleDescription?: string;
  campaignId: string; // Logical Grouping (Settings)
  createdAt: number;
}

export interface Campaign {
  id: string;
  name: string;
}

export interface SavedPrompt {
    id: string;
    projectId: string;
    text: string;
    createdAt: number;
}

export interface Message {
  id: string;
  projectId: string; // Database Index
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  images?: GeneratedImage[];
  isThinking?: boolean;
}

export interface ProducerMessage {
    id: string;
    role: 'user' | 'producer';
    content: string;
    timestamp: number;
}

// Quality Score for AI-evaluated images
export interface QualityScore {
    adherence: number;      // 1-10: How well it matches the prompt
    technical: number;      // 1-10: Focus, lighting, composition
    overall: number;        // 1-10: Combined score
    issues?: string[];      // Identified problems
    suggestions?: string[]; // Improvement suggestions
}

// NEW: Generation Context for Reproducibility
export interface GenerationContext {
    model: string;
    promptUsed: string;
    referenceIds: string[];
    aspectRatio: string;
    resolution: string;
    timestamp: number;
    characterSnippets?: string[];
    locationSnippets?: string[];
    productSnippets?: string[];
    lookbookApplied?: boolean;
    qualityScore?: QualityScore; // AI-evaluated quality
}

// Variant types for Explore Options feature
export type VariantType = 'Standard' | 'Dramatic' | 'Cinematic' | 'Artistic' | 'Custom';

export interface VariantMetadata {
  variantType: VariantType;
  variantDescription: string;
  moodBoardId?: string;
  moodBoardName?: string;
  isVariant: boolean;
  selectedAsMain?: boolean;
}

export interface GeneratedImage {
  id: string;
  projectId: string; // Database Index
  url: string; // Base64 data URL (full resolution) or thumbnail if blob stored
  thumbnail?: string; // Compressed thumbnail for UI display
  prompt: string;
  aspectRatio: string;
  linkedBeatId?: string; // For Script Sync
  generationContext?: GenerationContext; // NEW: For reproducibility
  version?: number; // Version number for this beat's generations
  userRating?: 1 | 2 | 3 | 4 | 5; // User rating for comparison
  variantMetadata?: VariantMetadata; // NEW: For variant exploration
  hasBlobStorage?: boolean; // True if full-res image stored as blob in IndexedDB
}

// Version history for beat generations
export interface BeatVersionHistory {
  beatId: string;
  versions: GeneratedImage[];
  selectedVersionId?: string; // Currently selected version
}

export interface GeneratedVideo {
    id: string;
    projectId: string;
    videoUrl: string; // URL to the MP4
    thumbnailUrl: string; // Base64 poster
    prompt: string;
    status: 'generating' | 'completed' | 'failed';
    createdAt: number;
}

export interface DirectorResponse {
  analysis: string; // The markdown analysis
  imagePrompts: string[]; // Extracted prompts to send to the image generator
}

export interface StoryboardFrame {
    id: string;
    sequenceOrder: number;
    images: {
        start: GeneratedImage;
        end?: GeneratedImage; // Optional end frame for motion
    };
    caption: string;
    notes: string;
    transition: 'CUT TO' | 'DISSOLVE TO' | 'FADE TO' | 'WIPE TO' | 'SMASH CUT';
    shotType: 'WIDE' | 'MED' | 'CLOSE' | 'EXTREME CLOSE' | 'AERIAL';
    duration: string; // e.g. "2s"
    transitionNotes?: string; // AI generated transition prompt
    linkedBeatId?: string;
}

export type BeatStatus = 'scripted' | 'in_progress' | 'coverage_complete' | 'approved';

// Shot within a Beat for detailed breakdown
export interface Shot {
    id: string;
    description: string;      // The visual action/framing
    shotSize: 'ECU' | 'CU' | 'MCU' | 'MS' | 'MWS' | 'WS' | 'EWS'; // Extreme Close Up to Extreme Wide Shot
    cameraMove?: string;      // "DOLLY IN", "PAN LEFT", "STATIC", etc.
    duration?: string;        // "2s", "3s"
    notes?: string;           // Director notes
    generatedImageId?: string; // Link to generated image for this shot

    // === SCRIPT DIRECTOR ENHANCED FIELDS ===
    sequence?: number;        // Order within beat (1, 2, 3...)

    // Technical camera specs
    cameraAngle?: 'eye-level' | 'high-angle' | 'low-angle' | 'overhead' | 'dutch' | 'birds-eye' | 'worms-eye';
    cameraHeight?: string;    // "5.5ft", "200ft aerial", "ground level"
    focalLength?: string;     // "24mm wide", "85mm portrait", "200mm telephoto"

    // Composition
    composition?: {
        foreground?: string;
        midground?: string;
        background?: string;
        depthOfField?: 'shallow' | 'medium' | 'deep';
        framing?: string;     // "rule of thirds left", "centered", "negative space right"
    };

    // Lighting
    lighting?: {
        timeOfDay?: string;       // "golden hour", "blue hour", "midday", "night"
        quality?: string;         // "soft diffused", "harsh directional", "ambient"
        direction?: string;       // "backlit", "side-lit", "front-lit", "rim-lit"
        mood?: string;            // "dramatic", "romantic", "mysterious"
        practicals?: string[];    // ["neon signs", "streetlamps", "firelight"]
    };

    // Entity references (by NAME for @mention pattern)
    entities?: {
        characters?: string[];    // Character names appearing in shot
        locations?: string[];     // Location names
        products?: string[];      // Product names
    };

    // Generation
    generationPrompt?: string;    // Full AI-ready prompt for this shot
    styleReferences?: string[];   // Reference image URLs/IDs to attach

    // Metadata
    priority?: 'critical' | 'high' | 'medium' | 'low';
    transition?: 'cut' | 'fade' | 'dissolve' | 'match-cut' | 'wipe';
    transitionNotes?: string;     // "Match cut on napkin shape to map"
}

export interface Beat {
    id: string;
    visualSummary: string;
    shotType: string;
    duration: string;
    mood: string;
    characters: string[];
    locations: string[];   // NEW: Location names linked to this beat
    products: string[];    // NEW: Product names linked to this beat
    status?: BeatStatus;
    generatedImageIds?: string[]; // Track which images were generated for this beat
    sequenceGrid?: string; // 2x2 grid image URL
    shots?: Shot[];        // NEW: Detailed shot breakdown within beat
    // Variant Exploration
    variantHistory?: GeneratedImage[][]; // Array of variant exploration sets
    selectedVariantId?: string; // Currently selected variant image
}

// Coverage Analysis for Character Reference Quality
export interface CoverageAnalysis {
    existingViews: string[];
    missingViews: string[];
    confidence: 'low' | 'medium' | 'high';
    recommendation: string;
}

// NEW: Categorized Reference Coverage for Characters
export interface RefCoverage {
    face?: string[];        // Close-up face shots for portrait/dialogue scenes
    fullBody?: string[];    // Full body shots for wide/establishing shots
    threeQuarter?: string[]; // 3/4 angle for medium shots
    action?: string[];      // Action poses for dynamic scenes
}

export interface CharacterProfile {
    id: string;
    name: string;
    description: string;
    imageRefs?: string[];
    // Deep Consistency Fields
    promptSnippet?: string; // Optimized Nano Banana prompt
    negativePrompt?: string; // What to avoid
    consistencyAnchors?: string; // Comma separated list of static traits (e.g. "Scar on left eye")
    // Master Character Lock
    isLocked?: boolean; // Locked characters are protected across the project
    // Coverage Analysis
    coverageAnalysis?: CoverageAnalysis;
    // NEW: Categorized Reference Coverage
    refCoverage?: RefCoverage;
    // NEW: Generated Character Sheet (turnaround grid)
    characterSheet?: string; // Base64 2x2 turnaround grid image
    // NEW: Expression Bank (emotion sprite sheet)
    expressionBank?: {
        grid?: string; // The full 3x2 grid image
        slices?: {
            joy?: string;
            anger?: string;
            sorrow?: string;
            surprise?: string;
            fear?: string;
            neutral?: string;
        };
    };
    // AI-Extracted Specifications (Intelligence Layer)
    extractedSpecs?: CharacterSpecs;
    // Photo-to-Character Source Tracking
    sourcePhoto?: string;             // Original real person photo (Base64)
    styleApplied?: string;            // ID of ProjectDefaultStyle used
    generatedFromPhoto?: boolean;     // Flag for photo-derived characters
}

// NEW: Location Profile for World Bible
export interface LocationProfile {
    id: string;
    name: string;
    description: string;
    imageRefs?: string[];
    promptSnippet?: string;
    // Location-specific fields
    timeOfDay?: string;        // "Golden Hour", "Midnight", "Overcast Noon"
    weather?: string;          // "Rain", "Fog", "Clear"
    lightingNotes?: string;    // "Neon signs reflect on wet pavement"
    architecturalStyle?: string; // "Brutalist", "Art Deco", "Cyberpunk"
    anchorImage?: string;      // Base64 master plate image
    realLocation?: string;     // Google grounding: "Shibuya Crossing, Tokyo"
    textures?: string[];       // Generated texture pack images
    // AI-Extracted Specifications (Intelligence Layer)
    extractedSpecs?: LocationSpecs;
}

// NEW: Product Profile for World Bible
export interface ProductProfile {
    id: string;
    name: string;
    description: string;
    imageRefs?: string[];
    promptSnippet?: string;
    // Product-specific fields
    category?: string;         // "Footwear", "Electronics", "Apparel"
    materialNotes?: string;    // "Brushed aluminum, matte black rubber"
    brandGuidelines?: string;  // "Logo must be visible, red accent color"
    heroAngles?: string[];     // Preferred camera angles for this product
    // AI-Extracted Specifications (Intelligence Layer)
    extractedSpecs?: ProductSpecs;
}

export type FocalLength = '16mm' | '24mm' | '35mm' | '50mm' | '85mm' | '135mm' | '200mm';
export type Aperture = 'f/1.4' | 'f/2.8' | 'f/4' | 'f/8' | 'f/16';
export type ColorTemperature = '3200K' | '4500K' | '5600K' | '7000K';

export interface CameraRig {
    focalLength: FocalLength;
    aperture: Aperture;
    colorTemp: ColorTemperature;
}

export interface ProductionDesign {
    visualStyle: string; // "Cyberpunk Noir"
    colorPalette: string; // "Teal and Orange"
    cameraLanguage: string; // "Handheld, Anamorphic"
    lightingApproach: string; // "High Contrast, Neon"
    styleRefs?: string[]; // Moodboard/style reference images
    lightingRef?: string; // Base64 image
    lightingAnalysis?: string; // AI-generated lighting description
    cameraRig?: CameraRig; // Virtual camera settings
}

export interface ScriptData {
    content: string;
    beats: Beat[];
    characters: CharacterProfile[];
    locations: LocationProfile[];    // NEW
    products: ProductProfile[];      // NEW
    productionDesign?: ProductionDesign;
    lookbook?: Lookbook;             // Visual DNA / Style Constitution
    defaultStyle?: ProjectDefaultStyle; // Locked-in style for Photo-to-Character
}

// ============================================
// MOOD BOARD SYSTEM
// ============================================

export interface MoodBoard {
    id: string;
    name: string;
    purpose: 'character-style' | 'location-vibe' | 'lighting-ref' | 'overall-aesthetic' | 'product-style';
    createdAt: number;
    updatedAt: number;
    images: MoodBoardImage[];
    styleDNA?: StyleDNA;
    appliedToBeats: string[];  // Beat IDs where this mood board's style is applied
}

export interface MoodBoardImage {
    id: string;
    url: string;              // Full resolution base64
    source: 'upload' | 'generated' | 'import';
    addedAt: number;
    thumbnail?: string;       // Compressed for UI display
    userNotes?: string;       // Manual user annotations
    aiAnalysis?: ImageAnalysis;
}

export interface ImageAnalysis {
    dominantColors: string[];      // ["#2a1f3d", "#ff6b9d", "#00d4ff"]
    lightingStyle: string;         // "High contrast neon with deep shadows"
    composition: string;           // "Central subject, negative space left"
    mood: string;                  // "Mysterious, edgy, urban"
    styleKeywords: string[];       // ["cyberpunk", "noir", "urban"]
    timestamp: number;
}

export interface StyleDNA {
    colorPalette: string[];           // Extracted dominant colors across all images
    lightingCharacteristics: string;  // Synthesized lighting description
    compositionPatterns: string[];    // Common composition rules detected
    moodKeywords: string[];           // Aggregated mood terms
    photographicStyle: string;        // "Cinematic", "Editorial", "Documentary"
    promptSnippet: string;            // AI-generated prompt injection text
    generatedAt: number;
}

// Project Default Style - locked-in style for character generation
export interface ProjectDefaultStyle {
    id: string;
    name: string;
    referenceImage: string;           // Base64 of the style reference
    styleDNA: StyleDNA;               // Extracted style characteristics
    lockedAt: number;                 // Timestamp when locked
    description?: string;             // User-provided description
}

// ============================================
// AI SPEC EXTRACTION - INTELLIGENCE LAYER
// ============================================

/**
 * Extracted product specifications from image analysis
 */
export interface ProductSpecs {
    productType: string;        // "Sneaker", "Watch", "Bottle", etc.
    brand?: string;             // Detected or inferred brand
    modelName?: string;         // Specific model if identifiable
    primaryColor: string;       // Main color with hex code
    secondaryColors: string[];  // Additional colors with hex codes
    materials: string[];        // ["Leather", "Rubber", "Mesh"]
    finishes: string[];         // ["Matte", "Glossy", "Metallic"]
    logoPlacement?: string;     // Where logos/branding appear
    distinctiveFeatures: string[]; // Unique identifiable elements
    dimensions?: string;        // Approximate size/proportions
    promptSnippet: string;      // AI-generated prompt for regeneration
}

/**
 * Extracted character specifications from image analysis
 */
export interface CharacterSpecs {
    gender: string;
    ageRange: string;           // "20-25", "35-40", etc.
    ethnicity?: string;         // For accurate representation
    skinTone: string;           // Description for consistency
    hairColor: string;
    hairStyle: string;
    eyeColor?: string;
    facialFeatures: string[];   // ["Angular jawline", "High cheekbones"]
    bodyType: string;           // "Athletic", "Slim", "Muscular"
    height?: string;            // "Tall", "Average", "Short"
    distinctiveFeatures: string[]; // Tattoos, scars, glasses, etc.
    clothing?: string;          // Current outfit description
    promptSnippet: string;      // AI-generated prompt for regeneration
}

/**
 * Extracted location specifications from image analysis
 */
export interface LocationSpecs {
    locationType: string;       // "Urban street", "Beach", "Office"
    architectureStyle?: string; // "Brutalist", "Art Deco", "Modern"
    era?: string;               // "Contemporary", "1980s", "Futuristic"
    dominantColors: string[];   // Main color palette with hex codes
    lightingSituation: string;  // "Natural daylight", "Neon lights"
    atmosphere: string;         // "Gritty", "Luxurious", "Industrial"
    keyElements: string[];      // ["Graffiti walls", "Street lamps", "Wet pavement"]
    weatherConditions?: string;
    timeOfDay?: string;
    realWorldLocation?: string; // If recognizable
    promptSnippet: string;      // AI-generated prompt for regeneration
}

// ============================================
// SCRIPT DIRECTOR SYSTEM
// ============================================

/**
 * Result from Script Director analysis
 */
export interface ScriptAnalysis {
    // Extracted entities (deduplicated)
    entities: {
        characters: ExtractedEntity[];
        locations: ExtractedEntity[];
        products: ExtractedEntity[];
    };

    // Narrative structure detection
    narratives: {
        id: string;
        type: 'literal' | 'metaphorical' | 'parallel';
        description: string;
        beats: string[];  // Beat IDs belonging to this narrative
    }[];

    // Beat breakdown with shots
    beats: AnalyzedBeat[];

    // Production metadata
    production: {
        estimatedShots: number;
        estimatedDuration: number;      // Total seconds
        estimatedCost: number;          // $ based on generation count
        criticalAssets: string[];       // Entity names that need generation first
        assetDependencies: {            // What needs what
            [assetName: string]: string[];  // e.g., "Millie dance shot" needs ["Millie turnaround", "Bridge location"]
        };
    };

    // Questions for user (only critical ambiguities)
    clarifications: ClarificationQuestion[];
}

/**
 * Entity extracted from script analysis
 */
export interface ExtractedEntity {
    id: string;
    name: string;                       // Canonical name (deduplicated)
    aliases: string[];                  // All variations found ("Nicola b", "Nicola B", "Nicola")
    type: 'character' | 'location' | 'product';
    importance: 'critical' | 'hero' | 'supporting' | 'background';
    appearances: string[];              // Beat IDs where this entity appears
    inferredDescription: string;        // AI-inferred visual description
    coverageNeeded: string[];           // Recommended coverage packs
    existingBibleMatch?: string;        // ID if matches existing Bible entry
}

/**
 * Beat with shot-level breakdown
 */
export interface AnalyzedBeat {
    id: string;
    sequence: number;
    title: string;                      // Short title for beat
    originalText: string;               // Raw text from script
    interpretedAction: string;          // AI-clarified action description
    duration: number;                   // Seconds
    mood: string;
    narrativeId?: string;               // Which narrative thread

    // Shot breakdown (the critical missing piece!)
    shots: Shot[];

    // Entity usage
    entityUsage: {
        characters: string[];           // Character NAMES
        locations: string[];            // Location NAMES
        products: string[];             // Product NAMES
    };

    // Production notes
    productionNotes?: {
        complexity: 'simple' | 'moderate' | 'complex';
        estimatedGenerations: number;
        dependencies: string[];         // What assets needed before this beat
        riskFactors: string[];          // Potential issues
    };
}

/**
 * Question for user when script has ambiguities
 */
export interface ClarificationQuestion {
    id: string;
    type: 'entity-disambiguation' | 'visual-intent' | 'asset-source' | 'sensitivity' | 'narrative-structure';
    question: string;
    context: string;                    // Why we're asking
    options?: {
        id: string;
        label: string;
        description?: string;
    }[];
    freeformAllowed: boolean;
    required: boolean;
    relatedEntityIds?: string[];        // Which entities this affects
    answer?: string;                    // User's answer (filled in later)
}

/**
 * Creative direction interpretation result
 */
export interface CreativeInterpretation {
    originalInput: string;              // "Forrest Gump feather type thing"
    interpretation: string;             // "Magical realism tracking shot sequence with floating object"
    shotSequence: Shot[];               // 4-5 specific shots that achieve this
    technicalNotes: string;             // How to achieve the look
    referenceStyle: string;             // Style description for generation
    mood: string;
    estimatedDuration: number;
}
