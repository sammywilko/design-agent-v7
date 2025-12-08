
import { GoogleGenAI, Type, Schema, Part } from "@google/genai";
import { DirectorResponse, GeneratedImage, GenerationConfig, ReferenceAsset, GeneratedVideo, Beat, CharacterProfile, CoverageAnalysis, Lookbook, ToolMode, ReferenceBundle, QualityScore, MoodBoard, LocationProfile, ProductProfile, VariantType, ProductionDesign } from "../types";

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

User Custom Instructions: {{CUSTOM_INSTRUCTIONS}}

Output Structure:
1. Analysis of the Request & References.
2. {{IMAGE_COUNT}} Distinct Concept Directions.
3. Technical Composition Notes (Lighting, Lens, Aspect Ratio).

You must return a JSON object:
- "analysis": Markdown string.
- "imagePrompts": Array of strings.
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

  if (references.length > 0) {
    promptContext += "\n\nATTACHED REFERENCES:";
    references.forEach((ref, index) => {
      let desc = `[Reference ${index + 1}]: Type=${ref.type} (${ref.name || 'Unnamed'})`;
      if (ref.type === 'Style' && ref.styleDescription) {
        desc += `\n   >> STYLE DNA TO APPLY: "${ref.styleDescription}"`;
      }
      promptContext += `\n${desc}`;
    });
    
    parts.push({ text: promptContext });

    references.forEach((ref) => {
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

  const response = await ai.models.generateContent({
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
  });

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

  if (references.length > 0) {
      explicitPrompt += "\n\nREFERENCES:";
      references.forEach((ref, idx) => {
        explicitPrompt += `\n- Ref ${idx + 1} (${ref.type}): ${ref.name || 'Image'}`;
        if (ref.type === 'Style' && ref.styleDescription) {
            explicitPrompt += ` (Style DNA: ${ref.styleDescription})`;
        }
      });
      explicitPrompt += "\nUse these references strictly.";
  }
  
  parts.push({ text: explicitPrompt });

  if (references.length > 0) {
      references.forEach((ref) => {
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
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: parts
    },
    config: requestConfig
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
    const model = 'gemini-2.5-flash'; // Vision capable, fast

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
    const model = 'gemini-2.5-flash-preview-05-20'; // Nano Banana Pro for image gen

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
    const model = 'gemini-2.5-flash-preview-05-20'; // Nano Banana Pro

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
    const model = 'gemini-2.5-flash'; // Vision capable, fast

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
