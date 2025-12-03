/**
 * Producer Agent - Agentic AI that can execute creative decisions
 * Uses Gemini function calling to directly modify project state
 */

import { Beat, CharacterProfile, LocationProfile, ProductProfile, MoodBoard, ScriptData, GeneratedImage } from '../types';

// ============================================
// TOOL DEFINITIONS
// ============================================

export const PRODUCER_TOOLS = [
    {
        name: 'addBeat',
        description: 'Add a new beat to the script at a specific position',
        parameters: {
            type: 'object',
            properties: {
                position: {
                    type: 'number',
                    description: 'Index where to insert the beat (0 = start, -1 = end)'
                },
                visualSummary: {
                    type: 'string',
                    description: 'Description of what happens visually in this beat'
                },
                characters: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Character names appearing in this beat'
                },
                locations: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Locations where this beat takes place'
                },
                products: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Products featured in this beat'
                },
                shotType: {
                    type: 'string',
                    description: 'Camera shot type (e.g., WIDE, MED, CLOSE, ECU)'
                },
                mood: {
                    type: 'string',
                    description: 'Emotional mood of the beat'
                },
                duration: {
                    type: 'string',
                    description: 'Duration in seconds (e.g., "3s")'
                }
            },
            required: ['position', 'visualSummary']
        }
    },
    {
        name: 'modifyBeat',
        description: 'Update an existing beat by its ID or position number',
        parameters: {
            type: 'object',
            properties: {
                beatIdentifier: {
                    type: 'string',
                    description: 'Beat ID or position number (e.g., "5" for 5th beat)'
                },
                updates: {
                    type: 'object',
                    properties: {
                        visualSummary: { type: 'string' },
                        characters: { type: 'array', items: { type: 'string' } },
                        locations: { type: 'array', items: { type: 'string' } },
                        products: { type: 'array', items: { type: 'string' } },
                        shotType: { type: 'string' },
                        mood: { type: 'string' },
                        duration: { type: 'string' }
                    },
                    description: 'Fields to update'
                }
            },
            required: ['beatIdentifier', 'updates']
        }
    },
    {
        name: 'deleteBeats',
        description: 'Remove one or more beats from the script',
        parameters: {
            type: 'object',
            properties: {
                beatIdentifiers: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Beat IDs or position numbers to delete'
                }
            },
            required: ['beatIdentifiers']
        }
    },
    {
        name: 'reorderBeats',
        description: 'Move beats to new positions',
        parameters: {
            type: 'object',
            properties: {
                moves: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            from: { type: 'number', description: 'Current position (1-indexed)' },
                            to: { type: 'number', description: 'New position (1-indexed)' }
                        }
                    },
                    description: 'Array of moves to make'
                }
            },
            required: ['moves']
        }
    },
    {
        name: 'generateBeatImages',
        description: 'Generate images for one or more beats',
        parameters: {
            type: 'object',
            properties: {
                beatIdentifiers: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Beat IDs or position numbers to generate images for'
                },
                moodBoardName: {
                    type: 'string',
                    description: 'Optional mood board name to apply style from'
                },
                generateSequence: {
                    type: 'boolean',
                    description: 'If true, generate 2x2 sequence grid instead of single image'
                }
            },
            required: ['beatIdentifiers']
        }
    },
    {
        name: 'addCharacter',
        description: 'Add a new character to the project',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Character name' },
                description: { type: 'string', description: 'Character description for image generation' },
                promptSnippet: { type: 'string', description: 'Optimized prompt snippet for consistency' },
                consistencyAnchors: { type: 'string', description: 'Comma-separated list of distinguishing features' }
            },
            required: ['name', 'description']
        }
    },
    {
        name: 'addLocation',
        description: 'Add a new location to the project',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Location name' },
                description: { type: 'string', description: 'Location description' },
                timeOfDay: { type: 'string', description: 'Time of day (e.g., "Golden Hour", "Night")' },
                weather: { type: 'string', description: 'Weather conditions' },
                lightingNotes: { type: 'string', description: 'Lighting characteristics' }
            },
            required: ['name', 'description']
        }
    },
    {
        name: 'addProduct',
        description: 'Add a new product to the project',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Product name' },
                description: { type: 'string', description: 'Product description' },
                category: { type: 'string', description: 'Product category (Footwear, Apparel, etc.)' },
                materialNotes: { type: 'string', description: 'Material details' },
                brandGuidelines: { type: 'string', description: 'Brand requirements' }
            },
            required: ['name', 'description']
        }
    },
    {
        name: 'createMoodBoard',
        description: 'Create a new mood board for style reference',
        parameters: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Mood board name' },
                purpose: {
                    type: 'string',
                    enum: ['character-style', 'location-vibe', 'lighting-ref', 'overall-aesthetic', 'product-style'],
                    description: 'Purpose of this mood board'
                }
            },
            required: ['name', 'purpose']
        }
    },
    {
        name: 'updateProductionDesign',
        description: 'Update the global production design settings',
        parameters: {
            type: 'object',
            properties: {
                visualStyle: { type: 'string', description: 'Overall visual style (e.g., "Cyberpunk Noir")' },
                colorPalette: { type: 'string', description: 'Color palette description' },
                cameraLanguage: { type: 'string', description: 'Camera language (e.g., "Handheld, Anamorphic")' },
                lightingApproach: { type: 'string', description: 'Lighting style' }
            }
        }
    },
    {
        name: 'getProjectState',
        description: 'Get current state of the project including beats, characters, locations, products, mood boards',
        parameters: {
            type: 'object',
            properties: {
                includeFullDetails: {
                    type: 'boolean',
                    description: 'If true, include full details; if false, just summary counts'
                }
            }
        }
    },
    {
        name: 'suggestBeats',
        description: 'Suggest new beats without adding them - for brainstorming',
        parameters: {
            type: 'object',
            properties: {
                context: { type: 'string', description: 'What kind of beats to suggest' },
                count: { type: 'number', description: 'Number of suggestions' }
            },
            required: ['context', 'count']
        }
    }
];

