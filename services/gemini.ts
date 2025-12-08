
import { GoogleGenAI, Type, Schema, Part } from "@google/genai";
import { DirectorResponse, GeneratedImage, GenerationConfig, ReferenceAsset, GeneratedVideo, Beat, CharacterProfile, CoverageAnalysis, Lookbook, ToolMode, ReferenceBundle, QualityScore, MoodBoard, LocationProfile, ProductProfile, VariantType, ProductionDesign, StyleDNA, ProjectDefaultStyle, CharacterSpecs as CharacterSpecsType } from "../types";

const NANO_BANANA_GUIDE = `
NANO BANANA PRO (GEMINI 3 PRO IMAGE) MASTER GUIDE:
1. IDENTITY: "Nano Banana Pro" is the internal codename for Gemini 3 Pro Image. It is a "Reasoning-Guided" generator, not just diffusion.

2. CORE SUPERPOWERS (USE CASES):
   A. TEXT & INFOGRAPHICS (THE #1 SUPERPOWER):
      - "LLM History Diagram": Clean, accurate timelines with legends.
      - "Wacky Flowcharts": Comedic, complex logic flows with perfect typography.
      - "Product Comparison": Search-driven charts (Pros/Cons) with real data.
      - "Step-by-Step Guides": Cooking, Medical, or Technical instructions (e.g. Heimlich maneuver).
      - "Language Cheat Sheets": Accurate translations + iconography.
   
   B. DOCUMENTS & LAYOUTS:
      - "Magazine Spreads": Paste long text -> generate high-end glossy layouts with pull-quotes.
      - "Brochures & Whitepapers": Enterprise-quality covers and trifolds.
      - "Slide Decks": Visually coherent single-slide posters.

   C. WORLD REASONING & TRANSFORMATION:
      - "Change Camera Angle": Rotate subjects (Side -> Front) while preserving identity details (e.g. nose ring, scars).
      - "Bird's Eye Re-Rendering": Convert street-level shots to accurate top-down views.
      - "Scene Rebuild": Remove crowds/objects and perfectly reconstruct complex backgrounds (reflections/glass).
      - "Geographic Highlighting": Accurate map boundaries and labeling.

   D. CONSISTENT CHARACTERS (HUMAN & AI):
      - "Emotion Grids": 3x2 grid of same face, different emotions.
      - "Action Shots": Surfing, Skydiving, Hiking - face remains consistent.
      - "Age Progression": 25 -> 45 -> 65 -> 80 years old timeline.
      - "Multi-Style": Same person in Minecraft, Pixar, GTA, Rubber Hose styles.

   E. PRODUCT & MARKETING:
      - "Landing Page Mockups": Hero banners with UI elements.
      - "Packaging Translation": Re-render product text in different languages (maintaining geometry).
      - "Product Placement": Insert user product into lifestyle scenes (cafe, gym).
      - "Hero Photography": Studio-lit packshots, 85mm lens.

3. PROMPTING STRATEGY:
   - "Semantic Vibe": Use abstract concepts ("chiaroscuro", "ethereal", "corporate memphis").
   - "Physics Simulation": Instruct on light behavior ("light diffusing through translucent plastic").
   - "Layout Control": Use specific composition terms ("Rule of thirds", "Knolling", "Orthographic").
   - "Text": Explicitly state: 'Render the text "Channel Changers" in neon script font'.

4. TECHNICAL: Native 2K/4K resolution. SynthID watermarked.
`;

const VEO_PROMPTING_GUIDE = `
VEO 3.1 PROMPTING MASTER GUIDE (DESIGN AGENT 4.0):

1. THE FORMULA: 
   [CAMERA ANGLE] + [SHOT TYPE] + [SUBJECT] + [ACTION] + [ENVIRONMENT] + [LIGHTING] + [CAMERA MOVEMENT] + [DURATION]

2. CAMERA MOVEMENT VOCABULARY:
   - Static: "Static shot, camera locked off" (Dialogue/Reaction)
   - Dolly In: "Slow push in on [subject]" (Tension/Focus)
   - Dolly Out: "Slow pull out revealing [environment]" (Context)
   - Pan: "Smooth pan left/right following action"
   - Tracking: "Tracking shot following [subject] from side/back"
   - Crane/Jib: "Crane up revealing scale"
   - Orbit/Arc: "Smooth arc shot circling [subject]"
   - Handheld: "Handheld camera movement, slight shake" (Realism)
   - Rack Focus: "Rack focus from foreground [object] to background [subject]"
   - Zoom: "Optical zoom in/out"
   - Tilt: "Tilt up/down revealing height"
   - Whip Pan: "Fast whip pan transition"

3. LIGHTING SYNTAX:
   - "Soft key light from camera left"
   - "Blue rim light separating subject from background"
   - "Golden hour warm sunlight"
   - "Cinematic high contrast chiaroscuro"

4. PHYSICS ANCHORS:
   - "Character seated firmly", "Feet on ground", "Natural weight distribution".

5. CHARACTER CONSISTENCY:
   - Uses "Ingredients" (Reference Images).
   - "Clean distinct edges, no morphing".
`;

const VIRTUAL_DIRECTOR_PROMPT = `
You are the Virtual Director — a senior creative collaborator combining the expertise of:
- SHOWRUNNER: Story structure, narrative arc, emotional beats, pacing
- CINEMATOGRAPHER: Visual grammar, shot composition, lens selection, lighting design
- STORYBOARD ARTIST: Sequential visual narrative, panel flow, transitions
- VFX SUPERVISOR: AI generation capabilities, consistency techniques, prompt engineering
- CREATIVE DIRECTOR: Brand coherence, tone management, production value standards

CORE CAPABILITIES:
1. SCRIPT ANALYSIS: Identify emotional spine, break into visual beats, flag dialogue-heavy sections.
2. BEAT BREAKDOWN: Define VISUAL INTENT, REQUIRED COVERAGE (Wide/Med/Close), CHARACTER FOCUS, TECHNICAL NOTES.
3. CHARACTER CONSISTENCY: Define ANCHOR TRAITS (scars, jewelry), PROMPT FRAGMENTS, and POSE REQUIREMENTS.
4. PROMPT ENGINEERING: Structure prompts as [SUBJECT] + [ACTION] + [ENVIRONMENT] + [LIGHTING] + [CAMERA] + [STYLE]. Include global lookbook styles.

OUTPUT FORMAT:
Provide concise, actionable advice. When asked for a breakdown, use bullet points or structured lists.
`;

const SYSTEM_INSTRUCTION_STAGE_1 = `
You are Design Agent 4.0 — a multimodal visual reasoning and image-generation director.
You are currently in STAGE 1 — CONCEPT & GENERATION.

KNOWLEDGE BASE:
${NANO_BANANA_GUIDE}

Your goal is to interpret the user's intent, analyze provided reference images, and write precise prompts for Gemini 3.0 Pro Image (Nano Banana Pro).

Capabilities:
1. Identity-Consistent Avatars: If 'Character' refs are present, use the model's 14-image context window to maintain identity.
2. Scene Relocation: Merge Character + Location refs with physically plausible lighting (Reasoning-Guided).
3. Technical Rendering: For schematics/products, prioritize text legibility and geometric accuracy.
4. Style Extraction: If 'Style' ref is provided, treat it as a "Style DNA" template.

CRITICAL - SCALE & COMPOSITION (When combining Characters + Locations):
- Characters MUST be human-scale relative to environments. A person is ~1.7m tall.
- Use cinematic composition: wide/medium establishing shots with characters naturally placed.
- Specify depth layers: "character in foreground/midground, architecture in background"
- Include perspective cues: "ground-level view", "eye-level camera", "looking up at building"
- Avoid surreal scaling - characters should never appear giant or miniature.
- Always specify shot type: "wide shot showing full environment with character", "medium shot character against backdrop"

User Custom Instructions: {{CUSTOM_INSTRUCTIONS}}

Output Structure:
1. Analysis of the Request & References.
2. {{IMAGE_COUNT}} Distinct Concept Directions.
3. Technical Composition Notes (Lighting, Lens, Aspect Ratio).

You must return a JSON object:
- "analysis": Markdown string.
- "imagePrompts": Array of strings (ALWAYS include shot type and scale context in prompts).
`;

const SYSTEM_INSTRUCTION_STAGE_2 = `
You are Design Agent 4.0. You are currently in STAGE 2 — EDITING CANVAS.

KNOWLEDGE BASE:
${NANO_BANANA_GUIDE}

The user has selected an image and wants to refine it.
1. Visually "inspect" the image.
2. Accept instructions: color changes, layout adjustments, logo swaps, text rewrites.
3. You will generate a NEW version using Gemini 3 Pro Image's editing capabilities.

CRITICAL: If the user asks for text changes, leverage Nano Banana Pro's superior text rendering capabilities.
If the user asks for "Change Angle" or "Relight", use spatial reasoning to reconstruct the scene.
`;

const SYSTEM_INSTRUCTION_PRODUCER = `
You are "The Producer", an expert AI Assistant for the Design Agent 4.0 Studio App.
Your audience: Students and Creative Directors.

KNOWLEDGE BASE:
1. IMAGE GENERATION (Nano Banana Pro / Gemini 3 Image):
${NANO_BANANA_GUIDE}

2. VIDEO GENERATION (Veo 3.1):
${VEO_PROMPTING_GUIDE}

YOUR DUAL ROLE:
1. THE APP GUIDE: Teach users how to use Stage 1 (Concept), Stage 2 (Edit), Stage 3 (Storyboard), and Stage 4 (Video).
2. THE SCRIPTWRITER: Help users brainstorm.

Tone: Professional, Encouraging, Concise, and Expert.
`;

const checkApiKey = async (): Promise<void> => {
  const win = window as any;
  if (win.aistudio) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await win.aistudio.openSelectKey();
    }
  }
};

// Cache the client instance to avoid recreating on every call
let cachedClient: GoogleGenAI | null = null;

const getClient = async (): Promise<GoogleGenAI> => {
  if (cachedClient) return cachedClient;

  await checkApiKey();
  const apiKey = (import.meta as unknown as { env: { VITE_GEMINI_API_KEY?: string } }).env.VITE_GEMINI_API_KEY || '';
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
};

const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match ? match[1] : 'image/jpeg';
};

