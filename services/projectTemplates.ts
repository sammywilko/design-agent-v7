import { ProjectTemplate } from '../types';

// ============================================================================
// BUILT-IN PROJECT TEMPLATES
// ============================================================================

export const BUILT_IN_TEMPLATES: ProjectTemplate[] = [
    {
        id: 'template-product-commercial',
        name: 'Product Commercial',
        description: 'E-commerce hero shots, lifestyle, and detail coverage for product videos',
        icon: '📦',
        category: 'product',
        worldBible: {
            suggestedCharacters: [
                {
                    name: 'Model',
                    description: 'Lifestyle model for product interaction shots',
                    placeholder: true
                }
            ],
            suggestedLocations: [
                {
                    name: 'Studio',
                    description: 'Clean white or gradient studio backdrop',
                    placeholder: false
                },
                {
                    name: 'Lifestyle Setting',
                    description: 'Modern home or office environment',
                    placeholder: true
                }
            ],
            suggestedProducts: [
                {
                    name: 'Hero Product',
                    description: 'Main product to feature',
                    placeholder: true
                }
            ]
        },
        shotRequirements: ['Hero Shot', 'Detail Macro', 'Lifestyle', 'Pack Shot', '360 Turnaround'],
        recommendedPacks: ['cinematic-9', 'contact-sheet'],
        productionDesign: {
            lookbookSuggestion: 'Clean, modern, high-contrast product photography',
            lightingPreset: 'studio-soft',
            cameraPreset: 'product-macro'
        },
        workflow: {
            steps: [
                'Upload product reference images',
                'Generate character sheet for product consistency',
                'Create hero shot with dramatic lighting',
                'Generate detail/macro shots',
                'Add lifestyle context shots',
                'Build video from key frames'
            ],
            tips: [
                'Lock your product in the Bible early for consistency',
                'Use 4:3 aspect ratio for e-commerce platforms',
                'Generate multiple angles before selecting hero'
            ]
        }
    },
    {
        id: 'template-music-video',
        name: 'Music Video',
        description: 'Bold visuals, dynamic scenes, and artist-focused content',
        icon: '🎵',
        category: 'narrative',
        worldBible: {
            suggestedCharacters: [
                {
                    name: 'Artist',
                    description: 'Main musical artist/performer',
                    placeholder: true
                },
                {
                    name: 'Supporting Cast',
                    description: 'Dancers, extras, or featured performers',
                    placeholder: true
                }
            ],
            suggestedLocations: [
                {
                    name: 'Performance Stage',
                    description: 'Main performance/concert setting',
                    placeholder: true
                },
                {
                    name: 'Narrative Location',
                    description: 'Story/concept location',
                    placeholder: true
                }
            ],
            suggestedProducts: []
        },
        shotRequirements: ['Performance Wide', 'Artist Close-up', 'Dance Coverage', 'Atmospheric B-roll'],
        recommendedPacks: ['cinematic-9', 'action', 'story-driven'],
        productionDesign: {
            lookbookSuggestion: 'Bold colors, dramatic lighting, stylized visuals',
            lightingPreset: 'concert-dramatic',
            cameraPreset: 'handheld-dynamic'
        },
        workflow: {
            steps: [
                'Create artist character sheet with multiple expressions',
                'Design performance and narrative locations',
                'Generate performance coverage shots',
                'Create story-driven narrative sequence',
                'Generate atmospheric B-roll',
                'Assemble storyboard timeline'
            ],
            tips: [
                'Use Story Mode for narrative sequences',
                'Lock artist appearance early',
                'Generate expression bank for emotional range'
            ]
        }
    },
    {
        id: 'template-fashion-lookbook',
        name: 'Fashion Lookbook',
        description: 'Editorial fashion with model sheets, poses, and styled environments',
        icon: '👗',
        category: 'fashion',
        worldBible: {
            suggestedCharacters: [
                {
                    name: 'Lead Model',
                    description: 'Primary fashion model',
                    placeholder: true
                },
                {
                    name: 'Supporting Model',
                    description: 'Secondary model for duo shots',
                    placeholder: true
                }
            ],
            suggestedLocations: [
                {
                    name: 'Studio',
                    description: 'Fashion studio with cyclorama',
                    placeholder: false
                },
                {
                    name: 'On-Location',
                    description: 'Urban, nature, or architectural setting',
                    placeholder: true
                }
            ],
            suggestedProducts: [
                {
                    name: 'Collection',
                    description: 'Fashion collection/garments to feature',
                    placeholder: true
                }
            ]
        },
        shotRequirements: ['Full Look', 'Detail/Texture', 'Movement', 'Editorial Portrait'],
        recommendedPacks: ['cinematic-9', 'dialogue'],
        productionDesign: {
            lookbookSuggestion: 'High-fashion editorial, aspirational, beautiful',
            lightingPreset: 'fashion-editorial',
            cameraPreset: 'portrait-85mm'
        },
        workflow: {
            steps: [
                'Create model character sheets with poses',
                'Define collection/garment details',
                'Generate full-look hero shots',
                'Create detail/texture close-ups',
                'Add movement and lifestyle shots',
                'Build editorial sequence'
            ],
            tips: [
                'Use 3:4 or 9:16 for fashion-forward framing',
                'Generate turnaround for outfit consistency',
                'Lock garment colors in product bible'
            ]
        }
    },
    {
        id: 'template-documentary',
        name: 'Documentary',
        description: 'Authentic storytelling with interview setups and B-roll coverage',
        icon: '🎬',
        category: 'documentary',
        worldBible: {
            suggestedCharacters: [
                {
                    name: 'Subject',
                    description: 'Main documentary subject/interviewee',
                    placeholder: true
                },
                {
                    name: 'Supporting Subjects',
                    description: 'Additional people featured',
                    placeholder: true
                }
            ],
            suggestedLocations: [
                {
                    name: 'Interview Setting',
                    description: 'Location for sit-down interviews',
                    placeholder: true
                },
                {
                    name: 'Activity Location',
                    description: 'Where subject does their work/activity',
                    placeholder: true
                }
            ],
            suggestedProducts: []
        },
        shotRequirements: ['Interview Setup', 'B-roll Activity', 'Establishing', 'Detail Inserts'],
        recommendedPacks: ['dialogue', 'cinematic-9'],
        productionDesign: {
            lookbookSuggestion: 'Natural, authentic, observational',
            lightingPreset: 'natural-available',
            cameraPreset: 'documentary-handheld'
        },
        workflow: {
            steps: [
                'Create subject character profiles',
                'Design interview and activity locations',
                'Generate interview coverage (Dialogue Pack)',
                'Create activity B-roll sequence',
                'Add establishing and detail shots',
                'Assemble documentary flow'
            ],
            tips: [
                'Use natural lighting style for authenticity',
                'Dialogue Pack perfect for interview coverage',
                'Story Mode great for narrative B-roll'
            ]
        }
    },
    {
        id: 'template-brand-film',
        name: 'Brand Film',
        description: 'Corporate storytelling with talent, locations, and brand integration',
        icon: '🏢',
        category: 'commercial',
        worldBible: {
            suggestedCharacters: [
                {
                    name: 'Protagonist',
                    description: 'Main character representing brand/customer',
                    placeholder: true
                },
                {
                    name: 'Brand Ambassador',
                    description: 'Secondary character or brand representative',
                    placeholder: true
                }
            ],
            suggestedLocations: [
                {
                    name: 'Brand Environment',
                    description: 'Office, store, or brand-specific location',
                    placeholder: true
                },
                {
                    name: 'Customer Journey',
                    description: 'Location showing product/service in use',
                    placeholder: true
                }
            ],
            suggestedProducts: [
                {
                    name: 'Brand Assets',
                    description: 'Logo, products, or brand elements',
                    placeholder: true
                }
            ]
        },
        shotRequirements: ['Establishing', 'Character Intro', 'Product Integration', 'Resolution'],
        recommendedPacks: ['story-driven', 'cinematic-9'],
        productionDesign: {
            lookbookSuggestion: 'Clean, professional, polished corporate',
            lightingPreset: 'commercial-clean',
            cameraPreset: 'corporate-stable'
        },
        workflow: {
            steps: [
                'Define brand visual guidelines',
                'Create protagonist character sheet',
                'Design brand and journey locations',
                'Generate story-driven 9-shot sequence',
                'Add brand/product integration shots',
                'Build narrative timeline'
            ],
            tips: [
                'Story Mode ensures narrative arc',
                'Lock brand colors in moodboard',
                'Use consistent talent across all shots'
            ]
        }
    },
    {
        id: 'template-blank',
        name: 'Blank Canvas',
        description: 'Start fresh with no pre-configured settings',
        icon: '✨',
        category: 'custom',
        worldBible: {
            suggestedCharacters: [],
            suggestedLocations: [],
            suggestedProducts: []
        },
        shotRequirements: [],
        recommendedPacks: [],
        workflow: {
            steps: [
                'Define your project vision',
                'Add characters, locations, and products to Bible',
                'Create moodboard for visual style',
                'Generate your first concepts',
                'Refine and iterate'
            ],
            tips: [
                'Start with a clear creative brief',
                'Build your Bible before generating',
                'Use Contact Sheet for rapid exploration'
            ]
        }
    }
];

