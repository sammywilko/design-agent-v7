/**
 * Script Director Service
 *
 * Transforms messy scripts into shot-level generation instructions.
 *
 * Three-layer system:
 * 1. CHAOS PARSER - Entity extraction & deduplication
 * 2. SHOT BREAKDOWN ENGINE - Beat → specific shots with camera specs
 * 3. SCENE COMPOSITOR - Builds generation-ready prompts with entity refs
 */

import {
    ScriptAnalysis,
    ExtractedEntity,
    AnalyzedBeat,
    ClarificationQuestion,
    CreativeInterpretation,
    Shot,
    CharacterProfile,
    LocationProfile,
    ProductProfile,
    ProductionDesign,
    StyleDNA
} from '../types';

// ============================================
// LAYER 1: CHAOS PARSER
// ============================================

/**
 * Parse a messy script and extract structured data
 */
export async function analyzeMessyScript(
    rawScript: string,
    existingBibles?: {
        characters: CharacterProfile[];
        locations: LocationProfile[];
        products: ProductProfile[];
    }
): Promise<ScriptAnalysis> {
    // Import Gemini for AI-powered analysis
    const { analyzeScriptWithDirector } = await import('./gemini');

    // Get AI analysis of the script
    const aiAnalysis = await analyzeScriptWithDirector(rawScript, existingBibles);

    // Match extracted entities against existing Bible entries
    const matchedAnalysis = matchEntitiesToBibles(aiAnalysis, existingBibles);

    // Calculate production estimates
    const production = calculateProductionEstimates(matchedAnalysis);

    return {
        ...matchedAnalysis,
        production
    };
}

/**
 * Match extracted entities to existing Bible entries
 */
function matchEntitiesToBibles(
    analysis: Partial<ScriptAnalysis>,
    existingBibles?: {
        characters: CharacterProfile[];
        locations: LocationProfile[];
        products: ProductProfile[];
    }
): ScriptAnalysis {
    if (!existingBibles || !analysis.entities) {
        return analysis as ScriptAnalysis;
    }

    // Match characters by name similarity
    const matchedCharacters = analysis.entities.characters.map(extracted => {
        const match = existingBibles.characters.find(
            c => c.name.toLowerCase() === extracted.name.toLowerCase() ||
                 extracted.aliases.some(alias =>
                     alias.toLowerCase() === c.name.toLowerCase()
                 )
        );
        return {
            ...extracted,
            existingBibleMatch: match?.id
        };
    });

    // Match locations
    const matchedLocations = analysis.entities.locations.map(extracted => {
        const match = existingBibles.locations.find(
            l => l.name?.toLowerCase() === extracted.name.toLowerCase()
        );
        return {
            ...extracted,
            existingBibleMatch: match?.id
        };
    });

    // Match products
    const matchedProducts = analysis.entities.products.map(extracted => {
        const match = existingBibles.products.find(
            p => p.name.toLowerCase() === extracted.name.toLowerCase()
        );
        return {
            ...extracted,
            existingBibleMatch: match?.id
        };
    });

    return {
        ...analysis,
        entities: {
            characters: matchedCharacters,
            locations: matchedLocations,
            products: matchedProducts
        }
    } as ScriptAnalysis;
}

/**
 * Calculate production time and cost estimates
 */