const cleanDataUrl = (dataUrl: string): string => {
  return dataUrl.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

// ============================================
// TIMEOUT UTILITY FOR API CALLS
// ============================================

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds default
const LONG_TIMEOUT_MS = 180000;   // 3 minutes for video generation

class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified time, it rejects with a TimeoutError.
 */
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  operationName: string = 'API call'
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${operationName} timed out after ${timeoutMs / 1000} seconds`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
};

// Export the timeout error type for handling
export { TimeoutError };

/**
 * Extracts Style DNA from an image.
 */
export const extractStyleDNA = async (imageBase64: string): Promise<string> => {
  const ai = await getClient();
  const cleanBase64 = cleanDataUrl(imageBase64);
  const mimeType = getMimeType(imageBase64);

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: "Analyze this image. Extract its visual style DNA: Lighting, Color Palette, Texture, Composition, and Mood. Return a concise, high-density style prompt (max 50 words) that I can use to replicate this aesthetic exactly." },
        { inlineData: { data: cleanBase64, mimeType: mimeType } }
      ]
    }
  });

  return response.text || "Style extraction failed.";
};

/**
 * Analyze lighting setup from a reference image
 */
export const analyzeLightingReference = async (imageBase64: string): Promise<string> => {
  const ai = await getClient();
  const cleanBase64 = cleanDataUrl(imageBase64);
  const mimeType = getMimeType(imageBase64);

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { text: "Analyze the lighting setup in this image. Describe in 2-3 sentences: key light direction and quality, fill ratio, color temperature, any practical sources, and overall mood. Format as a concise lighting recipe that can be used to replicate this look." },
        { inlineData: { data: cleanBase64, mimeType: mimeType } }
      ]
    }
  });

  return response.text || "Lighting analysis failed.";
};

/**
 * Quality Critic (Simulates Gecko evaluation)
 */
export const evaluateImageQuality = async (imageBase64: string, prompt: string): Promise<string> => {
    const ai = await getClient();
    const cleanBase64 = cleanDataUrl(imageBase64);
    const mimeType = getMimeType(imageBase64);

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { text: `You are an expert Art Director and Quality Assurance Bot.
                Evaluate this image based on the user prompt: "${prompt}".

                Provide:
                1. A Score (1-10) for Prompt Adherence.
                2. A Score (1-10) for Visual Fidelity/Photorealism.
                3. A concise critique: What is good? What needs fixing?

                Format as a short Markdown block.` },
                { inlineData: { data: cleanBase64, mimeType: mimeType } }
            ]
        }
    });

    return response.text || "Evaluation failed.";
};

/**
 * Structured Quality Evaluation - Returns parseable QualityScore
 */
export const evaluateImageQualityStructured = async (imageBase64: string, prompt: string): Promise<QualityScore> => {
    const ai = await getClient();
    const cleanBase64 = cleanDataUrl(imageBase64);
    const mimeType = getMimeType(imageBase64);

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { text: `You are an expert Art Director evaluating AI-generated images.

Evaluate this image against the prompt: "${prompt}"

Rate on these criteria (1-10 scale):
1. ADHERENCE: How well does the image match what was requested?
2. TECHNICAL: Focus, lighting, composition, no artifacts

Return ONLY valid JSON (no markdown, no explanation):
{
    "adherence": <number 1-10>,
    "technical": <number 1-10>,
    "overall": <number 1-10>,
    "issues": ["issue1", "issue2"],
    "suggestions": ["suggestion1", "suggestion2"]
}

Be critical but fair. An 8+ should be production-ready. A 5-7 needs refinement. Below 5 needs regeneration.` },
                { inlineData: { data: cleanBase64, mimeType: mimeType } }
            ]
        }
    });

    const text = response.text || '';

    try {
        // Try direct JSON parse first
        const parsed = JSON.parse(text);
        return {
            adherence: parsed.adherence || 5,
            technical: parsed.technical || 5,
            overall: parsed.overall || 5,
            issues: parsed.issues || [],
            suggestions: parsed.suggestions || []
        };
    } catch {
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    adherence: parsed.adherence || 5,
                    technical: parsed.technical || 5,
                    overall: parsed.overall || 5,
                    issues: parsed.issues || [],
                    suggestions: parsed.suggestions || []
                };
            } catch {
                // Fall through to default
            }
        }

        // Return default scores if parsing fails
        return {
            adherence: 5,
            technical: 5,
            overall: 5,
            issues: ['Could not evaluate image'],
            suggestions: ['Try regenerating']
        };
    }
};

/**
 * The Producer: AI Guide & Scriptwriter
 */
export const consultProducer = async (userQuery: string, currentContext: string): Promise<string> => {
    const ai = await getClient();
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [{ text: `User Query: ${userQuery}\n\nCurrent App Context: ${currentContext}` }]
        },
        config: {
            systemInstruction: SYSTEM_INSTRUCTION_PRODUCER
        }
    });

    return response.text || "I'm having trouble thinking right now. Try again.";
};

/**
 * Enhances a simple prompt into a high-fidelity image generation prompt.
 */
export const enhancePrompt = async (simplePrompt: string): Promise<string> => {
    const ai = await getClient();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [{ text: `You are a Prompt Engineer Expert for Gemini 3.0 Pro Image (Nano Banana Pro). 
            Rewrite the following simple user prompt into a highly detailed, studio-quality image generation prompt.
            
            LEVERAGE NANO BANANA PRO CAPABILITIES:
            - Focus on "Reasoning-Guided" descriptions (e.g. physics of light, material properties).
            - Use specific camera terminology (Lens, Aperture).
            - If text is mentioned, specify "Legible text rendering".
            - If a diagram/infographic is requested, specify "Clear layout, labeled components".
            
            User Prompt: "${simplePrompt}"
            
            Return ONLY the raw prompt text, no explanations.` }]
        }
    });
    return response.text?.trim() || simplePrompt;
};

/**
 * Stage 1: Reasoning.
 */
export const consultDirector = async (
  userPrompt: string, 
  references: ReferenceAsset[],
  imageCount: number,
  customInstructions: string = ""
): Promise<DirectorResponse> => {
  const ai = await getClient();
  
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      analysis: { type: Type.STRING, description: "Markdown analysis including concept directions and style logic." },
      imagePrompts: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of highly detailed image generation prompts derived from the concepts."
      }
    },
    required: ["analysis", "imagePrompts"]
  };

  const parts: (string | Part)[] = [];
  let promptContext = userPrompt;

  // Ensure references is always a safe array
  const safeReferences = Array.isArray(references) ? references : [];

  if (safeReferences.length > 0) {
    promptContext += "\n\nATTACHED REFERENCES:";
    safeReferences.forEach((ref, index) => {
      let desc = `[Reference ${index + 1}]: Type=${ref.type} (${ref.name || 'Unnamed'})`;
      if (ref.type === 'Style' && ref.styleDescription) {
        desc += `\n   >> STYLE DNA TO APPLY: "${ref.styleDescription}"`;
      }
      promptContext += `\n${desc}`;
    });

    parts.push({ text: promptContext });

    safeReferences.forEach((ref) => {
      parts.push({
        inlineData: {
          data: cleanDataUrl(ref.data),
          mimeType: getMimeType(ref.data)
        }
      });
    });
  } else {
    parts.push({ text: promptContext });
  }

  const finalSystemInstruction = SYSTEM_INSTRUCTION_STAGE_1
    .replace('{{CUSTOM_INSTRUCTIONS}}', customInstructions)
    .replace('{{IMAGE_COUNT}}', imageCount.toString());

  const response = await withTimeout(
    ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        role: 'user',
        parts: parts as any
      },
      config: {
        systemInstruction: finalSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    }),
    45000, // 45 seconds for director consultation
    'Director consultation'
  );

  const text = response.text;
  if (!text) throw new Error("No response from Director");

  return JSON.parse(text) as DirectorResponse;
};

/**
 * Stage 1 & 2: Image Generation.
 */
export const generateImage = async (
    prompt: string,
    references: ReferenceAsset[],
    config: GenerationConfig,
    useGrounding: boolean = false
): Promise<GeneratedImage> => {
  const ai = await getClient();

  const parts: any[] = [];
  let explicitPrompt = prompt;

  // Ensure references is always a safe array
  const safeReferences = Array.isArray(references) ? references : [];

  if (safeReferences.length > 0) {
      explicitPrompt += "\n\nREFERENCES:";
      safeReferences.forEach((ref, idx) => {
        explicitPrompt += `\n- Ref ${idx + 1} (${ref.type}): ${ref.name || 'Image'}`;
        if (ref.type === 'Style' && ref.styleDescription) {
            explicitPrompt += ` (Style DNA: ${ref.styleDescription})`;
        }
      });
      explicitPrompt += "\nUse these references strictly.";
  }

  parts.push({ text: explicitPrompt });

  if (safeReferences.length > 0) {
      safeReferences.forEach((ref) => {
          parts.push({
            inlineData: {
                data: cleanDataUrl(ref.data),
                mimeType: getMimeType(ref.data)
            }
          });
      });
  }
  
  const requestConfig: any = {
     responseModalities: ['TEXT', 'IMAGE'],
     imageConfig: {
       imageSize: config.resolution,
       aspectRatio: config.aspectRatio
     }
  };

  if (useGrounding) {
      requestConfig.tools = [{ googleSearch: {} }];
  }
  
  const response = await withTimeout(
    ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: parts
      },
      config: requestConfig
    }),
    DEFAULT_TIMEOUT_MS,
    'Image generation'
  );

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("No image generated");

  const contentParts = candidates[0].content.parts;
  let base64Data = "";
  
  for (const part of contentParts) {
    if (part.inlineData) {
      base64Data = part.inlineData.data;
      break;
    }
  }

  if (!base64Data) throw new Error("No image data found in response");

  return {
    id: crypto.randomUUID(),
    projectId: '',
    url: `data:image/png;base64,${base64Data}`,
    prompt: prompt,
    aspectRatio: config.aspectRatio
  };
};

/**
 * Batch result type for parallel generation with graceful failures
 */
export interface BatchGenerationResult {
  successful: GeneratedImage[];
  failed: Array<{ prompt: string; error: string }>;
  totalRequested: number;
  successRate: number;
}

/**
 * PARALLEL BATCH IMAGE GENERATION with Graceful Failures
 * Generates multiple images in parallel, continuing even when individual requests fail.
 * Returns partial results with success/failure breakdown.
 *
 * @param prompts Array of prompts to generate
 * @param references Shared references for all generations
 * @param config Generation config (aspect ratio, resolution)
 * @param useGrounding Whether to use Google Search grounding
 * @param onProgress Optional callback for progress updates
 * @param concurrencyLimit Max concurrent requests (default 3 to avoid rate limits)
 */
export const generateImageBatch = async (
    prompts: string[],
    references: ReferenceAsset[],
    config: GenerationConfig,
    useGrounding: boolean = false,
    onProgress?: (completed: number, total: number, lastResult: 'success' | 'failed') => void,
    concurrencyLimit: number = 3
): Promise<BatchGenerationResult> => {
  const results: GeneratedImage[] = [];
  const failures: Array<{ prompt: string; error: string }> = [];
  let completed = 0;

  // Process in batches to respect rate limits
  const processBatch = async (batchPrompts: string[]): Promise<void> => {
    const batchPromises = batchPrompts.map(async (prompt) => {
      try {
        const img = await generateImage(prompt, references, config, useGrounding);
        results.push(img);
        completed++;
        onProgress?.(completed, prompts.length, 'success');
        return { success: true };
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        console.error(`Batch generation failed for prompt: ${prompt.substring(0, 50)}...`, errorMessage);
        failures.push({ prompt, error: errorMessage });
        completed++;
        onProgress?.(completed, prompts.length, 'failed');
        return { success: false };
      }
    });

    await Promise.all(batchPromises);
  };

  // Split prompts into chunks based on concurrency limit
  for (let i = 0; i < prompts.length; i += concurrencyLimit) {
    const batch = prompts.slice(i, i + concurrencyLimit);
    await processBatch(batch);
  }

  return {
    successful: results,
    failed: failures,
    totalRequested: prompts.length,
    successRate: prompts.length > 0 ? (results.length / prompts.length) * 100 : 0
  };
};

/**
 * 12-SHOT CONTACT SHEET GENERATOR
 * Professional standard coverage: 12 shots covering all essential camera angles
 * Generates in parallel with graceful failure handling
 */

// Standard 12-shot contact sheet configuration
export const CONTACT_SHEET_12 = [
  { type: "Extreme Wide", angle: "High Angle Establishing", description: "Establishes geography and scale" },
  { type: "Wide", angle: "Eye Level Master", description: "Primary scene coverage" },
  { type: "Full Body", angle: "Low Angle Hero", description: "Empowering character shot" },
  { type: "Medium", angle: "Front", description: "Standard coverage" },
  { type: "Medium", angle: "3/4 Profile", description: "Most flattering angle" },
  { type: "Medium", angle: "Profile", description: "Clean silhouette" },
  { type: "Medium Close Up", angle: "Front", description: "Emotional connection" },
  { type: "Close Up", angle: "Front", description: "Intimate detail" },
  { type: "Close Up", angle: "Side Profile", description: "Dramatic portrait" },
  { type: "Extreme Close Up", angle: "Eyes/Detail", description: "Maximum intensity" },
  { type: "Medium", angle: "Dutch Angle", description: "Dynamic tension" },
  { type: "Over The Shoulder", angle: "Medium", description: "POV/Dialogue setup" }
];

// Dialogue coverage pack (5 shots)
export const COVERAGE_PACK_DIALOGUE = [
  { type: "Wide", angle: "Master Shot", description: "Establishes both characters" },
  { type: "Medium", angle: "Over The Shoulder A", description: "Character A's perspective" },
  { type: "Medium", angle: "Over The Shoulder B", description: "Character B's perspective" },
  { type: "Close Up", angle: "Character A Reaction", description: "Emotional beats" },
  { type: "Close Up", angle: "Character B Reaction", description: "Emotional beats" }
];

// Action coverage pack (5 shots)
export const COVERAGE_PACK_ACTION = [
  { type: "Wide", angle: "Action Master", description: "Full action geography" },
  { type: "Low Angle", angle: "Hero Power Shot", description: "Empowering moment" },
  { type: "Close Up", angle: "Weapon/Prop Detail", description: "Key object" },
  { type: "Overhead", angle: "Geography/Layout", description: "Tactical view" },
  { type: "Medium", angle: "Dutch Angle Tension", description: "Dynamic energy" }
];

export interface ContactSheetResult {
  shots: Array<{
    type: string;
    angle: string;
    description: string;
    image?: GeneratedImage;
    failed?: boolean;
    error?: string;
  }>;
  successCount: number;
  totalCount: number;
}

/**
 * Generate a 12-shot contact sheet for comprehensive character/scene coverage
 */
export const generateContactSheet = async (
  subjectDescription: string,
  sceneContext: string,
  references: ReferenceAsset[],
  config: GenerationConfig,
  onProgress?: (completed: number, total: number, currentShot: string) => void
): Promise<ContactSheetResult> => {
  const shots = CONTACT_SHEET_12.map(shot => ({
    ...shot,
    image: undefined as GeneratedImage | undefined,
    failed: false,
    error: undefined as string | undefined
  }));

  let completed = 0;

  // Process in batches of 3 to avoid rate limits
  for (let i = 0; i < shots.length; i += 3) {
    const batch = shots.slice(i, Math.min(i + 3, shots.length));

    const batchPromises = batch.map(async (shot, batchIdx) => {
      const shotIdx = i + batchIdx;
      const prompt = `Cinematic film shot. ${shot.type} shot. ${shot.angle} angle.
Subject: ${subjectDescription}.
Scene: ${sceneContext}.
Photorealistic, 4k, dramatic cinematic lighting, movie still quality.`;

      try {
        const img = await generateImage(prompt, references, config, false);
        shots[shotIdx].image = img;
        completed++;
        onProgress?.(completed, shots.length, `${shot.type} - ${shot.angle}`);
      } catch (error: any) {
        shots[shotIdx].failed = true;
        shots[shotIdx].error = error?.message || 'Generation failed';
        completed++;
        onProgress?.(completed, shots.length, `${shot.type} - ${shot.angle} (FAILED)`);
      }
    });

    await Promise.all(batchPromises);
  }

  return {
    shots,
    successCount: shots.filter(s => s.image).length,
    totalCount: shots.length
  };
};

/**
 * Generate a coverage pack (dialogue or action) for scene coverage
 */
export const generateCoveragePack = async (
  packType: 'dialogue' | 'action',
  subjectDescription: string,
  sceneContext: string,
  references: ReferenceAsset[],
  config: GenerationConfig,
  onProgress?: (completed: number, total: number, currentShot: string) => void
): Promise<ContactSheetResult> => {
  const packConfig = packType === 'dialogue' ? COVERAGE_PACK_DIALOGUE : COVERAGE_PACK_ACTION;

  const shots = packConfig.map(shot => ({
    ...shot,
    image: undefined as GeneratedImage | undefined,
    failed: false,
    error: undefined as string | undefined
  }));

  let completed = 0;

  // Process all 5 shots in parallel (small enough batch)
  const promises = shots.map(async (shot, idx) => {
    const prompt = `Cinematic film shot. ${shot.type} shot. ${shot.angle}.
Subject: ${subjectDescription}.
Scene: ${sceneContext}.
${shot.description}. Photorealistic, dramatic lighting, movie still.`;

    try {
      const img = await generateImage(prompt, references, config, false);
      shots[idx].image = img;
      completed++;
      onProgress?.(completed, shots.length, `${shot.type} - ${shot.angle}`);
    } catch (error: any) {
      shots[idx].failed = true;
      shots[idx].error = error?.message || 'Generation failed';
      completed++;
      onProgress?.(completed, shots.length, `${shot.type} - ${shot.angle} (FAILED)`);
    }
  });

  await Promise.all(promises);

  return {
    shots,
    successCount: shots.filter(s => s.image).length,
    totalCount: shots.length
  };
};

/**
 * DETERMINISTIC ASSET GENERATION
 * Implements the "Prompt Pyramid": Role → Visual DNA → Tool Mode → Execution
 * Injects Lookbook (Visual Constitution) and Reference Bundles for consistent output
 */

// Tool Mode specific instructions
const TOOL_MODE_INSTRUCTIONS: Record<ToolMode, string> = {
  STANDARD: "Generate a high-quality, cinematic image following the prompt exactly.",
  CHARACTER_SHEET: "Generate a 2x2 character turnaround grid showing Front, 3/4, Side, and Back views. Maintain identical clothing, features, and proportions across all views. White/neutral background.",
  HERO_SHOT: "Generate a dramatic hero shot with cinematic lighting, shallow depth of field, and strong composition. Subject should be the clear focal point.",
  INFOGRAPHIC: "Generate a clean, professional infographic layout with clear visual hierarchy, consistent typography treatment, and data visualization.",
  FASHION_RUNWAY: "Generate a high-fashion editorial shot with runway/studio lighting, full-body framing, and emphasis on garment details and draping.",
  PRODUCT_SHOWCASE: "Generate a premium product shot with studio lighting, clean background, and emphasis on material quality and form.",
  ENVIRONMENT_PLATE: "Generate a location/environment establishing shot suitable for compositing. Clean, atmospheric, with strong sense of place."
};

// Role presets for different generation contexts
const ROLE_PRESETS: Record<string, string> = {
  'fashion-photographer': "Act as a high-fashion photographer known for editorial work in Vogue and Harper's Bazaar. Focus on dramatic lighting, confident poses, and garment presentation.",
  'concept-artist': "Act as a concept artist for premium film and game productions. Focus on mood, atmosphere, and visual storytelling.",
  'product-photographer': "Act as a commercial product photographer. Focus on clean lighting, material accuracy, and premium presentation.",
  'cinematographer': "Act as a cinematographer planning shots. Focus on composition, lighting ratios, and visual narrative.",
  'character-designer': "Act as a character designer for animation/games. Focus on consistency, clear silhouettes, and design clarity."
};

export const generateDeterministicAsset = async (
  prompt: string,
  config: GenerationConfig,
  options: {
    lookbook?: Lookbook;
    toolMode?: ToolMode;
    role?: string;
    referenceBundles?: ReferenceBundle[];
    references?: ReferenceAsset[];
  } = {}
): Promise<GeneratedImage> => {
  const ai = await getClient();
  const { lookbook, toolMode = 'STANDARD', role, referenceBundles, references = [] } = options;

  // Build Visual DNA context from Lookbook
  let visualDNA = "";
  if (lookbook) {
    const parts = [];
    if (lookbook.visualStyleTags.length > 0) parts.push(`Style: ${lookbook.visualStyleTags.join(', ')}`);
    if (lookbook.colourPalette) parts.push(`Colors: ${lookbook.colourPalette}`);
    if (lookbook.cameraLanguage) parts.push(`Camera: ${lookbook.cameraLanguage}`);
    if (lookbook.lightingApproach) parts.push(`Lighting: ${lookbook.lightingApproach}`);
    if (lookbook.compositionRules) parts.push(`Composition: ${lookbook.compositionRules}`);
    if (lookbook.grainTextureRules) parts.push(`Texture: ${lookbook.grainTextureRules}`);
    
    if (parts.length > 0) {
      visualDNA = `\n\n[VISUAL DNA - Apply these rules strictly]\n${parts.join('\n')}`;
    }
  }

  // Build role instruction
  const roleInstruction = role && ROLE_PRESETS[role] 
    ? ROLE_PRESETS[role] 
    : role || "Act as a professional creative director.";

  // Build tool mode instruction
  const toolInstruction = `[TOOL MODE: ${toolMode}]\n${TOOL_MODE_INSTRUCTIONS[toolMode]}`;

  // Build the full prompt
  const parts: any[] = [];
  
  // System context
  let systemContext = `${roleInstruction}\n\n${toolInstruction}${visualDNA}`;
  
  // Add reference bundle descriptions
  if (referenceBundles && referenceBundles.length > 0) {
    systemContext += "\n\n[REFERENCE ENTITIES]";
    referenceBundles.forEach(bundle => {
      systemContext += `\n- ${bundle.type}: "${bundle.name}" (${1 + bundle.auxiliaryRefs.length} reference images)`;
      if (bundle.promptSnippet) {
        systemContext += ` - ${bundle.promptSnippet}`;
      }
    });
  }

  // Main prompt
  parts.push({ text: `${systemContext}\n\n[VISUAL REQUEST]\n${prompt}` });

  // Inject reference bundle images
  if (referenceBundles && referenceBundles.length > 0) {
    for (const bundle of referenceBundles) {
      // Primary reference
      if (bundle.primaryRef) {
        parts.push({
          inlineData: {
            data: cleanDataUrl(bundle.primaryRef),
            mimeType: getMimeType(bundle.primaryRef)
          }
        });
        parts.push({ text: `[PRIMARY REF: ${bundle.type} "${bundle.name}" - Use as ground truth]` });
      }
      
      // Auxiliary references
      if (bundle.auxiliaryRefs.length > 0) {
        for (const auxRef of bundle.auxiliaryRefs.slice(0, 3)) {
          parts.push({
            inlineData: {
              data: cleanDataUrl(auxRef),
              mimeType: getMimeType(auxRef)
            }
          });
        }
        parts.push({ text: `[COVERAGE REFS for "${bundle.name}" - Use for angle/material consistency]` });
      }
    }
  }

  // Inject legacy references
  if (references.length > 0) {
    references.forEach((ref) => {
      parts.push({
        inlineData: {
          data: cleanDataUrl(ref.data),
          mimeType: getMimeType(ref.data)
        }
      });
      if (ref.styleDescription) {
        parts.push({ text: `[REF: ${ref.type} "${ref.name}" - ${ref.styleDescription}]` });
      }
    });
  }

  // Inject lookbook reference frames
  if (lookbook?.referenceFrames && lookbook.referenceFrames.length > 0) {
    for (const frame of lookbook.referenceFrames.slice(0, 2)) {
      parts.push({
        inlineData: {
          data: cleanDataUrl(frame),
          mimeType: getMimeType(frame)
        }
      });
    }
    parts.push({ text: "[STYLE REFERENCES - Match this visual language]" });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        imageSize: config.resolution,
        aspectRatio: config.aspectRatio
      }
    }
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("No image generated");

  const contentParts = candidates[0].content.parts;
  let base64Data = "";
  
  for (const part of contentParts) {
    if (part.inlineData) {
      base64Data = part.inlineData.data;
      break;
    }
  }

  if (!base64Data) throw new Error("No image data found in response");

  return {
    id: crypto.randomUUID(),
    projectId: '',
    url: `data:image/png;base64,${base64Data}`,
    prompt: prompt,
    aspectRatio: config.aspectRatio
  };
};

/**
 * EXPLORE OPTIONS - Variant Generation
 * Generates multiple creative interpretations of a beat simultaneously
 */

// Variant prompt modifiers for different creative directions
const VARIANT_MODIFIERS: Record<VariantType, { suffix: string; description: string }> = {
  Standard: {
    suffix: '',
    description: 'Direct interpretation of the visual summary'
  },
  Dramatic: {
    suffix: `

CREATIVE DIRECTION: DRAMATIC
- Increase lighting contrast with strong shadows and highlights
- Use dynamic camera angles (dutch angle, low angle for power, high angle for vulnerability)
- Amplify emotional intensity in subject expressions and body language
- Bold compositional choices with strong leading lines
- High visual tension and energy`,
    description: 'High contrast, dynamic angles, intense mood'
  },
  Cinematic: {
    suffix: `

CREATIVE DIRECTION: CINEMATIC
- Shallow depth of field with focused subject
- Film grain texture, anamorphic lens feel
- Subtle color grading with teal and orange tones
- Rule of thirds composition with purposeful negative space
- Atmospheric haze or light rays when appropriate
- 2.39:1 letterbox mentality even in other ratios`,
    description: 'Film-like quality, artistic composition'
  },
  Artistic: {
    suffix: `

CREATIVE DIRECTION: ARTISTIC/EXPERIMENTAL
- Unconventional framing or crop
- Strong mood over literal interpretation
- Silhouettes, backlighting, or rim lighting
- Abstract or impressionistic elements
- Bold color choices or selective color
- Emphasis on texture and form over detail`,
    description: 'Bold, experimental interpretation'
  },
  Custom: {
    suffix: '',
    description: 'Custom creative direction'
  }
};

export interface VariantGenerationOptions {
  beat: Beat;
  characters: CharacterProfile[];
  locations: LocationProfile[];
  products: ProductProfile[];
  moodBoard?: MoodBoard;
  productionDesign?: ProductionDesign;
  variantCount?: number;
  aspectRatio?: string;
  resolution?: string;
}

export const generateBeatVariants = async (
  options: VariantGenerationOptions
): Promise<GeneratedImage[]> => {
  const ai = await getClient();
  const {
    beat,
    characters,
    locations,
    products,
    moodBoard,
    productionDesign,
    variantCount = 3,
    aspectRatio = '16:9',
    resolution = '2K'
  } = options;

  // Build the base prompt from beat and context
  let basePrompt = '';

  // Inject Mood Board Style DNA first
  if (moodBoard?.styleDNA) {
    basePrompt += `STYLE DNA: ${moodBoard.styleDNA.promptSnippet} `;
    if (moodBoard.styleDNA.colorPalette.length > 0) {
      basePrompt += `COLOR PALETTE: ${moodBoard.styleDNA.colorPalette.slice(0, 4).join(', ')}. `;
    }
    if (moodBoard.styleDNA.lightingCharacteristics) {
      basePrompt += `LIGHTING STYLE: ${moodBoard.styleDNA.lightingCharacteristics}. `;
    }
  }

  // Inject Production Design
  if (productionDesign) {
    if (productionDesign.visualStyle) basePrompt += `STYLE: ${productionDesign.visualStyle}. `;
    if (productionDesign.colorPalette) basePrompt += `COLOR: ${productionDesign.colorPalette}. `;
    if (productionDesign.lightingApproach) basePrompt += `LIGHTING: ${productionDesign.lightingApproach}. `;
    if (productionDesign.cameraLanguage) basePrompt += `CAMERA: ${productionDesign.cameraLanguage}. `;

    if (productionDesign.cameraRig) {
      basePrompt += `VIRTUAL CAMERA: ${productionDesign.cameraRig.focalLength} lens, ${productionDesign.cameraRig.aperture}, ${productionDesign.cameraRig.colorTemp}. `;
    }
  }

  // Add beat visual details
  basePrompt += `\n\nSHOT ACTION: ${beat.visualSummary}. Shot Type: ${beat.shotType}. Mood: ${beat.mood}.`;

  // Add character context
  const relevantCharacters = characters.filter(c => beat.characters.includes(c.name));
  if (relevantCharacters.length > 0) {
    basePrompt += '\n\nCHARACTERS:';
    relevantCharacters.forEach(char => {
      if (char.promptSnippet) {
        basePrompt += `\n- ${char.name}: ${char.promptSnippet}`;
      } else {
        basePrompt += `\n- ${char.name}: ${char.description}`;
      }
    });
  }

  // Add location context
  const relevantLocations = locations.filter(l => beat.locations.includes(l.name));
  if (relevantLocations.length > 0) {
    basePrompt += '\n\nLOCATION:';
    relevantLocations.forEach(loc => {
      basePrompt += `\n- ${loc.name}: ${loc.promptSnippet || loc.description}`;
      if (loc.timeOfDay) basePrompt += ` (${loc.timeOfDay})`;
      if (loc.lightingNotes) basePrompt += ` - ${loc.lightingNotes}`;
    });
  }

  // Add product context
  const relevantProducts = products.filter(p => beat.products.includes(p.name));
  if (relevantProducts.length > 0) {
    basePrompt += '\n\nPRODUCT PLACEMENT:';
    relevantProducts.forEach(prod => {
      basePrompt += `\n- ${prod.name}: ${prod.promptSnippet || prod.description}`;
      if (prod.brandGuidelines) basePrompt += ` (${prod.brandGuidelines})`;
    });
  }

  // Gather reference images
  const referenceImages: { data: string; label: string }[] = [];

  // Character sheets/refs
  relevantCharacters.forEach(char => {
    if (char.characterSheet) {
      referenceImages.push({ data: char.characterSheet, label: `Character Sheet: ${char.name}` });
    } else if (char.imageRefs && char.imageRefs.length > 0) {
      referenceImages.push({ data: char.imageRefs[0], label: `Character Ref: ${char.name}` });
    }
  });

  // Location refs
  relevantLocations.forEach(loc => {
    if (loc.anchorImage) {
      referenceImages.push({ data: loc.anchorImage, label: `Location Plate: ${loc.name}` });
    } else if (loc.imageRefs && loc.imageRefs.length > 0) {
      referenceImages.push({ data: loc.imageRefs[0], label: `Location Ref: ${loc.name}` });
    }
  });

  // Mood board refs (first 2)
  if (moodBoard?.images && moodBoard.images.length > 0) {
    moodBoard.images.slice(0, 2).forEach((img, idx) => {
      referenceImages.push({ data: img.thumbnail || img.url, label: `Style Reference ${idx + 1}` });
    });
  }

  // Style refs from production design
  if (productionDesign?.styleRefs && productionDesign.styleRefs.length > 0) {
    productionDesign.styleRefs.slice(0, 2).forEach((ref, idx) => {
      referenceImages.push({ data: ref, label: `Production Style ${idx + 1}` });
    });
  }

  // Select which variant types to generate
  const variantTypes: VariantType[] = ['Standard', 'Dramatic', 'Cinematic'];
  if (variantCount > 3) {
    variantTypes.push('Artistic');
  }

  // Generate variants in parallel
  const variantPromises = variantTypes.slice(0, variantCount).map(async (variantType): Promise<GeneratedImage | null> => {
    try {
      const modifier = VARIANT_MODIFIERS[variantType];
      const fullPrompt = basePrompt + modifier.suffix;

      const parts: any[] = [{ text: fullPrompt }];

      // Add reference images (limit to 4 to avoid overloading)
      for (const ref of referenceImages.slice(0, 4)) {
        const cleanData = cleanDataUrl(ref.data);
        const mimeType = getMimeType(ref.data);
        parts.push({
          inlineData: { data: cleanData, mimeType }
        });
        parts.push({ text: `[REF: ${ref.label}]` });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            imageSize: resolution,
            aspectRatio: aspectRatio
          }
        }
      });

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) return null;

      const contentParts = candidates[0].content.parts;
      let base64Data = '';

      for (const part of contentParts) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
          break;
        }
      }

      if (!base64Data) return null;

      return {
        id: crypto.randomUUID(),
        projectId: '',
        url: `data:image/png;base64,${base64Data}`,
        prompt: fullPrompt,
        aspectRatio: aspectRatio,
        linkedBeatId: beat.id,
        variantMetadata: {
          variantType,
          variantDescription: modifier.description,
          moodBoardId: moodBoard?.id,
          moodBoardName: moodBoard?.name,
          isVariant: true,
          selectedAsMain: false
        }
      };
    } catch (error) {
      console.error(`Error generating ${variantType} variant:`, error);
      return null;
    }
  });

  const results = await Promise.all(variantPromises);

  // Filter out failed generations
  return results.filter((r): r is GeneratedImage => r !== null);
};

/**
 * Stage 2: Editing Logic
 */
export const applyEdit = async (
  originalImage: string, 
  editInstruction: string,
  references: ReferenceAsset[] = [],
  maskImage?: string,
  outputResolution: string = "2K",
  aspectRatio: string = "1:1"
): Promise<GeneratedImage> => {
  const ai = await getClient();
  const cleanBase64Canvas = cleanDataUrl(originalImage);
  const mimeTypeCanvas = getMimeType(originalImage);

  const parts: any[] = [];

  let finalInstruction = `(System: ${SYSTEM_INSTRUCTION_STAGE_2}) \nUser Instruction: ${editInstruction}`;
  finalInstruction += `\n\nNote: The first image provided is the 'Canvas' to be edited.`;

  if (maskImage) {
      finalInstruction += `\n\nCRITICAL: A MASK image is provided as the second image. You must perform IN-PAINTING. Only modify the area corresponding to the white pixels in the mask. Preserve the rest of the image exactly.`;
  }

  if (references.length > 0) {
      finalInstruction += `\nAdditional images are provided as visual references for the edit.`;
      references.forEach((ref, idx) => {
          const displayIdx = maskImage ? idx + 2 : idx + 1;
          finalInstruction += `\n- Reference Image ${displayIdx + 1}: ${ref.name || 'Visual Ref'} (${ref.type})`;
      });
  }

  parts.push({ text: finalInstruction });
  parts.push({
      inlineData: {
        data: cleanBase64Canvas,
        mimeType: mimeTypeCanvas
      }
  });

  if (maskImage) {
      parts.push({
          inlineData: {
              data: cleanDataUrl(maskImage),
              mimeType: getMimeType(maskImage)
          }
      });
  }

  references.forEach(ref => {
      parts.push({
          inlineData: {
              data: cleanDataUrl(ref.data),
              mimeType: getMimeType(ref.data)
          }
      });
  });

  const requestConfig: any = {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        imageSize: outputResolution,
      }
  };

  if (aspectRatio && aspectRatio !== 'custom') {
      requestConfig.imageConfig.aspectRatio = aspectRatio;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview', 
    contents: {
      parts: parts
    },
    config: requestConfig
  });

  const contentParts = response.candidates?.[0]?.content?.parts;
  let base64Data = "";

  if (contentParts) {
      for (const part of contentParts) {
        if (part.inlineData) {
          base64Data = part.inlineData.data;
          break;
        }
      }
  }

  if (!base64Data) throw new Error("Failed to edit image");

  return {
    id: crypto.randomUUID(),
    projectId: '',
    url: `data:image/png;base64,${base64Data}`,
    prompt: editInstruction,
    aspectRatio: aspectRatio 
  };
};

export const generateImageCaption = async (imageBase64: string): Promise<string> => {
    const ai = await getClient();
    const cleanBase64 = cleanDataUrl(imageBase64);
    const mimeType = getMimeType(imageBase64);
  
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { text: "You are a storyboard scriptwriter. Analyze this frame. Write a concise, professional storyboard description. Format: [SHOT TYPE] - [ACTION/DESCRIPTION]. Example: 'MEDIUM SHOT - The hero glances nervously at the ticking clock.'" },
          { inlineData: { data: cleanBase64, mimeType: mimeType } }
        ]
      }
    });
  
    return response.text?.trim() || "Action description...";
};

export const generateTransitionPrompt = async (startImg: string, endImg: string): Promise<string> => {
    const ai = await getClient();
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { text: `You are an Expert Veo 3.1 Prompt Engineer. 
                Analyze these two frames (Start and End). 
                Write a highly technical "Motion Prompt" that describes the journey from A to B.
                
                USE THIS FORMULA EXACTLY:
                [CAMERA ANGLE] + [SHOT TYPE] + [SUBJECT] + [ACTION] + [ENVIRONMENT] + [LIGHTING] + [CAMERA MOVEMENT] + [DURATION].
                
                REFERENCE GUIDE:
                ${VEO_PROMPTING_GUIDE}
                
                Output ONLY the prompt text.` },
                { inlineData: { data: cleanDataUrl(startImg), mimeType: getMimeType(startImg) } },
                { inlineData: { data: cleanDataUrl(endImg), mimeType: getMimeType(endImg) } }
            ]
        }
    });

    return response.text?.trim() || "Cut to next frame";
};

export const generateShotSpecs = async (
    startImg: string, 
    movement: string, 
    duration: string,
    audio: string,
    characterRefs: ReferenceAsset[] = []
): Promise<{ endFramePrompt: string, videoMotionPrompt: string }> => {
    const ai = await getClient();
    
    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            endFramePrompt: { type: Type.STRING, description: "A highly detailed image generation prompt for the last frame of the shot. It must describe the scene as if the camera has completed the requested movement. If character references are provided, mention them to maintain consistency." },
            videoMotionPrompt: { type: Type.STRING, description: "A technical motion prompt for Veo 3.1 that describes the journey from Start to End, adhering to the Formula: [CAMERA] + [SUBJECT] + [ACTION] + [LIGHTING] + [MOVEMENT] + [DURATION]." }
        },
        required: ["endFramePrompt", "videoMotionPrompt"]
    };

    const parts: any[] = [
        { text: `You are a Virtual Cinematographer and Veo 3.1 Expert.
        Analyze this START FRAME. The user wants to generate a video shot with the following parameters:
        - Camera Movement: ${movement}
        - Duration: ${duration}
        - Audio Direction: ${audio || 'None'}
        ${characterRefs.length > 0 ? `- IMPORTANT: Consistency with ${characterRefs.length} provided Character/Ingredient images.` : ''}
        
        REFERENCE GUIDE:
        ${VEO_PROMPTING_GUIDE}

        Task 1: Describe the END FRAME of this shot. If the camera moves (e.g. Dolly In), what does the final frame look like? It must maintain visual consistency (lighting, character, style) with the start frame but reflect the new camera position or time elapsed.
        Task 2: Write a technical motion prompt for Veo 3.1 that describes the journey from Start to End.
        ` },
        { inlineData: { data: cleanDataUrl(startImg), mimeType: getMimeType(startImg) } }
    ];

    characterRefs.forEach(ref => {
        parts.push({ inlineData: { data: cleanDataUrl(ref.data), mimeType: getMimeType(ref.data) } });
    });

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: parts
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const text = response.text;
    if (!text) throw new Error("Failed to generate shot specs");
    
    return JSON.parse(text);
};

export const generateVideo = async (
    prompt: string,
    startFrame?: string,
    endFrame?: string,
    characterReferences?: string[]
): Promise<GeneratedVideo> => {
    const ai = await getClient();
    const model = 'veo-3.1-fast-generate-preview';
    
    const params: any = {
        model: model,
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9' 
        }
    };

    if (startFrame) {
        params.image = {
            imageBytes: cleanDataUrl(startFrame),
            mimeType: getMimeType(startFrame)
        };
    }

    if (endFrame) {
        params.config.lastFrame = {
            imageBytes: cleanDataUrl(endFrame),
            mimeType: getMimeType(endFrame)
        };
    }

    let operation = await ai.models.generateVideos(params);
    let retryCount = 0;
    const maxRetries = 60; 

    while (!operation.done && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        operation = await ai.operations.getVideosOperation({operation: operation});
        retryCount++;
    }

    if (!operation.done) {
        throw new Error("Video generation timed out.");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("No video URI returned.");
    
    const playbackUrl = `${videoUri}&key=${process.env.API_KEY || ''}`;

    return {
        id: crypto.randomUUID(),
        projectId: '', 
        videoUrl: playbackUrl,
        thumbnailUrl: startFrame || '',
        prompt: prompt,
        status: 'completed',
        createdAt: Date.now()
    };
};

export const analyzeScript = async (scriptContent: string): Promise<{ beats: Beat[], characters: CharacterProfile[] }> => {
  const ai = await getClient();

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      beats: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            visualSummary: { type: Type.STRING, description: "A concise visual description of the action in this beat." },
            shotType: { type: Type.STRING, description: "Suggested shot type (e.g. WIDE, CLOSE, MED)." },
            duration: { type: Type.STRING, description: "Estimated duration (e.g. 2s)." },
            mood: { type: Type.STRING, description: "Atmosphere or emotion." },
            characters: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Names of characters present in this beat." },
            locations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Names of locations/environments in this beat." },
            products: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Names of products/props featured in this beat." }
          },
          required: ["visualSummary", "shotType", "duration", "mood", "characters"]
        }
      },
      characters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING, description: "Visual description of the character." },
            promptSnippet: { type: Type.STRING, description: "Optimized Nano Banana prompt fragment for this character." },
            consistencyAnchors: { type: Type.STRING, description: "Comma-separated visual anchors (e.g. 'Red Scarf, Blue Eyes')." }
          },
          required: ["name", "description"]
        }
      }
    },
    required: ["beats", "characters"]
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [{ text: `Analyze the following movie script segment. Break it down into visual beats for a storyboard, and extract detailed character profiles including prompts for consistency.

For each beat, also identify:
- LOCATIONS: Any named environments or settings mentioned
- PRODUCTS: Any specific products, props, or branded items featured

SCRIPT:
${scriptContent}` }]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to analyze script");
  
  const parsed = JSON.parse(text);
  
  // Post-process to ensure IDs and arrays
  const beatsWithIds = parsed.beats.map((b: any) => ({
      ...b,
      id: b.id || crypto.randomUUID(),
      status: 'scripted',
      locations: b.locations || [],
      products: b.products || []
  }));

  const charactersWithIds = parsed.characters.map((c: any) => ({
    ...c,
    id: crypto.randomUUID(),
    imageRefs: []
  }));

  return {
    beats: beatsWithIds,
    characters: charactersWithIds
  };
};

export const consultDirectorChat = async (userQuery: string, context: string): Promise<string> => {
  const ai = await getClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [{ text: `${VIRTUAL_DIRECTOR_PROMPT}
      
      CONTEXT:
      ${context}
      
      USER QUERY:
      ${userQuery}
      
      Answer concisely.` }]
    }
  });

  return response.text || "I'm thinking...";
};

// ==============================
// CHARACTER REFERENCE COVERAGE
// ==============================

/**
 * Analyzes a character's reference images to determine coverage quality.
 * Returns which angles/views are covered and which are missing.
 */
export const analyzeImageCoverage = async (
  referenceImages: string[],
  characterName: string,
  characterVisuals: string
): Promise<CoverageAnalysis> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview'; // Vision capable, fast

    // Build multimodal prompt with all existing reference images
    const parts: Part[] = [];

    referenceImages.forEach(imgUrl => {
      const cleanData = imgUrl.split(',')[1] || imgUrl;
      parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
    });

    parts.push({
      text: `You are a CHARACTER REFERENCE ANALYST for AI consistency.

CHARACTER: ${characterName}
DESCRIPTION: ${characterVisuals}

TASK: Analyze the provided reference images and identify:
1. What angles/views are ALREADY covered (front, side, back, 3/4, close-up face, full body, etc.)
2. What angles/views are MISSING that would help AI consistency
3. Overall coverage quality (low/medium/high)
4. Recommendation for what to generate next

CRITICAL ANGLES FOR CHARACTER CONSISTENCY:
- Front view (full body)
- Side profile (left or right)
- 3/4 view (angled)
- Back view
- Close-up face (front)
- Close-up face (3/4)
- Action poses (if character is dynamic)
- Key outfit details (jacket, shoes, accessories)

OUTPUT FORMAT (JSON):
{
  "existingViews": ["front full body", "close-up face", ...],
  "missingViews": ["side profile", "back view", ...],
  "confidence": "low" | "medium" | "high",
  "recommendation": "Top 2-3 most important missing angles to generate"
}`
    });

    const response = await ai.models.generateContent({
      model,
      contents: { parts }
    });

    const text = response.text;
    if (!text) throw new Error('No analysis returned');

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log('📊 Coverage Analysis:', analysis);
      return analysis;
    }

    // Fallback if JSON parsing fails
    return {
      existingViews: ['unknown'],
      missingViews: ['front view', 'side profile', '3/4 view'],
      confidence: 'low',
      recommendation: 'Could not parse analysis. Consider adding standard character turnaround views.'
    };

  } catch (error) {
    console.error('Coverage analysis failed:', error);
    return {
      existingViews: [],
      missingViews: ['front view', 'side profile', '3/4 view', 'back view'],
      confidence: 'low',
      recommendation: 'Analysis failed. Add standard turnaround views for best consistency.'
    };
  }
};

/**
 * Generates a missing reference view for a character using existing references as style anchors.
 */
export const generateMissingReference = async (
  existingReferences: string[],
  characterName: string,
  characterVisuals: string,
  missingView: string,
  styleContext?: string
): Promise<string | null> => {
  console.log('🎬 generateMissingReference called');
  console.log('   - Character:', characterName);
  console.log('   - Missing view:', missingView);
  console.log('   - Existing references:', existingReferences.length);

  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview'; // Nano Banana Pro for image gen

    // Build multimodal prompt with existing references
    const parts: Part[] = [];

    // Add all existing references (up to 14)
    const refsToUse = existingReferences.slice(0, 14);
    console.log(`   - Adding ${refsToUse.length} reference images to prompt`);

    refsToUse.forEach((imgUrl, idx) => {
      const cleanData = imgUrl.split(',')[1] || imgUrl;
      parts.push({ inlineData: { mimeType: 'image/png', data: cleanData } });
    });

    // Create prompt for missing view
    const prompt = `CHARACTER REFERENCE SHEET: ${missingView}

Character: ${characterName}
Description: ${characterVisuals}

TASK: Generate a clean reference image showing the ${missingView}.

REQUIREMENTS:
- Match the character's appearance from the reference images EXACTLY
- Same outfit, same proportions, same facial features, same hair
- Clean, neutral pose suitable for reference
- ${styleContext || 'Professional character design aesthetic'}
- Plain background (solid color - pink, gray, or white)
- Professional character turnaround quality
- NO scene, NO environment, JUST the character reference

CRITICAL: This is a REFERENCE IMAGE for AI consistency, not a scene shot.`;

    parts.push({ text: prompt });

    console.log('📡 Calling Gemini API for reference generation...');
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { 
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: { aspectRatio: '1:1', imageSize: '2K' } 
      }
    });

    console.log('📥 API response received');

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log(`✅ Generated missing reference: ${missingView}`);
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    console.warn('⚠️ No image data found in response');
    return null;
  } catch (error) {
    console.error('❌ Reference generation failed:', error);
    return null;
  }
};

/**
 * Auto-visualize a character from just their description (avatar generation).
 */
export const generateCharacterAvatar = async (
  characterName: string,
  description: string,
  styleContext?: string
): Promise<string | null> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview'; // Nano Banana Pro

    const prompt = `CHARACTER DESIGN PORTRAIT

Character: ${characterName}
Description: ${description}

Create a professional character portrait/avatar showing:
- Front-facing view, head and shoulders or 3/4 body
- Clear view of face and key identifying features
- ${styleContext || 'High-end character design, clean lighting'}
- Solid neutral background (pink, gray, or studio white)
- Professional quality suitable for character bible

This is a CHARACTER REFERENCE, not a scene. Focus on the character.`;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: { 
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: { aspectRatio: '1:1', imageSize: '2K' } 
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log(`✅ Generated avatar for: ${characterName}`);
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Avatar generation failed:', error);
    return null;
  }
};

/**
 * Character Analysis Result from Gemini Vision
 */
export interface CharacterAnalysisResult {
  visualDescription: string;
  promptSnippet: string;
  consistencyAnchors: string;
}

/**
 * Analyze a character image using Gemini Vision and extract:
 * - Visual Description (detailed)
 * - AI Prompt Snippet (optimized for image generation)
 * - Consistency Anchors (unique identifying features)
 */
export const analyzeCharacterFromImage = async (
  imageBase64: string,
  characterName?: string
): Promise<CharacterAnalysisResult> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview'; // Vision capable, fast

    // Clean base64 data
    const cleanData = imageBase64.includes(',')
      ? imageBase64.split(',')[1]
      : imageBase64;

    const parts: Part[] = [
      { inlineData: { mimeType: 'image/png', data: cleanData } },
      {
        text: `You are a CHARACTER DESIGN ANALYST for AI-generated imagery.

Analyze this character image and provide:

1. VISUAL DESCRIPTION (2-3 sentences):
   - Physical appearance (age, build, hair, eyes, skin)
   - Clothing and style
   - Overall aesthetic/vibe

2. AI PROMPT SNIPPET (1-2 sentences, max 100 words):
   - Optimized text for AI image generation
   - Include key visual elements in efficient prompt format
   - Focus on reproducibility

3. CONSISTENCY ANCHORS (comma-separated list):
   - Unique identifying features that MUST stay consistent
   - Hair style/color, eye color, distinctive clothing
   - Scars, tattoos, accessories, signature items
   - Things that make this character recognizable

${characterName ? `Character Name: ${characterName}` : ''}

OUTPUT FORMAT (JSON only, no markdown):
{
  "visualDescription": "...",
  "promptSnippet": "...",
  "consistencyAnchors": "..."
}`
      }
    ];

    const response = await ai.models.generateContent({
      model,
      contents: { parts }
    });

    const text = response.text;
    if (!text) throw new Error('No analysis returned');

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log('🎭 Character Analysis:', analysis);
      return {
        visualDescription: analysis.visualDescription || '',
        promptSnippet: analysis.promptSnippet || '',
        consistencyAnchors: analysis.consistencyAnchors || ''
      };
    }

    throw new Error('Could not parse analysis response');

  } catch (error) {
    console.error('Character analysis failed:', error);
    return {
      visualDescription: '',
      promptSnippet: '',
      consistencyAnchors: ''
    };
  }
};

/**
 * Generate a character turnaround sheet (2x2 grid with front, 3/4, side, back views).
 */
export const generateCharacterSheet = async (
  characterName: string,
  description: string,
  referenceImage: string,
  styleContext?: string
): Promise<string | null> => {
  try {
    const ai = await getClient();
    const cleanBase64 = cleanDataUrl(referenceImage);
    const mimeType = getMimeType(referenceImage);

    const prompt = `CREATE A PROFESSIONAL CHARACTER TURNAROUND SHEET

Character: ${characterName}
${description ? `Description: ${description}` : ''}

Based on the provided character reference image, generate a 2x2 grid showing:
- TOP LEFT: Front view (facing camera directly, neutral pose)
- TOP RIGHT: 3/4 view from the left side
- BOTTOM LEFT: 3/4 view from the right side
- BOTTOM RIGHT: Back view (facing away from camera)

CRITICAL REQUIREMENTS:
- Maintain EXACT facial features, hair style, hair color, and skin tone across ALL 4 views
- Maintain EXACT clothing, accessories, patterns, and proportions across ALL 4 views
- Use neutral standing pose with arms slightly away from body (T-pose or relaxed)
- Clean studio lighting with soft shadows
- Simple gray or white studio background for all 4 panels
- Same scale and framing for all 4 views
- Professional animation/film character reference quality
${styleContext ? `- Style: ${styleContext}` : ''}

This is a PRODUCTION CHARACTER REFERENCE SHEET. CONSISTENCY IS MORE IMPORTANT THAN CREATIVITY.
The character must look IDENTICAL in all 4 views - only the camera angle changes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: cleanBase64, mimeType: mimeType } }
        ]
      },
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: '1:1', // Square for 2x2 grid
          imageSize: '2K'
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log(`✅ Generated character sheet for: ${characterName}`);
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Character sheet generation failed:', error);
    return null;
  }
};