// ============================================
// APP CONTEXT TYPE
// ============================================

export interface ProducerAppContext {
    // State
    scriptData: ScriptData | undefined;
    moodBoards: MoodBoard[];
    globalHistory: GeneratedImage[];

    // Setters
    setScriptData: (data: ScriptData) => void;

    // Actions
    onGenerateBeat: (beat: Beat, characters: CharacterProfile[], locations: LocationProfile[], products: ProductProfile[]) => void;
    onGenerateSequence: (beat: Beat, characters: CharacterProfile[], locations: LocationProfile[], products: ProductProfile[]) => void;
    onCreateMoodBoard: (name: string, purpose: MoodBoard['purpose']) => void;

    // Notifications
    showNotification: (msg: string) => void;
}

// ============================================
// TOOL EXECUTOR
// ============================================

export interface ToolResult {
    success: boolean;
    message: string;
    data?: any;
    needsConfirmation?: boolean;
    confirmationMessage?: string;
}

export async function executeProducerTool(
    toolName: string,
    parameters: any,
    context: ProducerAppContext
): Promise<ToolResult> {
    const { scriptData, setScriptData, moodBoards, onGenerateBeat, onGenerateSequence, onCreateMoodBoard, showNotification } = context;

    // Helper to find beat by ID or position
    const findBeat = (identifier: string): Beat | undefined => {
        if (!scriptData?.beats) return undefined;

        // Try as position number first
        const posNum = parseInt(identifier);
        if (!isNaN(posNum) && posNum > 0 && posNum <= scriptData.beats.length) {
            return scriptData.beats[posNum - 1];
        }

        // Try as ID
        return scriptData.beats.find(b => b.id === identifier);
    };

    const findBeatIndex = (identifier: string): number => {
        if (!scriptData?.beats) return -1;

        const posNum = parseInt(identifier);
        if (!isNaN(posNum) && posNum > 0 && posNum <= scriptData.beats.length) {
            return posNum - 1;
        }

        return scriptData.beats.findIndex(b => b.id === identifier);
    };

    switch (toolName) {
        case 'addBeat': {
            if (!scriptData) {
                return { success: false, message: 'No script data available' };
            }

            const newBeat: Beat = {
                id: `beat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                visualSummary: parameters.visualSummary,
                characters: parameters.characters || [],
                locations: parameters.locations || [],
                products: parameters.products || [],
                shotType: parameters.shotType || 'MED',
                mood: parameters.mood || 'neutral',
                duration: parameters.duration || '3s',
                status: 'scripted'
            };

            const beats = [...scriptData.beats];
            const position = parameters.position === -1 ? beats.length : parameters.position;
            beats.splice(position, 0, newBeat);

            setScriptData({ ...scriptData, beats });
            showNotification(`Added beat at position ${position + 1}`);

            return {
                success: true,
                message: `Added beat "${parameters.visualSummary.substring(0, 50)}..." at position ${position + 1}`,
                data: { beatId: newBeat.id, position: position + 1 }
            };
        }

        case 'modifyBeat': {
            if (!scriptData) {
                return { success: false, message: 'No script data available' };
            }

            const beatIndex = findBeatIndex(parameters.beatIdentifier);
            if (beatIndex === -1) {
                return { success: false, message: `Beat "${parameters.beatIdentifier}" not found` };
            }

            const beats = [...scriptData.beats];
            beats[beatIndex] = { ...beats[beatIndex], ...parameters.updates };

            setScriptData({ ...scriptData, beats });
            showNotification(`Updated beat ${beatIndex + 1}`);

            return {
                success: true,
                message: `Updated beat ${beatIndex + 1}`,
                data: { beatIndex: beatIndex + 1 }
            };
        }

        case 'deleteBeats': {
            if (!scriptData) {
                return { success: false, message: 'No script data available' };
            }

            const indicesToDelete = parameters.beatIdentifiers.map((id: string) => findBeatIndex(id)).filter((i: number) => i !== -1);

            if (indicesToDelete.length === 0) {
                return { success: false, message: 'No matching beats found to delete' };
            }

            // Confirmation for bulk deletes
            if (indicesToDelete.length > 3) {
                return {
                    success: false,
                    needsConfirmation: true,
                    confirmationMessage: `Are you sure you want to delete ${indicesToDelete.length} beats? This cannot be undone.`,
                    message: `Waiting for confirmation to delete ${indicesToDelete.length} beats`
                };
            }

            const beats = scriptData.beats.filter((_, idx) => !indicesToDelete.includes(idx));

            setScriptData({ ...scriptData, beats });
            showNotification(`Deleted ${indicesToDelete.length} beat(s)`);

            return {
                success: true,
                message: `Deleted ${indicesToDelete.length} beat(s)`,
                data: { deletedCount: indicesToDelete.length }
            };
        }

        case 'reorderBeats': {
            if (!scriptData || !scriptData.beats.length) {
                return { success: false, message: 'No beats to reorder' };
            }

            const beats = [...scriptData.beats];

            for (const move of parameters.moves) {
                const fromIdx = move.from - 1;
                const toIdx = move.to - 1;

                if (fromIdx >= 0 && fromIdx < beats.length && toIdx >= 0 && toIdx < beats.length) {
                    const [removed] = beats.splice(fromIdx, 1);
                    beats.splice(toIdx, 0, removed);
                }
            }

            setScriptData({ ...scriptData, beats });
            showNotification('Beats reordered');

            return {
                success: true,
                message: `Reordered ${parameters.moves.length} beat(s)`,
                data: { moves: parameters.moves }
            };
        }

        case 'generateBeatImages': {
            if (!scriptData) {
                return { success: false, message: 'No script data available' };
            }

            const beatsToGenerate = parameters.beatIdentifiers
                .map((id: string) => findBeat(id))
                .filter(Boolean) as Beat[];

            if (beatsToGenerate.length === 0) {
                return { success: false, message: 'No matching beats found' };
            }

            // Trigger generation for each beat
            for (const beat of beatsToGenerate) {
                if (parameters.generateSequence) {
                    onGenerateSequence(beat, scriptData.characters, scriptData.locations || [], scriptData.products || []);
                } else {
                    onGenerateBeat(beat, scriptData.characters, scriptData.locations || [], scriptData.products || []);
                }
            }

            showNotification(`Generating images for ${beatsToGenerate.length} beat(s)...`);

            return {
                success: true,
                message: `Started image generation for ${beatsToGenerate.length} beat(s)${parameters.moodBoardName ? ` with "${parameters.moodBoardName}" style` : ''}`,
                data: { count: beatsToGenerate.length }
            };
        }

        case 'addCharacter': {
            if (!scriptData) {
                return { success: false, message: 'No script data available' };
            }

            const newCharacter: CharacterProfile = {
                id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: parameters.name,
                description: parameters.description,
                promptSnippet: parameters.promptSnippet,
                consistencyAnchors: parameters.consistencyAnchors
            };

            const characters = [...scriptData.characters, newCharacter];
            setScriptData({ ...scriptData, characters });
            showNotification(`Added character: ${parameters.name}`);

            return {
                success: true,
                message: `Added character "${parameters.name}"`,
                data: { characterId: newCharacter.id }
            };
        }

        case 'addLocation': {
            if (!scriptData) {
                return { success: false, message: 'No script data available' };
            }

            const newLocation: LocationProfile = {
                id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: parameters.name,
                description: parameters.description,
                timeOfDay: parameters.timeOfDay,
                weather: parameters.weather,
                lightingNotes: parameters.lightingNotes
            };

            const locations = [...(scriptData.locations || []), newLocation];
            setScriptData({ ...scriptData, locations });
            showNotification(`Added location: ${parameters.name}`);

            return {
                success: true,
                message: `Added location "${parameters.name}"`,
                data: { locationId: newLocation.id }
            };
        }

        case 'addProduct': {
            if (!scriptData) {
                return { success: false, message: 'No script data available' };
            }

            const newProduct: ProductProfile = {
                id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: parameters.name,
                description: parameters.description,
                category: parameters.category,
                materialNotes: parameters.materialNotes,
                brandGuidelines: parameters.brandGuidelines
            };

            const products = [...(scriptData.products || []), newProduct];
            setScriptData({ ...scriptData, products });
            showNotification(`Added product: ${parameters.name}`);

            return {
                success: true,
                message: `Added product "${parameters.name}"`,
                data: { productId: newProduct.id }
            };
        }

        case 'createMoodBoard': {
            onCreateMoodBoard(parameters.name, parameters.purpose);

            return {
                success: true,
                message: `Created mood board "${parameters.name}" for ${parameters.purpose}`,
                data: { name: parameters.name, purpose: parameters.purpose }
            };
        }

        case 'updateProductionDesign': {
            if (!scriptData) {
                return { success: false, message: 'No script data available' };
            }

            const productionDesign = {
                ...(scriptData.productionDesign || {}),
                ...parameters
            };

            setScriptData({ ...scriptData, productionDesign });
            showNotification('Production design updated');

            return {
                success: true,
                message: 'Updated production design settings',
                data: parameters
            };
        }

        case 'getProjectState': {
            const state = {
                beatCount: scriptData?.beats?.length || 0,
                characterCount: scriptData?.characters?.length || 0,
                locationCount: scriptData?.locations?.length || 0,
                productCount: scriptData?.products?.length || 0,
                moodBoardCount: moodBoards.length,
                hasProductionDesign: !!scriptData?.productionDesign
            };

            if (parameters.includeFullDetails) {
                return {
                    success: true,
                    message: 'Retrieved full project state',
                    data: {
                        ...state,
                        beats: scriptData?.beats?.map((b, i) => ({
                            position: i + 1,
                            id: b.id,
                            summary: b.visualSummary,
                            characters: b.characters,
                            locations: b.locations,
                            shotType: b.shotType,
                            hasImage: !!(b.generatedImageIds?.length || b.sequenceGrid)
                        })),
                        characters: scriptData?.characters?.map(c => ({ id: c.id, name: c.name, isLocked: c.isLocked })),
                        locations: scriptData?.locations?.map(l => ({ id: l.id, name: l.name })),
                        products: scriptData?.products?.map(p => ({ id: p.id, name: p.name })),
                        moodBoards: moodBoards.map(mb => ({
                            id: mb.id,
                            name: mb.name,
                            purpose: mb.purpose,
                            imageCount: mb.images.length,
                            hasStyleDNA: !!mb.styleDNA
                        })),
                        productionDesign: scriptData?.productionDesign
                    }
                };
            }

            return {
                success: true,
                message: `Project has ${state.beatCount} beats, ${state.characterCount} characters, ${state.locationCount} locations, ${state.productCount} products, ${state.moodBoardCount} mood boards`,
                data: state
            };
        }

        case 'suggestBeats': {
            // This doesn't execute anything - just returns suggestions
            return {
                success: true,
                message: `Here are ${parameters.count} beat suggestions for "${parameters.context}". Would you like me to add any of them?`,
                data: {
                    context: parameters.context,
                    count: parameters.count,
                    note: 'Use addBeat to actually add these to your script'
                }
            };
        }

        default:
            return { success: false, message: `Unknown tool: ${toolName}` };
    }
}

// ============================================
// PRODUCER MESSAGE TYPE
// ============================================

export interface ProducerMessage {
    id: string;
    role: 'user' | 'producer';
    content: string;
    timestamp: number;
    toolCalls?: {
        toolName: string;
        parameters: any;
        result: ToolResult;
    }[];
    isThinking?: boolean;
}

// ============================================
// SYSTEM PROMPT
// ============================================

export const PRODUCER_SYSTEM_PROMPT = `You are the Creative Producer for Design Agent, an AI-powered video production tool for sport-fashion content.

Your role is to help users create amazing visual content by:
1. Understanding their creative vision through natural conversation
2. Making intelligent creative suggestions
3. **Actually implementing changes** when they ask - you have tools to do this!

IMPORTANT BEHAVIORS:

1. **EXECUTE, DON'T DESCRIBE**
   When a user says "add 5 beats" or "make it more dramatic", USE THE TOOLS to actually do it.
   Don't just describe what you would do - actually do it.

2. **CONFIRM BEFORE DESTRUCTIVE ACTIONS**
   Before deleting multiple beats or regenerating everything, briefly confirm what you're about to do.

3. **BE CONVERSATIONAL**
   You're a creative partner, not a robotic assistant. Discuss ideas, offer alternatives, build on their vision.

4. **USE getProjectState FIRST**
   When starting a conversation or after being away, check the current state so you know what exists.

5. **REPORT WHAT YOU DID**
   After using tools, explain what changed in natural language.

AVAILABLE ACTIONS:
- Add, modify, delete, and reorder beats
- Generate images for beats (single or sequence)
- Add characters, locations, and products
- Create mood boards
- Update production design settings

EXAMPLES OF GOOD RESPONSES:

User: "Add 3 beats showing the athlete warming up"
You: [Use addBeat tool 3 times]
"Done! I've added 3 warm-up beats at the start:
1. Athlete stretching in locker room
2. Walking onto the court
3. Practice shots before the game starts
Want me to generate images for them?"

User: "Make beat 5 more dramatic"
You: [Use modifyBeat tool]
"I've updated beat 5 - changed the shot type to extreme close-up and added 'intense, high-stakes' to the mood. Should I regenerate the image with this new direction?"

Remember: You're here to help them CREATE, not just chat about creating.`;