function calculateProductionEstimates(analysis: Partial<ScriptAnalysis>): ScriptAnalysis['production'] {
    const beats = analysis.beats || [];
    const entities = analysis.entities || { characters: [], locations: [], products: [] };

    // Count total shots
    const totalShots = beats.reduce((sum, beat) => sum + (beat.shots?.length || 0), 0);

    // Calculate total duration
    const totalDuration = beats.reduce((sum, beat) => sum + (beat.duration || 0), 0);

    // Estimate cost ($0.03 per generation)
    const assetGenerations =
        entities.characters.filter(c => !c.existingBibleMatch).length * 4 + // 4 shots per new character
        entities.locations.filter(l => !l.existingBibleMatch).length * 3 +  // 3 shots per new location
        entities.products.filter(p => !p.existingBibleMatch).length * 2;    // 2 shots per new product

    const estimatedCost = (totalShots + assetGenerations) * 0.03;

    // Identify critical assets (appear in most beats)
    const entityAppearances = new Map<string, number>();
    beats.forEach(beat => {
        [...(beat.entityUsage?.characters || []),
         ...(beat.entityUsage?.locations || []),
         ...(beat.entityUsage?.products || [])
        ].forEach(name => {
            entityAppearances.set(name, (entityAppearances.get(name) || 0) + 1);
        });
    });

    const criticalAssets = Array.from(entityAppearances.entries())
        .filter(([_, count]) => count >= beats.length * 0.3) // Appears in 30%+ of beats
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);

    // Build dependency map
    const assetDependencies: Record<string, string[]> = {};
    beats.forEach(beat => {
        beat.shots?.forEach(shot => {
            const shotKey = `${beat.title} - Shot ${shot.sequence || 1}`;
            assetDependencies[shotKey] = [
                ...(shot.entities?.characters || []),
                ...(shot.entities?.locations || []),
                ...(shot.entities?.products || [])
            ];
        });
    });

    return {
        estimatedShots: totalShots,
        estimatedDuration: totalDuration,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        criticalAssets,
        assetDependencies
    };
}

// ============================================
// LAYER 2: SHOT BREAKDOWN ENGINE
// ============================================

/**
 * Break down a single beat into specific shots
 */
export async function breakdownBeatToShots(
    beatDescription: string,
    entityContext: {
        characters: string[];
        locations: string[];
        products: string[];
    },
    style?: ProductionDesign
): Promise<Shot[]> {
    const { generateShotBreakdown } = await import('./gemini');
    return generateShotBreakdown(beatDescription, entityContext, style);
}

/**
 * Interpret vague creative direction into specific shots
 * e.g., "Forrest Gump feather type thing" → 4 specific tracking shots
 */
export async function interpretCreativeDirection(
    vagueInput: string,
    context?: {
        entityNames?: string[];
        mood?: string;
        style?: ProductionDesign;
    }
): Promise<CreativeInterpretation> {
    const { interpretVagueDirection } = await import('./gemini');
    return interpretVagueDirection(vagueInput, context);
}

// ============================================
// LAYER 3: SCENE COMPOSITOR
// ============================================

/**
 * Build a generation-ready prompt for a specific shot
 * Combines technical specs + entity DNA + style DNA
 */