/**
 * Generate an expression bank (3x2 grid of 6 emotions) for a character.
 */
export const generateExpressionBank = async (
  characterName: string,
  referenceImage: string,
  styleContext?: string
): Promise<string | null> => {
  try {
    const ai = await getClient();
    const cleanBase64 = cleanDataUrl(referenceImage);
    const mimeType = getMimeType(referenceImage);

    const prompt = `CREATE AN EXPRESSION BANK - 6 FACIAL EXPRESSIONS IN A 3x2 GRID

Character: ${characterName}

Based on the provided character reference image, generate a 3x2 grid of facial expressions:

TOP ROW (left to right):
1. JOY - Genuine smile, eyes crinkling, happy expression
2. ANGER - Furrowed brow, intense glare, clenched jaw
3. SORROW - Sad eyes, downturned mouth, possibly tearful

BOTTOM ROW (left to right):
4. SURPRISE - Wide eyes, raised eyebrows, open mouth
5. FEAR - Worried expression, tense, wide frightened eyes
6. NEUTRAL - Calm, default expression, relaxed face

CRITICAL REQUIREMENTS:
- EXACT same person in ALL 6 cells - identical features, hair, skin tone, distinguishing marks
- Same lighting setup across all expressions (soft studio lighting)
- Same camera angle (front-facing, head and shoulders framing)
- Same neutral background (gray or white) for all cells
- Clear visual separation between grid cells
- Each expression must be distinctly readable and recognizable
- Consistent scale and positioning of the face in each cell
${styleContext ? `- Visual style: ${styleContext}` : ''}

This is for ANIMATION/PRODUCTION reference. CONSISTENCY across all 6 expressions is more important than artistic interpretation.
The character must be INSTANTLY recognizable as the same person in every cell.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: cleanBase64, mimeType: mimeType } }
        ]
      },
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: '3:2', // 3x2 grid aspect
          imageSize: '2K'
        }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log(`✅ Generated expression bank for: ${characterName}`);
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Expression bank generation failed:', error);
    return null;
  }
};

// ============================================
// SHOT DESIGN AGENT - NEW FEATURES
// ============================================

/**
 * SceneBeat type for story planning
 */
export interface SceneBeat {
  beatNumber: number;
  action: string;
  recommendedShots: string[];
  imageUrl?: string;
}

/**
 * Generate a beat sheet from a scene idea
 * Returns structured beats with recommended camera coverage
 */
export const generateBeatSheet = async (idea: string): Promise<SceneBeat[]> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview';

    const prompt = `Create a 5-beat sequence for a film scene based on this idea: "${idea}".
For each beat, provide the action and a list of 2-3 recommended camera shots (e.g., "Wide Master", "Close Up", "Over The Shoulder").
Return JSON only.

Format:
[
  {
    "beatNumber": 1,
    "action": "Description of what happens",
    "recommendedShots": ["Wide Master", "Medium Shot"]
  }
]`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              beatNumber: { type: Type.INTEGER },
              action: { type: Type.STRING },
              recommendedShots: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];

    const beats = JSON.parse(text) as SceneBeat[];
    console.log('📋 Generated beat sheet:', beats.length, 'beats');
    return beats;
  } catch (error) {
    console.error('Beat sheet generation failed:', error);
    return [];
  }
};

/**
 * Generate location image with time of day, weather, and optional real-world grounding
 */
export const generateLocationWithAtmosphere = async (
  description: string,
  timeOfDay: string,
  weather: string,
  realLocation?: string
): Promise<string | null> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview'; // Nano Banana Pro

    let prompt = `Cinematic environment concept art. ${description}.`;
    prompt += ` Time of day: ${timeOfDay}. Weather: ${weather}.`;

    if (realLocation) {
      prompt += ` Based on real world location: ${realLocation}. Photorealistic, high detail.`;
    } else {
      prompt += ` Highly detailed, atmospheric, movie set design.`;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: {
          aspectRatio: '16:9',
          imageSize: '2K'
        },
        // Use Google Search if a real location is provided for grounding
        tools: realLocation ? [{ googleSearch: {} }] : undefined
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          console.log(`✅ Generated location: ${timeOfDay}, ${weather}`);
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Location generation failed:', error);
    return null;
  }
};

/**
 * Generate texture pack for a location (3 textures)
 * Returns: surface detail, architectural detail, ground texture
 */
export const generateTexturePack = async (locationDescription: string): Promise<string[]> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview';

    const prompts = [
      `Close up texture detail of surface for: ${locationDescription}. Material study, photorealistic 8k macro shot.`,
      `Architectural detail close up for: ${locationDescription}. Lighting study, weathering details.`,
      `Ground or floor surface texture for: ${locationDescription}. Roughness and weathering detail, top-down view.`
    ];

    const generateTexture = async (p: string): Promise<string> => {
      const response = await ai.models.generateContent({
        model,
        contents: p,
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '1K'
          }
        }
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      return '';
    };

    const results = await Promise.all(prompts.map(p => generateTexture(p)));
    const validResults = results.filter(r => r !== '');
    console.log(`🎨 Generated ${validResults.length} textures`);
    return validResults;
  } catch (error) {
    console.error('Texture pack generation failed:', error);
    return [];
  }
};

/**
 * Camera stability levels for video generation
 */
export type CameraStability = 'tripod' | 'handheld' | 'manic';

/**
 * Generate video with camera stability control
 * Stability: tripod (0-30), handheld (31-70), manic (71-100)
 */
export const generateVideoWithStability = async (
  prompt: string,
  stability: number = 20
): Promise<string | null> => {
  try {
    const ai = await getClient();
    const model = 'veo-3.1-fast-generate-preview';

    // Inject stability context into the prompt
    let stabilityContext = "";
    if (stability < 30) {
      stabilityContext = "Shot on a stable tripod, smooth fluid motion, steadycam, professional cinematography.";
    } else if (stability < 70) {
      stabilityContext = "Handheld camera movement, slight organic shake, realistic documentary feel.";
    } else {
      stabilityContext = "Intense shaky cam, chaotic action camera, heavy vibration, action movie style.";
    }

    const finalPrompt = `${prompt}. ${stabilityContext}`;
    console.log(`🎬 Generating video with stability: ${stability}%`);

    let operation = await ai.models.generateVideos({
      model,
      prompt: finalPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Polling for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
      console.log('⏳ Video generation in progress...');
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      console.error('No video URI returned');
      return null;
    }

    // Fetch the actual video
    const apiKey = (import.meta as unknown as { env: { VITE_GEMINI_API_KEY?: string } }).env.VITE_GEMINI_API_KEY || '';
    const videoRes = await fetch(`${videoUri}&key=${apiKey}`);
    if (!videoRes.ok) {
      console.error('Failed to download video');
      return null;
    }

    const blob = await videoRes.blob();
    console.log('✅ Video generated successfully');
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Video generation with stability failed:', error);
    return null;
  }
};

/**
 * Camera move templates for video generation
 */
export const CAMERA_MOVE_TEMPLATES = [
  { label: "Orbit", prompt: "Camera orbits 360 degrees around the subject, keeping them centered." },
  { label: "Dolly In", prompt: "Slow dolly zoom in towards the subject's face, increasing tension." },
  { label: "Dolly Out", prompt: "Camera pulls back slowly to reveal the environment." },
  { label: "Truck Left", prompt: "Camera trucks left laterally, following the subject's movement." },
  { label: "Truck Right", prompt: "Camera trucks right laterally, following the subject's movement." },
  { label: "Tilt Up", prompt: "Camera tilts up from the ground/feet to the subject's face." },
  { label: "Crane Shot", prompt: "High angle crane shot lifting up and away from the scene." },
  { label: "Push In", prompt: "Camera slowly pushes in, building intensity." },
  { label: "Pull Back Reveal", prompt: "Camera pulls back to reveal context and environment." }
];

/**
 * Time of day options for location generation
 */
export const TIME_OF_DAY_OPTIONS = [
  "Dawn",
  "Morning",
  "Noon",
  "Golden Hour",
  "Blue Hour",
  "Dusk",
  "Midnight",
  "Overcast Day"
];

/**
 * Weather options for location generation
 */
export const WEATHER_OPTIONS = [
  "Clear",
  "Overcast",
  "Foggy",
  "Light Rain",
  "Heavy Rain",
  "Storm",
  "Snow",
  "Dusty",
  "Dystopian Haze"
];

// ============================================
// PRODUCTION METADATA ANALYSIS
// ============================================

/**
 * Production metadata extracted from generated images
 */
export interface ProductionMetadata {
  lightingAnalysis: {
    keyLight: string;        // "High contrast side lighting"
    fillRatio: string;       // "1:4 ratio, dramatic shadows"
    colorTemp: string;       // "Warm tungsten (3200K)"
    practicals: string[];    // ["Neon signs", "Street lamps"]
    mood: string;            // "Noir, mysterious"
  };
  setDressingNotes: {
    foreground: string;      // "Character silhouette"
    midground: string;       // "Rain-slicked pavement"
    background: string;      // "Blurred city lights"
    atmosphere: string;      // "Dense fog, volumetric"
  };
  technicalNotes: {
    suggestedLens: string;   // "35mm anamorphic"
    aperture: string;        // "f/2.8 for shallow DOF"
    shotType: string;        // "Medium wide establishing"
    cameraHeight: string;    // "Low angle, below eye level"
  };
  recommendations: string[]; // Shooting recommendations
}

/**
 * Analyze a generated image for production metadata
 * Provides lighting, set dressing, and technical notes for production reference
 */
export const analyzeProductionMetadata = async (imageData: string): Promise<ProductionMetadata | null> => {
  try {
    const ai = await getClient();

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            {
              text: `Analyze this image as a cinematographer and production designer.
Provide detailed technical notes for recreating this shot in production.

Return JSON with this structure:
{
  "lightingAnalysis": {
    "keyLight": "Description of main light source and direction",
    "fillRatio": "Light ratio and shadow density",
    "colorTemp": "Color temperature description",
    "practicals": ["List of visible light sources in scene"],
    "mood": "Overall lighting mood"
  },
  "setDressingNotes": {
    "foreground": "Elements in foreground",
    "midground": "Central action area description",
    "background": "Background elements and depth",
    "atmosphere": "Fog, rain, particles, etc."
  },
  "technicalNotes": {
    "suggestedLens": "Recommended focal length",
    "aperture": "Suggested f-stop for this DOF",
    "shotType": "Shot size and framing",
    "cameraHeight": "Camera position relative to subject"
  },
  "recommendations": ["List of 2-3 shooting tips for this look"]
}`
            },
            {
              inlineData: {
                data: cleanDataUrl(imageData),
                mimeType: getMimeType(imageData)
              }
            }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      }),
      30000, // 30 seconds for analysis
      'Production metadata analysis'
    );

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as ProductionMetadata;
  } catch (error) {
    console.error('Production metadata analysis failed:', error);
    return null;
  }
};

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

/**
 * Extract product specifications from uploaded image
 */
export const extractProductSpecs = async (imageData: string): Promise<ProductSpecs | null> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview';

    const cleanData = cleanDataUrl(imageData);
    const mimeType = getMimeType(imageData);

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analyze this product image and extract detailed specifications.

Return a JSON object with these fields:
- productType: What type of product (e.g., "Sneaker", "Watch", "Bag")
- brand: Detected or inferred brand name (if visible/recognizable)
- modelName: Specific model name if identifiable
- primaryColor: Main color with hex code (e.g., "University Red #DC143C")
- secondaryColors: Array of other colors with hex codes
- materials: Array of materials detected (e.g., ["Leather", "Rubber", "Mesh"])
- finishes: Array of surface finishes (e.g., ["Matte", "Glossy"])
- logoPlacement: Where logos/branding appear
- distinctiveFeatures: Array of unique identifying elements
- dimensions: Approximate proportions/size description
- promptSnippet: A detailed prompt snippet that would regenerate this exact product

Be extremely precise with colors - use accurate hex codes.
Focus on visual details that ensure consistent regeneration.`
            },
            {
              inlineData: { data: cleanData, mimeType }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productType: { type: Type.STRING },
            brand: { type: Type.STRING },
            modelName: { type: Type.STRING },
            primaryColor: { type: Type.STRING },
            secondaryColors: { type: Type.ARRAY, items: { type: Type.STRING } },
            materials: { type: Type.ARRAY, items: { type: Type.STRING } },
            finishes: { type: Type.ARRAY, items: { type: Type.STRING } },
            logoPlacement: { type: Type.STRING },
            distinctiveFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
            dimensions: { type: Type.STRING },
            promptSnippet: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const specs = JSON.parse(text) as ProductSpecs;
    console.log('🔍 Extracted product specs:', specs.productType, specs.primaryColor);
    return specs;
  } catch (error) {
    console.error('Product spec extraction failed:', error);
    return null;
  }
};