// ============================================================================
// TEMPLATE MANAGEMENT FUNCTIONS
// ============================================================================

const CUSTOM_TEMPLATES_KEY = 'design-agent-custom-templates';

/**
 * Get all templates (built-in + custom)
 */
export const getAllTemplates = (): ProjectTemplate[] => {
    const customTemplates = getCustomTemplates();
    return [...customTemplates, ...BUILT_IN_TEMPLATES];
};

/**
 * Get built-in templates only
 */
export const getBuiltInTemplates = (): ProjectTemplate[] => {
    return BUILT_IN_TEMPLATES;
};

/**
 * Get custom (user-created) templates
 */
export const getCustomTemplates = (): ProjectTemplate[] => {
    try {
        const saved = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
        if (saved) {
            return JSON.parse(saved) as ProjectTemplate[];
        }
    } catch (error) {
        console.error('Failed to load custom templates:', error);
    }
    return [];
};

/**
 * Save a custom template
 */
export const saveCustomTemplate = (template: ProjectTemplate): void => {
    const existing = getCustomTemplates();
    const updated = [template, ...existing];
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
};

/**
 * Delete a custom template
 */
export const deleteCustomTemplate = (templateId: string): void => {
    const existing = getCustomTemplates();
    const updated = existing.filter(t => t.id !== templateId);
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updated));
};

/**
 * Get template by ID
 */
export const getTemplateById = (templateId: string): ProjectTemplate | undefined => {
    return getAllTemplates().find(t => t.id === templateId);
};

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category: ProjectTemplate['category']): ProjectTemplate[] => {
    return getAllTemplates().filter(t => t.category === category);
};