export function buildShotPrompt(
    shot: Shot,
    characterRefs: CharacterProfile[],
    locationRefs: LocationProfile[],
    productRefs: ProductProfile[],
    style?: ProductionDesign,
    styleDNA?: StyleDNA
): string {
    const parts: string[] = [];

    // 1. Style DNA (highest priority)
    if (styleDNA) {
        parts.push(`=== VISUAL STYLE ===`);
        parts.push(`STYLE: ${styleDNA.promptSnippet}`);
        if (styleDNA.colorPalette?.length) {
            parts.push(`COLOR PALETTE: ${styleDNA.colorPalette.join(', ')}`);
        }
        parts.push(`LIGHTING: ${styleDNA.lightingCharacteristics}`);
        parts.push(`PHOTOGRAPHY: ${styleDNA.photographicStyle}`);
        parts.push('');
    }

    // 2. Production Design
    if (style) {
        parts.push(`=== PRODUCTION DESIGN ===`);
        if (style.visualStyle) parts.push(`VISUAL APPROACH: ${style.visualStyle}`);
        if (style.colorPalette) parts.push(`PALETTE: ${style.colorPalette}`);
        if (style.lightingApproach) parts.push(`LIGHTING DIRECTION: ${style.lightingApproach}`);
        if (style.cameraLanguage) parts.push(`CAMERA LANGUAGE: ${style.cameraLanguage}`);
        parts.push('');
    }

    // 3. Technical Shot Specs
    parts.push(`=== SHOT SPECIFICATIONS ===`);
    parts.push(`SHOT TYPE: ${shot.shotSize || 'MS'} (${getShotSizeName(shot.shotSize || 'MS')})`);
    if (shot.cameraAngle) parts.push(`CAMERA ANGLE: ${shot.cameraAngle}`);
    if (shot.cameraHeight) parts.push(`CAMERA HEIGHT: ${shot.cameraHeight}`);
    if (shot.cameraMove) parts.push(`CAMERA MOVEMENT: ${shot.cameraMove}`);
    if (shot.focalLength) parts.push(`LENS: ${shot.focalLength}`);
    if (shot.duration) parts.push(`DURATION: ${shot.duration}`);
    parts.push('');

    // 4. Composition
    if (shot.composition) {
        parts.push(`=== COMPOSITION ===`);
        if (shot.composition.foreground) parts.push(`FOREGROUND: ${shot.composition.foreground}`);
        if (shot.composition.midground) parts.push(`MIDGROUND: ${shot.composition.midground}`);
        if (shot.composition.background) parts.push(`BACKGROUND: ${shot.composition.background}`);
        if (shot.composition.depthOfField) parts.push(`DEPTH OF FIELD: ${shot.composition.depthOfField}`);
        if (shot.composition.framing) parts.push(`FRAMING: ${shot.composition.framing}`);
        parts.push('');
    }

    // 5. Lighting
    if (shot.lighting) {
        parts.push(`=== LIGHTING ===`);
        if (shot.lighting.timeOfDay) parts.push(`TIME: ${shot.lighting.timeOfDay}`);
        if (shot.lighting.quality) parts.push(`QUALITY: ${shot.lighting.quality}`);
        if (shot.lighting.direction) parts.push(`DIRECTION: ${shot.lighting.direction}`);
        if (shot.lighting.mood) parts.push(`MOOD: ${shot.lighting.mood}`);
        if (shot.lighting.practicals?.length) {
            parts.push(`PRACTICALS: ${shot.lighting.practicals.join(', ')}`);
        }
        parts.push('');
    }

    // 6. Character Injection (by name match)
    const relevantCharacters = characterRefs.filter(c =>
        shot.entities?.characters?.includes(c.name)
    );
    if (relevantCharacters.length > 0) {
        parts.push(`=== CHARACTERS ===`);
        relevantCharacters.forEach(char => {
            parts.push(`CHARACTER [${char.name}]: ${char.promptSnippet || char.description}`);
            if (char.consistencyAnchors) {
                parts.push(`  ANCHORS: ${char.consistencyAnchors}`);
            }
        });
        parts.push('');
    }

    // 7. Location Injection
    const relevantLocations = locationRefs.filter(l =>
        shot.entities?.locations?.includes(l.name || '')
    );
    if (relevantLocations.length > 0) {
        parts.push(`=== LOCATION ===`);
        relevantLocations.forEach(loc => {
            parts.push(`LOCATION [${loc.name}]: ${loc.promptSnippet || loc.description}`);
            if (loc.timeOfDay) parts.push(`  TIME: ${loc.timeOfDay}`);
            if (loc.weather) parts.push(`  WEATHER: ${loc.weather}`);
            if (loc.lightingNotes) parts.push(`  LIGHTING: ${loc.lightingNotes}`);
        });
        parts.push('');
    }

    // 8. Product Injection
    const relevantProducts = productRefs.filter(p =>
        shot.entities?.products?.includes(p.name)
    );
    if (relevantProducts.length > 0) {
        parts.push(`=== PRODUCTS ===`);
        relevantProducts.forEach(prod => {
            parts.push(`PRODUCT [${prod.name}]: ${prod.promptSnippet || prod.description}`);
            if (prod.materialNotes) parts.push(`  MATERIALS: ${prod.materialNotes}`);
        });
        parts.push('');
    }

    // 9. Action Description
    parts.push(`=== ACTION ===`);
    parts.push(shot.description);
    parts.push('');

    // 10. Director Notes
    if (shot.notes) {
        parts.push(`=== DIRECTOR NOTES ===`);
        parts.push(shot.notes);
        parts.push('');
    }

    return parts.join('\n');
}

/**
 * Get human-readable shot size name
 */
function getShotSizeName(size: string): string {
    const names: Record<string, string> = {
        'ECU': 'Extreme Close-Up',
        'CU': 'Close-Up',
        'MCU': 'Medium Close-Up',
        'MS': 'Medium Shot',
        'MWS': 'Medium Wide Shot',
        'WS': 'Wide Shot',
        'EWS': 'Extreme Wide Shot'
    };
    return names[size] || size;
}

/**
 * Collect reference images for a shot
 */