/**
 * Helper: delay for retry logic
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract character specifications from uploaded image with retry logic
 * Uses Flash model for speed (3-4x faster than Pro)
 */
export const extractCharacterSpecs = async (
  imageData: string,
  maxRetries: number = 3
): Promise<CharacterSpecs | null> => {
  const ai = await getClient();
  // Use Flash for speed - spec extraction doesn't need Pro quality
  const model = 'gemini-2.0-flash';

  const cleanData = cleanDataUrl(imageData);
  const mimeType = getMimeType(imageData);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📸 Extracting character specs (attempt ${attempt}/${maxRetries})...`);

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analyze this person/character image and extract detailed specifications for consistent regeneration.

Return a JSON object with these fields:
- gender: Male, Female, or Non-binary
- ageRange: Estimated age range (e.g., "25-30")
- ethnicity: For accurate representation
- skinTone: Detailed description for consistency
- hairColor: Specific color description
- hairStyle: Style description (e.g., "Short curly afro", "Long straight blonde")
- eyeColor: If visible
- facialFeatures: Array of distinctive facial characteristics
- bodyType: Physical build description
- height: Relative height if determinable
- distinctiveFeatures: Array of unique elements (tattoos, piercings, glasses, scars)
- clothing: Current outfit description if visible
- promptSnippet: A detailed prompt snippet that would regenerate this exact person

Focus on details that ensure identity consistency across multiple generations.`
              },
              {
                inlineData: { data: cleanData, mimeType }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              gender: { type: Type.STRING },
              ageRange: { type: Type.STRING },
              ethnicity: { type: Type.STRING },
              skinTone: { type: Type.STRING },
              hairColor: { type: Type.STRING },
              hairStyle: { type: Type.STRING },
              eyeColor: { type: Type.STRING },
              facialFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
              bodyType: { type: Type.STRING },
              height: { type: Type.STRING },
              distinctiveFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
              clothing: { type: Type.STRING },
              promptSnippet: { type: Type.STRING }
            }
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('Empty response from API');
      }

      const specs = JSON.parse(text) as CharacterSpecs;
      console.log('🔍 Extracted character specs:', specs.gender, specs.ageRange, specs.hairStyle);
      return specs;

    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, error);

      // Check for specific error types
      const errorMessage = (error as Error).message || '';

      // Don't retry on certain errors
      if (errorMessage.includes('INVALID_ARGUMENT') ||
          errorMessage.includes('Invalid image') ||
          errorMessage.includes('Could not process image')) {
        console.error('❌ Image format/quality issue - not retrying');
        break;
      }

      // Exponential backoff for retryable errors
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
        await delay(backoffMs);
      }
    }
  }

  console.error('❌ Character spec extraction failed after all retries:', lastError);
  return null;
};

