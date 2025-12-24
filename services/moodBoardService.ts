/**
 * Mood Board Service
 * Handles AI analysis of mood board images and style DNA extraction
 */

import { ImageAnalysis, StyleDNA, MoodBoardImage } from '../types';
import { generateThumbnail } from './imageUtils';

// Get Gemini client - reuse the cached client pattern from gemini.ts
let cachedApiKey: string | null = null;

const getApiKey = (): string => {
    if (cachedApiKey) return cachedApiKey;
    cachedApiKey = (import.meta as unknown as { env: { VITE_GEMINI_API_KEY?: string } }).env.VITE_GEMINI_API_KEY || '';
    return cachedApiKey;
};

/**
 * Analyze a single image to extract visual characteristics
 */
export const analyzeImage = async (imageBase64: string): Promise<ImageAnalysis> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const prompt = `Analyze this image and provide a structured JSON response with the following fields:
- dominantColors: array of 3-5 hex color codes representing the main colors (e.g., ["#2a1f3d", "#ff6b9d"])
- lightingStyle: string describing the lighting (e.g., "High contrast neon with deep shadows")
- composition: string describing the composition (e.g., "Central subject, rule of thirds")
- mood: string describing the emotional mood (e.g., "Mysterious, edgy, contemplative")
- styleKeywords: array of 5-8 style descriptors (e.g., ["cyberpunk", "noir", "cinematic"])

Return ONLY valid JSON, no markdown or explanation.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: base64Data
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            dominantColors: parsed.dominantColors || ['#333333'],
            lightingStyle: parsed.lightingStyle || 'Natural lighting',
            composition: parsed.composition || 'Standard composition',
            mood: parsed.mood || 'Neutral',
            styleKeywords: parsed.styleKeywords || ['generic'],
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Image analysis failed:', error);
        // Return defaults on error
        return {
            dominantColors: ['#333333', '#666666', '#999999'],
            lightingStyle: 'Unable to analyze',
            composition: 'Unable to analyze',
            mood: 'Unable to analyze',
            styleKeywords: ['unanalyzed'],
            timestamp: Date.now()
        };
    }
};

/**
 * Extract Style DNA from multiple mood board images
 * This synthesizes the common visual language across all images
 */
export const extractStyleDNA = async (images: MoodBoardImage[]): Promise<StyleDNA> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    if (images.length < 2) {
        throw new Error('Need at least 2 images to extract Style DNA');
    }

    // Use thumbnails for API efficiency, limit to 6 images
    const imagesToAnalyze = images.slice(0, 6);

    // First, ensure we have analysis for each image
    const analysisResults: ImageAnalysis[] = [];
    for (const img of imagesToAnalyze) {
        if (img.aiAnalysis) {
            analysisResults.push(img.aiAnalysis);
        } else {
            const analysis = await analyzeImage(img.thumbnail || img.url);
            analysisResults.push(analysis);
        }
    }

    // Now synthesize the Style DNA
    const synthesisPrompt = `You are a visual style analyst. Given the following individual image analyses, synthesize a cohesive "Style DNA" that captures the common visual language across all images.

Individual Image Analyses:
${analysisResults.map((a, i) => `
Image ${i + 1}:
- Colors: ${a.dominantColors.join(', ')}
- Lighting: ${a.lightingStyle}
- Composition: ${a.composition}
- Mood: ${a.mood}
- Keywords: ${a.styleKeywords.join(', ')}
`).join('\n')}

Create a JSON response with:
- colorPalette: array of 5-6 hex colors that represent the unified color scheme (merge similar colors, keep distinctive ones)
- lightingCharacteristics: single string synthesizing the common lighting approach
- compositionPatterns: array of 2-3 composition rules commonly used
- moodKeywords: array of 5-7 mood descriptors that capture the overall feeling
- photographicStyle: single string describing the overall photographic style (e.g., "Cinematic noir", "Editorial fashion", "Documentary realism")
- promptSnippet: a concise 2-3 sentence prompt injection that can be prepended to image generation prompts to achieve this style. Write it as direct style instructions, not as a description.

Return ONLY valid JSON, no markdown or explanation.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: synthesisPrompt }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            colorPalette: parsed.colorPalette || ['#333333'],
            lightingCharacteristics: parsed.lightingCharacteristics || 'Mixed lighting',
            compositionPatterns: parsed.compositionPatterns || ['Standard framing'],
            moodKeywords: parsed.moodKeywords || ['varied'],
            photographicStyle: parsed.photographicStyle || 'Mixed style',
            promptSnippet: parsed.promptSnippet || 'Professional photography with attention to lighting and composition.',
            generatedAt: Date.now()
        };
    } catch (error) {
        console.error('Style DNA extraction failed:', error);

        // Create fallback from individual analyses
        const allColors = analysisResults.flatMap(a => a.dominantColors);
        const allKeywords = analysisResults.flatMap(a => a.styleKeywords);
        const uniqueColors = [...new Set(allColors)].slice(0, 6);
        const uniqueKeywords = [...new Set(allKeywords)].slice(0, 7);

        return {
            colorPalette: uniqueColors,
            lightingCharacteristics: analysisResults[0]?.lightingStyle || 'Natural lighting',
            compositionPatterns: ['Standard composition'],
            moodKeywords: uniqueKeywords,
            photographicStyle: 'Mixed style',
            promptSnippet: `Style emphasizing ${uniqueKeywords.slice(0, 3).join(', ')} aesthetic with ${analysisResults[0]?.lightingStyle || 'balanced lighting'}.`,
            generatedAt: Date.now()
        };
    }
};

/**
 * Generate thumbnail for mood board image if needed
 */
export const ensureThumbnail = async (imageUrl: string): Promise<string> => {
    try {
        return await generateThumbnail(imageUrl, 300, 0.7);
    } catch {
        return imageUrl; // Return original if thumbnail fails
    }
};

/**
 * Build a style-injected prompt by combining base prompt with Style DNA
 */
export const injectStyleDNA = (basePrompt: string, styleDNA: StyleDNA): string => {
    // Prepend the style snippet
    const styledPrompt = `${styleDNA.promptSnippet}\n\n${basePrompt}`;

    // Add color guidance if the prompt doesn't already mention colors
    const hasColorMention = /color|palette|hue|tone/i.test(basePrompt);
    if (!hasColorMention && styleDNA.colorPalette.length > 0) {
        const colorHint = `Color palette: ${styleDNA.colorPalette.slice(0, 3).join(', ')}.`;
        return `${styledPrompt}\n${colorHint}`;
    }

    return styledPrompt;
};