export function collectShotReferences(
    shot: Shot,
    characterRefs: CharacterProfile[],
    locationRefs: LocationProfile[],
    productRefs: ProductProfile[]
): { id: string; data: string; type: string; name: string }[] {
    const refs: { id: string; data: string; type: string; name: string }[] = [];

    // Get character references - smart selection based on shot size
    const relevantCharacters = characterRefs.filter(c =>
        shot.entities?.characters?.includes(c.name)
    );

    relevantCharacters.forEach(char => {
        // Select best reference based on shot type
        const bestRef = selectBestCharacterRef(char, shot.shotSize || 'MS');
        if (bestRef) {
            refs.push({
                id: `char-${char.id}`,
                data: bestRef,
                type: 'Character',
                name: char.name
            });
        }
    });

    // Get location references - prefer anchor image
    const relevantLocations = locationRefs.filter(l =>
        shot.entities?.locations?.includes(l.name || '')
    );

    relevantLocations.forEach(loc => {
        if (loc.anchorImage) {
            refs.push({
                id: `loc-${loc.id}-anchor`,
                data: loc.anchorImage,
                type: 'Location',
                name: loc.name || 'Location'
            });
        } else if (loc.imageRefs?.[0]) {
            refs.push({
                id: `loc-${loc.id}`,
                data: loc.imageRefs[0],
                type: 'Location',
                name: loc.name || 'Location'
            });
        }
    });

    // Get product references
    const relevantProducts = productRefs.filter(p =>
        shot.entities?.products?.includes(p.name)
    );

    relevantProducts.forEach(prod => {
        if (prod.imageRefs?.[0]) {
            refs.push({
                id: `prod-${prod.id}`,
                data: prod.imageRefs[0],
                type: 'Product',
                name: prod.name
            });
        }
    });

    return refs;
}

/**
 * Select best character reference based on shot size
 */
function selectBestCharacterRef(character: CharacterProfile, shotSize: string): string | null {
    // Use RefCoverage if available
    if (character.refCoverage) {
        switch (shotSize) {
            case 'ECU':
            case 'CU':
                if (character.refCoverage.face?.[0]) return character.refCoverage.face[0];
                break;
            case 'MCU':
            case 'MS':
                if (character.refCoverage.threeQuarter?.[0]) return character.refCoverage.threeQuarter[0];
                break;
            case 'MWS':
            case 'WS':
            case 'EWS':
                if (character.refCoverage.fullBody?.[0]) return character.refCoverage.fullBody[0];
                if (character.refCoverage.action?.[0]) return character.refCoverage.action[0];
                break;
        }
    }

    // Fallback to character sheet or first imageRef
    if (character.characterSheet) return character.characterSheet;
    if (character.imageRefs?.[0]) return character.imageRefs[0];

    return null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert ScriptAnalysis beats to standard Beat format for storage
 */
export function convertAnalyzedBeatsToBeats(analyzedBeats: AnalyzedBeat[]): import('../types').Beat[] {
    return analyzedBeats.map(ab => ({
        id: ab.id,
        visualSummary: ab.interpretedAction,
        shotType: ab.shots[0]?.shotSize || 'MS',
        duration: `${ab.duration}s`,
        mood: ab.mood,
        characters: ab.entityUsage.characters,
        locations: ab.entityUsage.locations,
        products: ab.entityUsage.products,
        status: 'scripted' as const,
        shots: ab.shots
    }));
}

/**
 * Convert ExtractedEntity to CharacterProfile
 */
export function convertExtractedToCharacterProfile(entity: ExtractedEntity): Partial<CharacterProfile> {
    return {
        id: entity.id,
        name: entity.name,
        description: entity.inferredDescription,
        promptSnippet: entity.inferredDescription
    };
}

/**
 * Convert ExtractedEntity to LocationProfile
 */
export function convertExtractedToLocationProfile(entity: ExtractedEntity): Partial<LocationProfile> {
    return {
        id: entity.id,
        name: entity.name,
        description: entity.inferredDescription,
        promptSnippet: entity.inferredDescription
    };
}

/**
 * Convert ExtractedEntity to ProductProfile
 */
export function convertExtractedToProductProfile(entity: ExtractedEntity): Partial<ProductProfile> {
    return {
        id: entity.id,
        name: entity.name,
        description: entity.inferredDescription,
        promptSnippet: entity.inferredDescription
    };
}