/**
 * Extract location specifications from uploaded image
 */
export const extractLocationSpecs = async (imageData: string): Promise<LocationSpecs | null> => {
  try {
    const ai = await getClient();
    const model = 'gemini-3-pro-preview';

    const cleanData = cleanDataUrl(imageData);
    const mimeType = getMimeType(imageData);

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analyze this location/environment image and extract detailed specifications.

Return a JSON object with these fields:
- locationType: Type of location (e.g., "Urban street", "Beach", "Basketball court")
- architectureStyle: Architectural style if applicable
- era: Time period feel (e.g., "Contemporary", "1980s", "Futuristic")
- dominantColors: Array of main colors with hex codes
- lightingSituation: Lighting description (e.g., "Golden hour natural light", "Neon signs at night")
- atmosphere: Overall mood/feel of the location
- keyElements: Array of distinctive visual elements
- weatherConditions: If visible/determinable
- timeOfDay: If determinable from lighting
- realWorldLocation: If this is a recognizable real-world location
- promptSnippet: A detailed prompt snippet that would regenerate this exact environment

Focus on atmospheric and visual details for consistent regeneration.`
            },
            {
              inlineData: { data: cleanData, mimeType }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            locationType: { type: Type.STRING },
            architectureStyle: { type: Type.STRING },
            era: { type: Type.STRING },
            dominantColors: { type: Type.ARRAY, items: { type: Type.STRING } },
            lightingSituation: { type: Type.STRING },
            atmosphere: { type: Type.STRING },
            keyElements: { type: Type.ARRAY, items: { type: Type.STRING } },
            weatherConditions: { type: Type.STRING },
            timeOfDay: { type: Type.STRING },
            realWorldLocation: { type: Type.STRING },
            promptSnippet: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const specs = JSON.parse(text) as LocationSpecs;
    console.log('🔍 Extracted location specs:', specs.locationType, specs.atmosphere);
    return specs;
  } catch (error) {
    console.error('Location spec extraction failed:', error);
    return null;
  }
};

/**
 * Convert extracted specs to enhanced prompt snippet
 */
export const specsToPromptSnippet = (
  specs: ProductSpecs | CharacterSpecs | LocationSpecs,
  type: 'product' | 'character' | 'location'
): string => {
  if (type === 'product') {
    const p = specs as ProductSpecs;
    return `${p.productType}${p.brand ? ` by ${p.brand}` : ''}${p.modelName ? ` (${p.modelName})` : ''}, ${p.primaryColor}, ${p.materials.join(' and ')} construction, ${p.finishes.join('/')} finish${p.distinctiveFeatures.length > 0 ? `, featuring ${p.distinctiveFeatures.join(', ')}` : ''}`;
  }

  if (type === 'character') {
    const c = specs as CharacterSpecs;
    return `${c.gender}, ${c.ageRange} years old, ${c.ethnicity || ''} ${c.skinTone} skin, ${c.hairStyle} ${c.hairColor} hair, ${c.bodyType} build${c.distinctiveFeatures.length > 0 ? `, with ${c.distinctiveFeatures.join(', ')}` : ''}`;
  }

  if (type === 'location') {
    const l = specs as LocationSpecs;
    return `${l.locationType}${l.architectureStyle ? `, ${l.architectureStyle} architecture` : ''}, ${l.atmosphere} atmosphere, ${l.lightingSituation}${l.keyElements.length > 0 ? `, featuring ${l.keyElements.join(', ')}` : ''}`;
  }

  return specs.promptSnippet;
};

// ============================================
// PHOTO-TO-CHARACTER STYLIZATION
// ============================================

export interface PhotoToCharacterResult {
  stylizedImage: string;           // Base64 of generated stylized character
  extractedSpecs: CharacterSpecs;  // Specs extracted from original photo
  characterProfile: CharacterProfile; // Ready-to-use character profile
}

/**
 * Generate a stylized character from a real person photo using a locked-in style
 *
 * This combines:
 * 1. Character specs extraction from the real person photo
 * 2. Style DNA from the project default style
 * 3. Image generation with both references
 */
export const generateStylizedCharacterFromPhoto = async (
  realPhoto: string,               // Base64 of real person photo
  styleDNA: StyleDNA,              // Style to apply (from ProjectDefaultStyle)
  styleReferenceImage: string,     // Base64 of style reference image
  characterName: string,
  config: GenerationConfig = { aspectRatio: '1:1', resolution: '2K' }
): Promise<PhotoToCharacterResult> => {

  console.log('🎨 Starting Photo-to-Character stylization for:', characterName);

  // Step 1: Extract specs from the real person photo (with retry logic)
  console.log('📸 Extracting character specs from photo...');
  const extractedSpecs = await extractCharacterSpecs(realPhoto, 3);

  if (!extractedSpecs) {
    throw new Error('Failed to extract character specs from photo. Please try a different image with a clear, well-lit face. Tips: Use a front-facing portrait, avoid blurry or dark images.');
  }

  console.log('✅ Specs extracted:', extractedSpecs.gender, extractedSpecs.ageRange, extractedSpecs.hairStyle);

  // Step 2: Build the stylization prompt
  const stylizationPrompt = buildPhotoToCharacterPrompt(extractedSpecs, styleDNA, characterName);

  // Step 3: Generate the stylized character
  console.log('🖼️ Generating stylized character...');

  const ai = await getClient();
  const model = 'gemini-3-pro-image-preview';

  const cleanPhotoData = cleanDataUrl(realPhoto);
  const photoMimeType = getMimeType(realPhoto);
  const cleanStyleData = cleanDataUrl(styleReferenceImage);
  const styleMimeType = getMimeType(styleReferenceImage);

  // Build parts with both reference images
  const parts: Part[] = [
    { text: stylizationPrompt },
    {
      text: `\n\n[REFERENCE 1 - PERSON TO STYLIZE - Maintain their identity, face shape, features]\n`
    },
    {
      inlineData: { data: cleanPhotoData, mimeType: photoMimeType }
    },
    {
      text: `\n\n[REFERENCE 2 - TARGET STYLE - Apply this exact visual style]\n`
    },
    {
      inlineData: { data: cleanStyleData, mimeType: styleMimeType }
    }
  ];

  // Resolution config
  const resolutionMap: Record<string, string> = {
    '1K': '1024x1024',
    '2K': '2048x2048',
    '4K': '4096x4096'
  };

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        imageSize: config.resolution,
        aspectRatio: config.aspectRatio
      }
    }
  });

  // Extract the generated image
  let stylizedImage = '';

  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        stylizedImage = `data:${mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!stylizedImage) {
    throw new Error('No image was generated');
  }

  console.log('✅ Stylized character generated successfully');

  // Step 4: Create the character profile
  const characterProfile: CharacterProfile = {
    id: crypto.randomUUID(),
    name: characterName,
    description: `Stylized character based on real person reference. ${styleDNA.promptSnippet}`,
    imageRefs: [stylizedImage],
    promptSnippet: extractedSpecs.promptSnippet,
    consistencyAnchors: extractedSpecs.distinctiveFeatures?.join(', ') || '',
    extractedSpecs: extractedSpecs,
    sourcePhoto: realPhoto,
    generatedFromPhoto: true,
    refCoverage: {
      face: [stylizedImage]
    }
  };

  return {
    stylizedImage,
    extractedSpecs,
    characterProfile
  };
};

/**
 * Build an optimized prompt for photo-to-character stylization
 */
const buildPhotoToCharacterPrompt = (
  specs: CharacterSpecs,
  styleDNA: StyleDNA,
  characterName: string
): string => {
  return `PHOTO-TO-STYLIZED CHARACTER TRANSFORMATION

CHARACTER NAME: ${characterName}

=== TASK ===
Transform the person in REFERENCE 1 into a stylized character matching the visual style of REFERENCE 2.
This is NOT a simple filter - you must RE-CREATE the person as a stylized character while maintaining their recognizable identity.

=== PERSON IDENTITY (PRESERVE THESE FROM REFERENCE 1) ===
- Gender: ${specs.gender}
- Age: ${specs.ageRange}
- Face shape and proportions: CRITICAL - maintain recognizability
- Hair: ${specs.hairColor}, ${specs.hairStyle}
- Skin tone: ${specs.skinTone}
- Body type: ${specs.bodyType}
- Distinctive features: ${specs.distinctiveFeatures?.join(', ') || 'None specified'}
${specs.eyeColor ? `- Eye color: ${specs.eyeColor}` : ''}

=== VISUAL STYLE (APPLY FROM REFERENCE 2) ===
${styleDNA.promptSnippet}

Style characteristics:
- Color palette: ${styleDNA.colorPalette?.join(', ') || 'Match reference'}
- Lighting: ${styleDNA.lightingCharacteristics || 'Match reference'}
- Photographic style: ${styleDNA.photographicStyle || 'Stylized 3D'}
- Mood: ${styleDNA.moodKeywords?.join(', ') || 'Match reference'}
${styleDNA.compositionPatterns?.length > 0 ? `- Composition: ${styleDNA.compositionPatterns.join(', ')}` : ''}

=== OUTPUT REQUIREMENTS ===
1. Full body character portrait, facing camera
2. Clean background (neutral or simple gradient)
3. Professional character design quality
4. The person should be INSTANTLY RECOGNIZABLE but rendered in the target style
5. Include nice footwear/shoes appropriate to the style
6. Studio-quality lighting consistent with the style reference

=== CRITICAL ===
- Do NOT make a photorealistic image
- Do NOT create a generic character - this must look like THE SPECIFIC PERSON
- Apply the EXACT style from Reference 2 (rendering technique, lighting, colors)
- Maintain facial feature proportions for identity recognition`;
};

/**
 * FAST Photo-to-Character - Single API call version
 * Skips separate spec extraction and does everything in ONE generation call
 * Expected time: ~15-20 seconds (vs 50-80 seconds for multi-call version)
 */
export const generateStylizedCharacterFromPhotoFast = async (
  realPhoto: string,
  styleDNA: StyleDNA,
  styleReferenceImage: string,
  characterName: string,
  config: GenerationConfig = { aspectRatio: '1:1', resolution: '2K' }
): Promise<PhotoToCharacterResult> => {
  console.log('⚡ FAST Photo-to-Character for:', characterName);
  const startTime = Date.now();

  const ai = await getClient();
  const model = 'gemini-3-pro-image-preview';

  const cleanPhotoData = cleanDataUrl(realPhoto);
  const photoMimeType = getMimeType(realPhoto);
  const cleanStyleData = cleanDataUrl(styleReferenceImage);
  const styleMimeType = getMimeType(styleReferenceImage);

  // Single prompt that combines analysis + generation
  const fastPrompt = `PHOTO-TO-STYLIZED CHARACTER - SINGLE PASS

CHARACTER NAME: ${characterName}

=== YOUR TASK ===
Analyze the person in REFERENCE IMAGE 1 and transform them into a stylized character matching REFERENCE IMAGE 2's style.

=== STYLE TO APPLY ===
${styleDNA.promptSnippet}
- Style: ${styleDNA.photographicStyle || 'Stylized 3D animation'}
- Lighting: ${styleDNA.lightingCharacteristics || 'Studio lighting'}
- Mood: ${styleDNA.moodKeywords?.join(', ') || 'Professional'}

=== REQUIREMENTS ===
1. PRESERVE the person's identity: face shape, features, hair, skin tone
2. APPLY the exact visual style from Reference 2
3. Full body portrait, facing camera
4. Clean background (neutral or simple gradient)
5. Professional character design quality
6. Include appropriate footwear

=== CRITICAL ===
- The person must be INSTANTLY RECOGNIZABLE but stylized
- This is NOT a filter - RE-CREATE them in the target style
- Maintain facial proportions for identity recognition

[REFERENCE 1 - THE PERSON TO TRANSFORM]
[REFERENCE 2 - THE TARGET STYLE]`;

  const parts: Part[] = [
    { text: fastPrompt },
    { inlineData: { data: cleanPhotoData, mimeType: photoMimeType } },
    { inlineData: { data: cleanStyleData, mimeType: styleMimeType } }
  ];

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        imageSize: config.resolution,
        aspectRatio: config.aspectRatio
      }
    }
  });

  let stylizedImage = '';
  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        stylizedImage = `data:${mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!stylizedImage) {
    throw new Error('No image was generated');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ FAST generation complete in ${elapsed}s`);

  // Create minimal character profile (no extracted specs in fast mode)
  const characterProfile: CharacterProfile = {
    id: crypto.randomUUID(),
    name: characterName,
    description: `Stylized character based on photo. ${styleDNA.promptSnippet}`,
    imageRefs: [stylizedImage],
    promptSnippet: `${characterName} character in ${styleDNA.photographicStyle || 'stylized'} style`,
    consistencyAnchors: '',
    sourcePhoto: realPhoto,
    generatedFromPhoto: true,
    refCoverage: {
      face: [stylizedImage]
    }
  };

  return {
    stylizedImage,
    extractedSpecs: null as unknown as CharacterSpecs, // Not extracted in fast mode
    characterProfile
  };
};

/**
 * Extract StyleDNA from a single reference image for locking in as project default
 */
export const extractStyleDNAFromImage = async (imageData: string): Promise<StyleDNA> => {
  console.log('🎨 Extracting Style DNA from reference image...');

  const ai = await getClient();
  const model = 'gemini-3-pro-preview';

  const cleanData = cleanDataUrl(imageData);
  const mimeType = getMimeType(imageData);

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Analyze this image and extract its visual style DNA for consistent character generation.

Focus on the RENDERING STYLE and VISUAL AESTHETIC, not the content.

Return a JSON object with these fields:
- colorPalette: Array of 4-6 dominant colors as hex codes
- lightingCharacteristics: Description of lighting approach (e.g., "soft diffuse lighting with rim highlights")
- compositionPatterns: Array of composition techniques used
- moodKeywords: Array of 3-5 mood/atmosphere words
- photographicStyle: Single term (e.g., "Stylized 3D", "Cel-shaded", "Hyperrealistic", "Pixar-style")
- promptSnippet: A 2-3 sentence description that captures this EXACT visual style for regeneration. Be very specific about the rendering technique, lighting, and aesthetic.

Example promptSnippet: "Rendered in a stylized 3D animation style with soft diffuse lighting and subtle cartoon elements. Clean lines with smooth shading, reminiscent of modern animated films. Warm color palette with soft shadows."

Be VERY specific and technical in your analysis.`
          },
          {
            inlineData: { data: cleanData, mimeType }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
          lightingCharacteristics: { type: Type.STRING },
          compositionPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          moodKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          photographicStyle: { type: Type.STRING },
          promptSnippet: { type: Type.STRING }
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to extract style DNA');
  }

  const parsed = JSON.parse(text);

  const styleDNA: StyleDNA = {
    ...parsed,
    generatedAt: Date.now()
  };

  console.log('✅ Style DNA extracted:', styleDNA.photographicStyle, '-', styleDNA.promptSnippet.substring(0, 50) + '...');

  return styleDNA;
};

// ============================================
// SCRIPT DIRECTOR FUNCTIONS
// ============================================

import { ScriptAnalysis, ExtractedEntity, AnalyzedBeat, ClarificationQuestion, CreativeInterpretation, Shot } from '../types';

/**
 * Analyze a messy script and extract structured data
 * This is the CHAOS PARSER layer of the Script Director
 * Enhanced with cinematographic research knowledge
 */
export const analyzeScriptWithDirector = async (
  rawScript: string,
  existingBibles?: {
    characters: CharacterProfile[];
    locations: LocationProfile[];
    products: ProductProfile[];
  }
): Promise<Partial<ScriptAnalysis>> => {
  console.log('🎬 Script Director: Analyzing script...');
  const ai = await getClient();

  const existingCharacterNames = existingBibles?.characters.map(c => c.name) || [];
  const existingLocationNames = existingBibles?.locations.map(l => l.name).filter(Boolean) || [];
  const existingProductNames = existingBibles?.products.map(p => p.name) || [];

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a professional Script Director and DP (Director of Photography) with deep knowledge of cinematographic psychology and visual storytelling. Your job is to analyze messy, unstructured scripts and extract structured, actionable production plans.

=== CINEMATOGRAPHY RESEARCH: CAMERA ANGLE PSYCHOLOGY ===
Camera angles bypass conscious thought and trigger immediate emotional responses:
• LOW ANGLE (Looking Up): Power, dominance, heroism - mimics child looking at adult
• HIGH ANGLE (Looking Down): Vulnerability, weakness, being observed - puts viewer in position of judgment
• EYE LEVEL: Equality, relatability, neutrality - natural human interaction, most "honest" angle
• DUTCH ANGLE: Unease, disorientation, something wrong - use sparingly (1-2 per scene max)
• OVERHEAD: Omniscience, fate, patterns, disconnection - impossible natural perspective

=== CINEMATOGRAPHY RESEARCH: SHOT TYPE EMOTIONAL IMPACT ===
Shot size controls psychological distance:
• EXTREME WIDE (EWS): Scale, loneliness, epic scope - subject <10% of frame
• WIDE (WS): Context, physical action, spatial relationships - full body + environment
• MEDIUM WIDE (MWS): Casual observation, Western standoff energy - head to mid-thigh
• MEDIUM (MS): Conversational, engaged but not intimate - most versatile, default choice
• MEDIUM CLOSE-UP (MCU): Attention, importance, beginning of intimacy - head and shoulders
• CLOSE-UP (CU): Intimacy, intensity, emotional peak, truth - face fills frame, use sparingly
• EXTREME CLOSE-UP (ECU): Hyper-focus, detail, psychological intensity - single feature only

=== CINEMATOGRAPHY RESEARCH: LIGHTING PSYCHOLOGY ===
• HIGH KEY: Safety, optimism, clarity - comedy, corporate, product beauty
• LOW KEY: Mystery, danger, drama, sophistication - thriller, luxury, villain scenes
• SOFT LIGHT: Gentleness, beauty, romance - flattering, timeless feel
• HARD LIGHT: Intensity, truth, harshness - confrontation, documentary, gritty reality
• WARM (2700-3500K): Comfort, intimacy, nostalgia - home, romance, memory
• COOL (5500-7500K): Technology, cold, isolation, sadness - sci-fi, clinical, loneliness

=== CINEMATOGRAPHY RESEARCH: BEAT STRUCTURE ===
• SETUP BEAT: Establish info needed later - wide shots, keep tight (3-5 sec)
• DEVELOPMENT BEAT: Progress plot/character - medium shots, gradual push-ins (8-15 sec)
• TURNING POINT: Major direction change - quick cut to tight shot for revelation
• CLIMAX BEAT: Peak tension/emotion - tightest shots, most dynamic movement (10-20 sec)
• RESOLUTION BEAT: Return to stability - pull back to wider shots (3-8 sec)

=== YOUR TASK ===
1. ENTITIES (deduplicated):
   - Characters: Find ALL character names, consolidate duplicates ("Nicola b" = "Nicola B")
   - Locations: All settings, literal (London pub) and metaphorical (mountain ridge)
   - Products: Key props and products mentioned

2. NARRATIVES:
   - Detect parallel narratives (literal journey + metaphorical trek)
   - Identify metaphorical vs literal content

3. BEAT BREAKDOWN WITH SHOTS:
   - Break script into logical beats/scenes
   - For EACH beat, create 3-8 SPECIFIC SHOTS with:
     * Shot size based on emotional intensity (wider = context, tighter = emotion)
     * Camera angle based on power dynamics and emotional intent
     * Lighting that supports the mood
     * Duration based on beat type
   - Convert vague directions ("Forrest Gump feather type thing") into specific shot sequences

4. CLARIFICATION QUESTIONS (max 5, truly ambiguous items only)

EXISTING ENTITIES (match against these, don't duplicate):
Characters: ${existingCharacterNames.join(', ') || 'None yet'}
Locations: ${existingLocationNames.join(', ') || 'None yet'}
Products: ${existingProductNames.join(', ') || 'None yet'}

SCRIPT TO ANALYZE:
---
${rawScript}
---

Respond with structured JSON matching the schema. Apply cinematography psychology to every shot decision.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          entities: {
            type: Type.OBJECT,
            properties: {
              characters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
                    type: { type: Type.STRING },
                    importance: { type: Type.STRING },
                    appearances: { type: Type.ARRAY, items: { type: Type.STRING } },
                    inferredDescription: { type: Type.STRING },
                    coverageNeeded: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              },
              locations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
                    type: { type: Type.STRING },
                    importance: { type: Type.STRING },
                    appearances: { type: Type.ARRAY, items: { type: Type.STRING } },
                    inferredDescription: { type: Type.STRING },
                    coverageNeeded: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              },
              products: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    aliases: { type: Type.ARRAY, items: { type: Type.STRING } },
                    type: { type: Type.STRING },
                    importance: { type: Type.STRING },
                    appearances: { type: Type.ARRAY, items: { type: Type.STRING } },
                    inferredDescription: { type: Type.STRING },
                    coverageNeeded: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          },
          narratives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                description: { type: Type.STRING },
                beats: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          beats: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                sequence: { type: Type.NUMBER },
                title: { type: Type.STRING },
                originalText: { type: Type.STRING },
                interpretedAction: { type: Type.STRING },
                duration: { type: Type.NUMBER },
                mood: { type: Type.STRING },
                narrativeId: { type: Type.STRING },
                entityUsage: {
                  type: Type.OBJECT,
                  properties: {
                    characters: { type: Type.ARRAY, items: { type: Type.STRING } },
                    locations: { type: Type.ARRAY, items: { type: Type.STRING } },
                    products: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                },
                shots: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      sequence: { type: Type.NUMBER },
                      description: { type: Type.STRING },
                      shotSize: { type: Type.STRING },
                      cameraAngle: { type: Type.STRING },
                      cameraHeight: { type: Type.STRING },
                      cameraMove: { type: Type.STRING },
                      focalLength: { type: Type.STRING },
                      duration: { type: Type.STRING },
                      composition: {
                        type: Type.OBJECT,
                        properties: {
                          foreground: { type: Type.STRING },
                          midground: { type: Type.STRING },
                          background: { type: Type.STRING },
                          depthOfField: { type: Type.STRING },
                          framing: { type: Type.STRING }
                        }
                      },
                      lighting: {
                        type: Type.OBJECT,
                        properties: {
                          timeOfDay: { type: Type.STRING },
                          quality: { type: Type.STRING },
                          direction: { type: Type.STRING },
                          mood: { type: Type.STRING }
                        }
                      },
                      entities: {
                        type: Type.OBJECT,
                        properties: {
                          characters: { type: Type.ARRAY, items: { type: Type.STRING } },
                          locations: { type: Type.ARRAY, items: { type: Type.STRING } },
                          products: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                      },
                      priority: { type: Type.STRING },
                      transition: { type: Type.STRING },
                      notes: { type: Type.STRING }
                    }
                  }
                },
                productionNotes: {
                  type: Type.OBJECT,
                  properties: {
                    complexity: { type: Type.STRING },
                    estimatedGenerations: { type: Type.NUMBER },
                    dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          },
          clarifications: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING },
                question: { type: Type.STRING },
                context: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING },
                      description: { type: Type.STRING }
                    }
                  }
                },
                freeformAllowed: { type: Type.BOOLEAN },
                required: { type: Type.BOOLEAN },
                relatedEntityIds: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to analyze script');
  }

  const parsed = JSON.parse(text);
  console.log('✅ Script Director: Analysis complete -', parsed.beats?.length || 0, 'beats,', parsed.entities?.characters?.length || 0, 'characters');

  return parsed as Partial<ScriptAnalysis>;
};

/**
 * Generate shot breakdown for a single beat
 * Enhanced with cinematographic research knowledge
 */
export const generateShotBreakdown = async (
  beatDescription: string,
  entityContext: {
    characters: string[];
    locations: string[];
    products: string[];
  },
  style?: ProductionDesign
): Promise<Shot[]> => {
  console.log('🎬 Generating shot breakdown for beat:', beatDescription.substring(0, 50) + '...');
  const ai = await getClient();

  const styleContext = style ? `
PRODUCTION DESIGN CONTEXT:
- Visual Style: ${style.visualStyle || 'Not specified'}
- Color Palette: ${style.colorPalette || 'Not specified'}
- Lighting: ${style.lightingApproach || 'Not specified'}
- Camera Language: ${style.cameraLanguage || 'Not specified'}
` : '';

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a professional Director of Photography with deep knowledge of visual psychology. Break down this beat into specific, technically-precise shots.

=== CINEMATOGRAPHY PSYCHOLOGY GUIDE ===

SHOT SIZE → EMOTIONAL IMPACT:
• EWS (Extreme Wide): Scale, loneliness, epic - subject <10% of frame, hold 4-6 sec
• WS (Wide): Context, action, spatial - full body + environment, hold 3-5 sec
• MWS (Medium Wide): Casual observation, standoff - head to thigh, hold 3-4 sec
• MS (Medium): Conversational, balanced - head to waist, hold 2-4 sec (DEFAULT)
• MCU (Medium Close-Up): Attention, importance - head/shoulders, hold 2-3 sec
• CU (Close-Up): Intimacy, emotion, truth - face fills frame, hold 1-3 sec (USE SPARINGLY)
• ECU (Extreme Close-Up): Hyper-focus, intensity - single feature, hold 0.5-2 sec

CAMERA ANGLE → PSYCHOLOGICAL EFFECT:
• LOW ANGLE: Power, heroism, dominance - character looks larger/stronger
• HIGH ANGLE: Vulnerability, weakness, judgment - character looks smaller/weaker
• EYE LEVEL: Equality, relatability, neutrality - default for conversation
• DUTCH TILT: Unease, instability, something wrong - USE VERY SPARINGLY (1-2 per scene)
• OVERHEAD: Omniscience, pattern, fate - god's-eye detachment

LIGHTING → MOOD:
• HIGH KEY: Bright, safe, optimistic - comedy, corporate, beauty
• LOW KEY: Shadows, mystery, danger - drama, thriller, sophistication
• SOFT: Gentle, romantic, beautiful - flattering, diffused
• HARD: Intense, harsh, truthful - confrontation, documentary
• WARM (orange/yellow): Comfort, intimacy, nostalgia
• COOL (blue): Technology, clinical, isolation, sadness

BEAT STRUCTURE FLOW:
1. ESTABLISH (wide) → 2. DEVELOP (medium) → 3. ESCALATE (tighten) → 4. PEAK (close) → 5. RESOLVE (widen)
As emotional intensity increases, shots should get TIGHTER.

=== YOUR TASK ===

BEAT DESCRIPTION:
${beatDescription}

AVAILABLE ENTITIES:
- Characters: ${entityContext.characters.join(', ') || 'None specified'}
- Locations: ${entityContext.locations.join(', ') || 'None specified'}
- Products: ${entityContext.products.join(', ') || 'None specified'}
${styleContext}

Create 4-8 specific shots that:
1. Progress logically through the beat (establish → develop → peak → resolve)
2. Use shot size to control emotional distance
3. Use camera angle to convey power dynamics
4. Use lighting to support mood
5. Include proper hold durations based on shot type

For each shot specify:
1. Shot size (ECU, CU, MCU, MS, MWS, WS, EWS) - with psychological reasoning
2. Camera angle - based on power/emotion intent
3. Camera movement (static, dolly-in, dolly-out, pan, tracking, crane, orbit, handheld)
4. Focal length (24mm wide, 35mm standard, 50mm normal, 85mm portrait, 135mm telephoto)
5. Composition (foreground, midground, background, depth of field, framing)
6. Lighting (time of day, quality, direction, mood)
7. Duration (in seconds, based on shot type guidelines)
8. Which entities appear in the shot
9. Director notes explaining the visual psychology choice

Respond with a JSON array of shots.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            sequence: { type: Type.NUMBER },
            description: { type: Type.STRING },
            shotSize: { type: Type.STRING },
            cameraAngle: { type: Type.STRING },
            cameraHeight: { type: Type.STRING },
            cameraMove: { type: Type.STRING },
            focalLength: { type: Type.STRING },
            duration: { type: Type.STRING },
            composition: {
              type: Type.OBJECT,
              properties: {
                foreground: { type: Type.STRING },
                midground: { type: Type.STRING },
                background: { type: Type.STRING },
                depthOfField: { type: Type.STRING },
                framing: { type: Type.STRING }
              }
            },
            lighting: {
              type: Type.OBJECT,
              properties: {
                timeOfDay: { type: Type.STRING },
                quality: { type: Type.STRING },
                direction: { type: Type.STRING },
                mood: { type: Type.STRING }
              }
            },
            entities: {
              type: Type.OBJECT,
              properties: {
                characters: { type: Type.ARRAY, items: { type: Type.STRING } },
                locations: { type: Type.ARRAY, items: { type: Type.STRING } },
                products: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            priority: { type: Type.STRING },
            transition: { type: Type.STRING },
            notes: { type: Type.STRING }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to generate shot breakdown');
  }

  const shots = JSON.parse(text) as Shot[];
  console.log('✅ Generated', shots.length, 'shots for beat');

  return shots;
};

/**
 * Interpret vague creative direction into specific shots
 * e.g., "Forrest Gump feather type thing" → specific tracking shot sequence
 * Enhanced with cinematographic psychology and style reference knowledge
 */
export const interpretVagueDirection = async (
  vagueInput: string,
  context?: {
    entityNames?: string[];
    mood?: string;
    style?: ProductionDesign;
  }
): Promise<CreativeInterpretation> => {
  console.log('🎬 Interpreting creative direction:', vagueInput);
  const ai = await getClient();

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a professional Director of Photography with encyclopedic knowledge of cinema history and visual psychology. Your specialty is translating vague creative directions into specific, technically-precise shot sequences.

=== STYLE REFERENCE KNOWLEDGE ===

CINEMATIC LOOKS:
• "Film grain, 35mm" → Organic, classic cinema feel
• "Anamorphic lens flares" → Sci-fi, epic, premium
• "Shallow depth of field" → Intimate, professional
• "High contrast, desaturated" → Gritty, dramatic
• "Soft, diffused lighting" → Romantic, beauty

PERIOD/GENRE LOOKS:
• "1970s film stock" → Warm, grainy, nostalgic
• "Noir lighting" → High contrast, shadows, mystery
• "Wes Anderson symmetry" → Centered, pastel, precise
• "Blade Runner aesthetic" → Neon, rain, cyberpunk
• "Spielbergian warmth" → Golden hour, lens flares, wonder

COMMON VAGUE DIRECTION TRANSLATIONS:
• "Forrest Gump feather" → Magical realism, tracking shots, floating object, wonder
• "Tarantino dialogue" → Low angles, static wides, tension through stillness
• "Music video energy" → Fast cuts, dutch angles, dynamic movement
• "Documentary feel" → Handheld, available light, imperfect framing
• "Dreamy/ethereal" → Soft focus, backlighting, slow motion, desaturated

=== SHOT PSYCHOLOGY GUIDE ===

As you build the shot sequence, apply these principles:
• Wider shots = establishing context, emotional distance
• Tighter shots = intimacy, emotional intensity
• Low angles = power, heroism
• High angles = vulnerability, weakness
• Slow movement = contemplation, significance
• Fast movement = energy, urgency, chaos

=== YOUR TASK ===

The director has given this vague direction:
"${vagueInput}"

Context:
- Entities involved: ${context?.entityNames?.join(', ') || 'Not specified'}
- Mood: ${context?.mood || 'Not specified'}
- Style: ${context?.style?.visualStyle || 'Not specified'}

Your job:
1. INTERPRET what the director actually wants:
   - What film/visual reference are they evoking?
   - What emotional effect do they want?
   - What specific visual language achieves this?

2. CREATE a specific shot sequence (3-6 shots) that achieves this creative vision:
   - Start wide to establish, then progressively tighten or vary for interest
   - Use camera angle to support the emotional intent
   - Include specific technical details (lens, movement, lighting)

3. PROVIDE technical notes on how to achieve the look:
   - Lighting setup
   - Color temperature
   - Lens choice
   - Camera movement style

4. SUGGEST a reference style for AI generation:
   - Use established style descriptors that AI understands
   - Include film grain, color treatment, lighting mood

Respond with JSON matching the schema.`
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originalInput: { type: Type.STRING },
          interpretation: { type: Type.STRING },
          technicalNotes: { type: Type.STRING },
          referenceStyle: { type: Type.STRING },
          mood: { type: Type.STRING },
          estimatedDuration: { type: Type.NUMBER },
          shotSequence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                sequence: { type: Type.NUMBER },
                description: { type: Type.STRING },
                shotSize: { type: Type.STRING },
                cameraAngle: { type: Type.STRING },
                cameraMove: { type: Type.STRING },
                duration: { type: Type.STRING },
                notes: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Failed to interpret creative direction');
  }

  const interpretation = JSON.parse(text) as CreativeInterpretation;
  console.log('✅ Interpreted as:', interpretation.interpretation?.substring(0, 50) + '...');

  return interpretation;
};
