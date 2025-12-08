/**
 * Cinematic Knowledge Base
 *
 * Provides UNIVERSAL research-backed cinematography guidance for the Script Director.
 * Same principles apply across ALL content types - sport-fashion, property, music video,
 * narrative, fashion, and commercial/B2B.
 *
 * The neuroscience of visual storytelling is universal. What changes is the APPLICATION.
 */

// ============================================
// CONTENT TYPE DEFINITIONS
// ============================================

export type ContentType =
    | 'sport-fashion'
    | 'property'
    | 'music-video'
    | 'narrative'
    | 'fashion'
    | 'commercial'
    | 'general';

export interface ContentTypeGuidance {
    type: ContentType;
    description: string;
    primaryGoals: string[];
    defaultAngle: string;
    defaultLighting: string;
    avoidList: string[];
    specialConsiderations: string[];
}

export const CONTENT_TYPE_GUIDANCE: Record<ContentType, ContentTypeGuidance> = {
    'sport-fashion': {
        type: 'sport-fashion',
        description: 'Athletic performance + lifestyle/fashion aesthetic',
        primaryGoals: ['Make athletes look powerful and aspirational', 'Showcase athletic movement', 'Display gear/apparel'],
        defaultAngle: 'low',
        defaultLighting: 'high_key',
        avoidList: [],
        specialConsiderations: [
            'Low angles for heroism and power',
            'Wide shots for athletic movement',
            'Golden hour for premium aesthetic',
            'Hold reaction shots 2-3 seconds for celebrations'
        ]
    },
    'property': {
        type: 'property',
        description: 'Real estate, architectural, measurement-accurate visualization',
        primaryGoals: ['Accurate spatial representation', 'Trust building', 'Feature showcase'],
        defaultAngle: 'eye',
        defaultLighting: 'high_key',
        avoidList: ['dutch', 'extreme low angles that distort measurements'],
        specialConsiderations: [
            'Eye level for "20 feet IS 20 feet" accuracy',
            'High key lighting for trust and visibility',
            'Avoid angles that misrepresent space for sales content',
            'Wide shots for spatial understanding'
        ]
    },
    'music-video': {
        type: 'music-video',
        description: 'Performance capture, narrative, visual storytelling synced to music',
        primaryGoals: ['Artist as icon', 'Emotional amplification', 'Beat synchronization'],
        defaultAngle: 'low',
        defaultLighting: 'varies',
        avoidList: [],
        specialConsiderations: [
            'Cut on musical beats',
            'Tighten shots as song intensity builds',
            'Genre-specific lighting (pop = high key, hip-hop = low key)',
            'Chorus gets tightest shots, fastest cuts'
        ]
    },
    'narrative': {
        type: 'narrative',
        description: 'Short films, branded story content, documentary-style storytelling',
        primaryGoals: ['Story clarity', 'Emotional engagement', 'Character development'],
        defaultAngle: 'eye',
        defaultLighting: 'varies',
        avoidList: [],
        specialConsiderations: [
            'Tightening = intensity (wider shots for context, tighter for emotion)',
            'Motivated lighting (every light should have a story reason)',
            'Full comedy timing toolkit available',
            'Character consistency critical across shots'
        ]
    },
    'fashion': {
        type: 'fashion',
        description: 'Editorial, lookbooks, campaigns, e-commerce, lifestyle fashion',
        primaryGoals: ['Product showcase', 'Aspirational beauty', 'Brand identity'],
        defaultAngle: 'eye',
        defaultLighting: 'soft',
        avoidList: [],
        specialConsiderations: [
            'Garment is the star - ensure visibility',
            'Full outfit in wide shots, details in ECU',
            'Soft light for beauty, hard light for editorial drama',
            'Eye level for commercial, slight low for aspirational'
        ]
    },
    'commercial': {
        type: 'commercial',
        description: 'B2B, corporate, testimonials, product demos, training content',
        primaryGoals: ['Trust building', 'Message clarity', 'Professional positioning'],
        defaultAngle: 'eye',
        defaultLighting: 'high_key',
        avoidList: ['dutch (appears unprofessional)', 'low key (can feel secretive)'],
        specialConsiderations: [
            'Eye level = trust and equality (90%+ of shots)',
            'High key lighting = transparency and trust',
            'Keep it professional - avoid style for its own sake',
            'Pause after humor for effect'
        ]
    },
    'general': {
        type: 'general',
        description: 'Default guidance when content type not specified',
        primaryGoals: ['Universal cinematography principles'],
        defaultAngle: 'eye',
        defaultLighting: 'soft',
        avoidList: [],
        specialConsiderations: [
            'Apply universal principles',
            'Tighter shots = more emotion',
            'Eye level = default safe choice',
            'Lighting should serve the story'
        ]
    }
};

// ============================================
// CAMERA ANGLE KNOWLEDGE
// ============================================

export interface CameraAngleGuidance {
    angle: string;
    psychology: string;
    useWhen: string[];
    avoidWhen: string[];
    technicalNotes: string;
    contentTypeNotes: Record<ContentType, string>;
}

export const CAMERA_ANGLES: Record<string, CameraAngleGuidance> = {
    'low': {
        angle: 'LOW ANGLE (Looking Up)',
        psychology: 'Power, dominance, heroism, threat, aspiration - mimics child looking at adult',
        useWhen: ['Hero moments', 'Villain reveals', 'Empowerment beats', 'Product dominance', 'Aspirational positioning'],
        avoidWhen: ['You want audience to relate as equal', 'Property accuracy is critical'],
        technicalNotes: 'Extreme low = godlike/monumental. Slight low (15°) = confident/capable. Works best with wide lenses.',
        contentTypeNotes: {
            'sport-fashion': 'Heroic athlete positioning, pre-competition intensity, victory moments',
            'property': 'CAUTION: Distorts measurements. Use only for marketing hero shots, not accuracy',
            'music-video': 'Artist as icon, performance power, chorus climax moments',
            'narrative': 'Character dominance, hero triumph, villain threat',
            'fashion': 'Aspirational beauty, editorial power, runway perspective',
            'commercial': 'Executive authority, product superiority - use sparingly',
            'general': 'Power and aspiration - use when character should feel dominant'
        }
    },
    'high': {
        angle: 'HIGH ANGLE (Looking Down)',
        psychology: 'Vulnerability, weakness, being observed, insignificance, judgment',
        useWhen: ['Character defeat', 'Loneliness', 'Overwhelming odds', 'Surveillance feeling', 'Layout overview'],
        avoidWhen: ['Character should feel strong', 'Executive positioning'],
        technicalNotes: 'Extreme high = pattern recognition. Slight high (15°) = gentle observation. Flattens subjects.',
        contentTypeNotes: {
            'sport-fashion': 'Vulnerability before triumph, tactical overview, defeat moments',
            'property': 'Layout overview, floor plan perspective, site context - good for accuracy',
            'music-video': 'Emotional vulnerability, artistic perspective, choreography showcase',
            'narrative': 'Character defeat, being watched, isolation, divine judgment',
            'fashion': 'Editorial perspective, pattern/texture emphasis, flat lay',
            'commercial': 'Overview/context only - CAUTION: can make executives appear weak',
            'general': 'Vulnerability and observation - audience judges from above'
        }
    },
    'eye': {
        angle: 'EYE LEVEL',
        psychology: 'Equality, relatability, neutrality, honest conversation - natural human interaction',
        useWhen: ['Dialogue', 'Documentary feel', 'Trust building', 'Accurate representation', 'Testimonials'],
        avoidWhen: [],
        technicalNotes: 'Most "honest" angle - no manipulation. Default when in doubt. Camera at 5\'6" - 5\'8" for standing adults.',
        contentTypeNotes: {
            'sport-fashion': 'Authentic athlete connection, interview/testimonial, human story',
            'property': 'PRIMARY CHOICE - accurate spatial representation, "20 feet IS 20 feet", trust',
            'music-video': 'Authentic artist connection, intimate verses, conversational',
            'narrative': 'Dialogue scenes, character as equal, documentary feel, neutral information',
            'fashion': 'Relatable luxury, lifestyle connection, commercial standard',
            'commercial': 'PRIMARY CHOICE - trust building, peer communication, testimonials',
            'general': 'Default safe choice - creates equality with subject'
        }
    },
    'dutch': {
        angle: 'DUTCH ANGLE (Tilted)',
        psychology: 'Unease, disorientation, something wrong, psychological instability, energy',
        useWhen: ['Mental instability', 'Danger', 'Surreal moments', 'High energy/chaos', 'Fashion editorial'],
        avoidWhen: ['Property content', 'Corporate content', 'Trust is important', 'Overuse'],
        technicalNotes: '15-30° = subtle unease. 45° = max before stylization. USE SPARINGLY - 1-2 per scene max.',
        contentTypeNotes: {
            'sport-fashion': 'Dynamic action, intensity moments, edgy fashion aesthetic, beat drops',
            'property': 'AVOID - architecture needs stability, disorientation inappropriate for sales',
            'music-video': 'Energy and chaos, experimental style, genre convention (hip-hop, electronic)',
            'narrative': 'Mental instability, danger/threat, transition moments, villain POV',
            'fashion': 'Edgy/avant-garde, dynamic energy, rule-breaking high fashion',
            'commercial': 'AVOID - appears unprofessional, risks appearing unstable',
            'general': 'Use very sparingly - creates unease and disorientation'
        }
    },
    'overhead': {
        angle: 'OVERHEAD (Bird\'s Eye)',
        psychology: 'Omniscience, fate, patterns, disconnection, god\'s-eye view',
        useWhen: ['Establishing geography', 'Choreography', 'Pattern revelation', 'Death scenes', 'Site overview'],
        avoidWhen: ['Emotional connection needed'],
        technicalNotes: 'Pure overhead (90°) = most detached. Slight angle (70-80°) = more narrative engagement.',
        contentTypeNotes: {
            'sport-fashion': 'Tactical overview, choreography showcase, scale revelation',
            'property': 'Floor plan verification, site overview, drone establishing, spatial relationships',
            'music-video': 'Choreography showcase, artistic perspective, god\'s eye moment',
            'narrative': 'Establishing geography, fate/destiny, death scenes, pattern revelation',
            'fashion': 'Pattern/design showcase, flat lay aesthetic, editorial art',
            'commercial': 'Organizational overview, facility layout, data visualization',
            'general': 'Detachment and pattern - audience sees what characters cannot'
        }
    }
};

// ============================================
// SHOT TYPE KNOWLEDGE
// ============================================

export interface ShotTypeGuidance {
    type: string;
    shows: string;
    emotionalImpact: string;
    useWhen: string[];
    technicalNotes: string;
    holdDuration: string;
    contentTypeNotes: Record<ContentType, string>;
}

export const SHOT_TYPES: Record<string, ShotTypeGuidance> = {
    'EWS': {
        type: 'EXTREME WIDE SHOT',
        shows: 'Full environment, subject tiny or absent',
        emotionalImpact: 'Scale, loneliness, journey, epic scope, insignificance',
        useWhen: ['Opening a scene/film', 'Showing journey/distance', 'Emphasizing character vs environment', 'Epic moments'],
        technicalNotes: 'Subject <10% of frame. Environment IS the subject. Often static or very slow movement.',
        holdDuration: '4-6 seconds',
        contentTypeNotes: {
            'sport-fashion': 'Stadium/arena scale, training landscape, journey shots, epic achievement',
            'property': 'Full building exterior, site overview, location establishing, development scope',
            'music-video': 'Concert scale, location establishing, isolation/loneliness, journey narrative',
            'narrative': 'Opening establishing, character vs world, journey/distance, emotional isolation',
            'fashion': 'Location fashion, lifestyle context, editorial landscape',
            'commercial': 'Facility/campus scale, global presence, market context',
            'general': 'Establish scale and context - subject is small in the world'
        }
    },
    'WS': {
        type: 'WIDE SHOT',
        shows: 'Full body + environment context',
        emotionalImpact: 'Context, physical action, spatial relationships',
        useWhen: ['Action sequences', 'Dance/movement', 'Character in their world', 'Full outfit showcase'],
        technicalNotes: 'Subject fills ~30-50% of frame height. Shows costume/wardrobe well.',
        holdDuration: '3-5 seconds',
        contentTypeNotes: {
            'sport-fashion': 'Full athletic movement, technique showcase, head-to-toe outfit, training context',
            'property': 'Room overview, spatial understanding, ceiling height, furniture scale',
            'music-video': 'Performance context, full choreography, band shot, location context',
            'narrative': 'Action sequences, blocking, environment interaction, group dynamics',
            'fashion': 'Full outfit showcase, silhouette, movement, complete styling',
            'commercial': 'Team shots, facility context, process overview',
            'general': 'Full body in context - see the whole picture'
        }
    },
    'MWS': {
        type: 'MEDIUM WIDE SHOT (Cowboy)',
        shows: 'Head to mid-thigh',
        emotionalImpact: 'Casual observation, standoff energy, comfortable distance',
        useWhen: ['Walking and talking', 'Showdowns', 'Fashion/outfit emphasis', 'Athletic stance'],
        technicalNotes: 'Named for Westerns (shows holstered gun). Good transition between wide and medium.',
        holdDuration: '3-4 seconds',
        contentTypeNotes: {
            'sport-fashion': 'Athleisure showcase, athletic stance, walking shots, pre-action moments',
            'property': 'Room features in context, human scale reference, functional areas',
            'music-video': 'Performance stance, walking shots, instrument visibility',
            'narrative': 'Standoff/confrontation, walking and talking, character introduction',
            'fashion': 'Outfit emphasis, style showcase, editorial pose',
            'commercial': 'Presenter shots, professional stance',
            'general': 'Comfortable observation distance'
        }
    },
    'MS': {
        type: 'MEDIUM SHOT',
        shows: 'Head to waist',
        emotionalImpact: 'Conversational, engaged but not intimate',
        useWhen: ['Dialogue (default)', 'Interviews', 'Product demonstrations', 'Balanced emotion + context'],
        technicalNotes: 'Most versatile shot size. Shows gesture + expression. Safe choice when unsure.',
        holdDuration: '2-4 seconds',
        contentTypeNotes: {
            'sport-fashion': 'Interview standard, training dialogue, product showcase, upper body technique',
            'property': 'Feature details, room character, lifestyle moments',
            'music-video': 'Standard performance, emotional delivery, band member isolation',
            'narrative': 'Dialogue default, balanced emotion + context, character interaction',
            'fashion': 'Upper body fashion, face + outfit, jewelry/accessories',
            'commercial': 'Interview standard, presentation, testimonial',
            'general': 'DEFAULT CHOICE - conversation distance, balanced attention'
        }
    },
    'MCU': {
        type: 'MEDIUM CLOSE-UP',
        shows: 'Head and shoulders',
        emotionalImpact: 'Attention, importance, beginning of intimacy',
        useWhen: ['Important dialogue', 'Reaction shots', 'Introducing characters', 'Key statements'],
        technicalNotes: 'Cuts below shoulders, above chest. Most common shot in TV.',
        holdDuration: '2-3 seconds',
        contentTypeNotes: {
            'sport-fashion': 'Pre-game intensity, interview emphasis, reaction shots, brand ambassador',
            'property': 'Detail showcase, feature highlight - limited people use',
            'music-video': 'Emotional delivery, reaction shots, artist-audience connection',
            'narrative': 'Important dialogue, reaction emphasis, character introduction, emotional transition',
            'fashion': 'Beauty focus, jewelry/accessory detail, editorial portrait',
            'commercial': 'Key statement, expert positioning, emotional testimonial',
            'general': 'Pay attention to this person - heightened focus'
        }
    },
    'CU': {
        type: 'CLOSE-UP',
        shows: 'Face fills frame',
        emotionalImpact: 'Intimacy, intensity, emotional peak, truth',
        useWhen: ['Emotional peaks', 'Truth reveals', 'Critical decisions', 'Intimate moments'],
        technicalNotes: 'Eyes in upper third. Minimal headroom. USE SPARINGLY for maximum impact.',
        holdDuration: '1-3 seconds',
        contentTypeNotes: {
            'sport-fashion': 'Determination/focus, victory/defeat emotion, game face, human story',
            'property': 'Material detail, hardware/fixtures, finish quality - rarely for people',
            'music-video': 'Emotional peak, intimacy with audience, vulnerability, key lyrics',
            'narrative': 'Emotional peaks, truth/lies, critical decisions, intimate moments',
            'fashion': 'Beauty close-up, detail emphasis, emotional fashion',
            'commercial': 'Emotional testimony, key message, human connection',
            'general': 'Maximum emotional connection - use sparingly for impact'
        }
    },
    'ECU': {
        type: 'EXTREME CLOSE-UP',
        shows: 'Single feature (eyes, lips, hands, object)',
        emotionalImpact: 'Hyper-focus, abstraction, detail, intensity',
        useWhen: ['Critical detail reveals', 'Product beauty shots', 'Psychological intensity', 'Material quality'],
        technicalNotes: 'Often macro lens territory. Can feel invasive - use intentionally.',
        holdDuration: '0.5-2 seconds',
        contentTypeNotes: {
            'sport-fashion': 'Sweat/determination, equipment detail, texture/material, eyes of champion',
            'property': 'Material quality, hardware detail, craftsmanship, finish precision',
            'music-video': 'Lips singing, eyes, hands on instrument, abstract artistic moments',
            'narrative': 'Critical detail, psychological intensity, sensory moment, object significance',
            'fashion': 'Texture showcase, jewelry detail, makeup artistry, material luxury',
            'commercial': 'Product detail, quality emphasis, technology, brand mark',
            'general': 'This detail is CRITICAL - demands attention'
        }
    }
};

// ============================================
// LIGHTING KNOWLEDGE
// ============================================

export interface LightingGuidance {
    type: string;
    look: string;
    psychology: string;
    useFor: string[];
    technical: string;
    contentTypeNotes: Record<ContentType, string>;
}

export const LIGHTING_MOODS: Record<string, LightingGuidance> = {
    'high_key': {
        type: 'HIGH KEY',
        look: 'Minimal shadows, bright overall, soft contrast',
        psychology: 'Safety, optimism, clarity, openness, nothing to hide, trust',
        useFor: ['Comedy', 'Corporate positivity', 'Product beauty', 'Trust building', 'Aspirational lifestyle'],
        technical: 'Fill light near key intensity, soft sources, white/light backgrounds. Ratio 1:1 to 2:1.',
        contentTypeNotes: {
            'sport-fashion': 'Aspirational athletic lifestyle, performance energy, brand positivity, product clarity',
            'property': 'PRIMARY - openness/space, cleanliness, trust/transparency, accurate representation',
            'music-video': 'Upbeat/pop aesthetic, performance brightness, aspirational lifestyle',
            'narrative': 'Comedy default, utopian settings, children\'s content, happy scenes',
            'fashion': 'Clean beauty, commercial fashion, product clarity',
            'commercial': 'PRIMARY - trust/transparency, positive messaging, professional standard, product showcase',
            'general': 'Safe, optimistic, nothing to hide - builds trust'
        }
    },
    'low_key': {
        type: 'LOW KEY',
        look: 'Strong shadows, high contrast, selective illumination',
        psychology: 'Mystery, danger, drama, secrets, sophistication, luxury',
        useFor: ['Thriller/noir', 'Luxury products', 'Dramatic reveals', 'Villain scenes', 'Premium positioning'],
        technical: 'Minimal fill, hard sources, dark backgrounds, motivated practicals. Ratio 4:1 to 8:1+.',
        contentTypeNotes: {
            'sport-fashion': 'Athletic intensity, dramatic training, premium positioning, competition atmosphere',
            'property': 'Luxury positioning, dramatic architecture - CAUTION: can hide details',
            'music-video': 'Drama/intensity, hip-hop/R&B aesthetic, moody atmosphere, night scenes',
            'narrative': 'Thriller/noir, villain scenes, secrets/mystery, dramatic reveals',
            'fashion': 'High fashion editorial, luxury positioning, dramatic beauty',
            'commercial': 'Premium positioning, serious topics - CAUTION: can feel secretive',
            'general': 'Mystery and drama - heightened attention and vigilance'
        }
    },
    'soft': {
        type: 'SOFT LIGHT',
        look: 'Gradual shadow transitions, diffused, flattering',
        psychology: 'Gentleness, beauty, romance, approachability, timelessness',
        useFor: ['Beauty/fashion', 'Romance', 'Interviews', 'Sensitive topics', 'Flattering portraits'],
        technical: 'Large sources, diffusion, bounce, overcast simulation, wrap-around illumination.',
        contentTypeNotes: {
            'sport-fashion': 'Beauty/lifestyle portraits, fashion focus, interview comfort, brand warmth',
            'property': 'Welcoming atmosphere, residential warmth, accurate representation, material quality',
            'music-video': 'Romantic content, beauty focus, dreamy aesthetic',
            'narrative': 'Romance genre, beauty scenes, sensitive topics, timeless quality',
            'fashion': 'Beauty photography, product quality, flattering portraits, commercial standard',
            'commercial': 'Interview lighting, testimonials, product showcase',
            'general': 'Gentle and flattering - no harsh judgment'
        }
    },
    'hard': {
        type: 'HARD LIGHT',
        look: 'Sharp shadows, defined edges, dramatic contrast',
        psychology: 'Intensity, truth, harshness, no escape, interrogation, raw',
        useFor: ['Confrontation', 'Documentary truth', 'Gritty reality', 'High fashion edge', 'Athletic intensity'],
        technical: 'Small sources, minimal diffusion, Fresnel lenses, sharp shadow edges.',
        contentTypeNotes: {
            'sport-fashion': 'Gritty athleticism, documentary authenticity, high contrast drama, outdoor realism',
            'property': 'Architectural emphasis, texture revelation - CAUTION: can be unflattering',
            'music-video': 'Rock/punk energy, documentary feel, high fashion edge',
            'narrative': 'Confrontation scenes, documentary truth, interrogation, gritty realism',
            'fashion': 'High fashion edge, editorial drama, texture emphasis',
            'commercial': 'Documentary style, manufacturing - CAUTION: unflattering for people',
            'general': 'Intense and raw - nowhere to hide'
        }
    }
};

export const COLOR_TEMPERATURES: Record<string, { color: string; psychology: string; useFor: string[] }> = {
    'warm': {
        color: 'Orange/yellow (2700K-3500K)',
        psychology: 'Comfort, intimacy, sunset, nostalgia, safety, home',
        useFor: ['Home scenes', 'Romance', 'Memory/flashback', 'Cozy environments', 'Golden hour', 'Lifestyle warmth']
    },
    'neutral': {
        color: 'White (4000K-5000K)',
        psychology: 'Reality, present moment, clarity, professional, accuracy',
        useFor: ['Documentary', 'Corporate', 'Property accuracy', 'Product color accuracy', 'Professional standard']
    },
    'cool': {
        color: 'Blue (5500K-7500K)',
        psychology: 'Technology, cold, clinical, future, isolation, sadness',
        useFor: ['Sci-fi', 'Hospitals', 'Loneliness', 'Digital environments', 'Modern/minimalist', 'Innovation']
    }
};

// ============================================
// COMEDY TIMING KNOWLEDGE
// ============================================

export interface ComedyTimingRule {
    rule: string;
    explanation: string;
    application: string;
    shotRecommendation: string;
}

export const COMEDY_TIMING: Record<string, ComedyTimingRule> = {
    'reaction_hold': {
        rule: 'The 2-3 Second Rule',
        explanation: 'Brain needs 1-2 seconds to process unexpected information. Recognition triggers dopamine release.',
        application: 'After a joke/moment lands, HOLD on the reactor for 2-3 seconds. Audience needs to see someone else "get it".',
        shotRecommendation: 'MCU or CU of reactor, static camera, hold 2-3 seconds'
    },
    'rule_of_three': {
        rule: 'Rule of Three',
        explanation: 'Pattern: Setup (1) → Confirmation (2) → Subversion (3). Two items establish pattern, third breaks it.',
        application: 'A, A, B structure. Serious, serious, absurd. Build expectation then subvert.',
        shotRecommendation: 'Match shot sizes for items 1 & 2, vary for item 3'
    },
    'double_take': {
        rule: 'The Double Take',
        explanation: 'Classic comedy beat: see thing, look away, snap back, HOLD reaction.',
        application: '0.5s see → 0.5s away → 0.25s snap back → 2-3s HOLD',
        shotRecommendation: 'MS for the look, cut to CU for the take, hold the reaction'
    },
    'pregnant_pause': {
        rule: 'The Pregnant Pause',
        explanation: 'Cut TO the pause, not through it. Let discomfort build.',
        application: 'Static shot of waiting face. Audience anticipates release.',
        shotRecommendation: 'MCU, static, hold longer than comfortable (3-5 seconds)'
    }
};

// ============================================
// BEAT STRUCTURE KNOWLEDGE
// ============================================

export interface BeatStructureGuidance {
    beatType: string;
    purpose: string;
    feel: string;
    technique: string;
    visualApproach: string;
    duration: string;
}

export const BEAT_TYPES: Record<string, BeatStructureGuidance> = {
    'setup': {
        beatType: 'SETUP BEAT',
        purpose: 'Establish information audience needs later',
        feel: 'Can feel expository if not disguised',
        technique: 'Hide setup in character business/conflict',
        visualApproach: 'Wide establishing → Medium for detail',
        duration: 'Keep tight (3-5 sec)'
    },
    'development': {
        beatType: 'DEVELOPMENT BEAT',
        purpose: 'Progress plot or character forward',
        feel: 'Momentum, building',
        technique: 'Each beat escalates stakes slightly',
        visualApproach: 'Medium shots, gradual push-ins',
        duration: 'Varies - faster as tension builds (8-15 sec)'
    },
    'turning_point': {
        beatType: 'TURNING POINT BEAT',
        purpose: 'Major direction change',
        feel: 'Surprise, pivot, revelation',
        technique: 'Set up expectation, subvert it',
        visualApproach: 'Quick cut to tight shot for revelation',
        duration: 'Quick beat (2-3 sec), long aftermath'
    },
    'climax': {
        beatType: 'CLIMAX BEAT',
        purpose: 'Peak tension/emotion release',
        feel: 'Maximum intensity',
        technique: 'Everything built to this moment',
        visualApproach: 'Tightest shots, most dynamic movement',
        duration: 'Can extend - earned emotional release (10-20 sec)'
    },
    'resolution': {
        beatType: 'RESOLUTION BEAT',
        purpose: 'Return to stability (new normal)',
        feel: 'Release, completion, reflection',
        technique: 'Mirror opening in new context',
        visualApproach: 'Pull back to wider shots, slower pace',
        duration: 'Brief - don\'t overstay (3-8 sec)'
    }
};

// ============================================
// CONSISTENCY KNOWLEDGE
// ============================================

export interface ConsistencyTechnique {
    technique: string;
    purpose: string;
    implementation: string;
    priority: 'critical' | 'important' | 'helpful';
}

export const CONSISTENCY_TECHNIQUES: ConsistencyTechnique[] = [
    {
        technique: 'Anchor Phrase',
        purpose: 'Consistent character description in every prompt',
        implementation: 'Create exact phrase with distinctive features, use verbatim in ALL prompts',
        priority: 'critical'
    },
    {
        technique: 'Reference Coverage',
        purpose: 'Multiple angle references for consistent character',
        implementation: 'Generate: face front, 3/4 views, full body, key expressions',
        priority: 'critical'
    },
    {
        technique: 'Shot-Specific References',
        purpose: 'Use appropriate reference for shot type',
        implementation: 'CU = face ref, WS = body ref, Action = pose ref',
        priority: 'important'
    },
    {
        technique: 'Consistency Anchors',
        purpose: '3-5 unchangeable features for character ID',
        implementation: 'Hair (color/style), Eyes (color/shape), Skin tone, Signature wardrobe, Build',
        priority: 'critical'
    },
    {
        technique: 'Generation Batching',
        purpose: 'Group related shots for style consistency',
        implementation: 'All shots of Character A together, then Character B, etc.',
        priority: 'important'
    }
];

// ============================================
// PROMPT ENGINEERING KNOWLEDGE
// ============================================

export const PROMPT_STRUCTURE = {
    order: [
        { position: 1, element: 'STYLE/MOOD', description: 'Visual approach, lighting mood - sets overall tone first' },
        { position: 2, element: 'SHOT TYPE', description: 'Camera angle, shot size - establishes framing early' },
        { position: 3, element: 'SUBJECT', description: 'Character/product with anchors - gets weighted heavily' },
        { position: 4, element: 'ACTION', description: 'What\'s happening - clarifies the moment' },
        { position: 5, element: 'SETTING', description: 'Environment/location - provides context' },
        { position: 6, element: 'TECHNICAL', description: 'Lens, DoF, specific camera notes - refines execution' }
    ],
    principle: 'AI models read prompts linearly. Information at the beginning has highest weight.'
};

export const STYLE_DESCRIPTORS = {
    cinematic: [
        'Film grain, 35mm - organic, classic cinema feel',
        'Anamorphic lens flares - sci-fi, epic, premium',
        'Shallow depth of field - intimate, professional',
        'High contrast, desaturated - gritty, dramatic',
        'Soft, diffused lighting - romantic, beauty'
    ],
    photographic: [
        'Editorial photography - high fashion, intentional',
        'Documentary style - authentic, raw',
        'Product photography - clean, detailed, commercial',
        'Portrait photography - subject-focused, flattering',
        'Street photography - candid, urban, energetic'
    ],
    period: [
        '1970s film stock - warm, grainy, nostalgic',
        'Noir lighting - high contrast, shadows, mystery',
        'Wes Anderson symmetry - centered, pastel, precise',
        'Blade Runner aesthetic - neon, rain, cyberpunk',
        'Spielbergian warmth - golden hour, lens flares, wonder'
    ]
};

// ============================================
// CONTENT-TYPE AWARE QUERY FUNCTIONS
// ============================================

/**
 * Get content type guidance
 */
export function getContentTypeGuidance(contentType: ContentType): ContentTypeGuidance {
    return CONTENT_TYPE_GUIDANCE[contentType] || CONTENT_TYPE_GUIDANCE['general'];
}

/**
 * Get camera angle recommendation based on emotional intent AND content type
 */
export function getAngleForEmotion(
    emotion: string,
    contentType: ContentType = 'general'
): { guidance: CameraAngleGuidance | null; contextNote: string } {
    const emotionMap: Record<string, string> = {
        'power': 'low',
        'heroic': 'low',
        'dominant': 'low',
        'aspirational': 'low',
        'vulnerable': 'high',
        'weak': 'high',
        'small': 'high',
        'overview': 'high',
        'equal': 'eye',
        'neutral': 'eye',
        'conversational': 'eye',
        'trust': 'eye',
        'accurate': 'eye',
        'uneasy': 'dutch',
        'unsettling': 'dutch',
        'unstable': 'dutch',
        'energy': 'dutch',
        'omniscient': 'overhead',
        'detached': 'overhead',
        'godlike': 'overhead',
        'pattern': 'overhead'
    };

    const angleKey = emotionMap[emotion.toLowerCase()];
    const guidance = angleKey ? CAMERA_ANGLES[angleKey] : null;
    const contextNote = guidance?.contentTypeNotes[contentType] || '';

    // Check if angle is in avoid list for this content type
    const contentGuidance = getContentTypeGuidance(contentType);
    if (angleKey && contentGuidance.avoidList.includes(angleKey)) {
        return {
            guidance,
            contextNote: `⚠️ WARNING: ${angleKey} angle typically avoided for ${contentType}. ${contextNote}`
        };
    }

    return { guidance, contextNote };
}

/**
 * Get shot type recommendation based on emotional intensity
 */
export function getShotForIntensity(
    intensity: 'low' | 'medium' | 'high' | 'peak',
    contentType: ContentType = 'general'
): { guidance: ShotTypeGuidance; contextNote: string } {
    const intensityMap: Record<string, string> = {
        'low': 'WS',
        'medium': 'MS',
        'high': 'MCU',
        'peak': 'CU'
    };

    const guidance = SHOT_TYPES[intensityMap[intensity]];
    const contextNote = guidance.contentTypeNotes[contentType] || '';

    return { guidance, contextNote };
}

/**
 * Get lighting recommendation based on mood AND content type
 */
export function getLightingForMood(
    mood: string,
    contentType: ContentType = 'general'
): { guidance: LightingGuidance | null; contextNote: string } {
    const moodMap: Record<string, string> = {
        'happy': 'high_key',
        'optimistic': 'high_key',
        'safe': 'high_key',
        'trust': 'high_key',
        'transparent': 'high_key',
        'mysterious': 'low_key',
        'dramatic': 'low_key',
        'dangerous': 'low_key',
        'luxury': 'low_key',
        'premium': 'low_key',
        'romantic': 'soft',
        'beautiful': 'soft',
        'gentle': 'soft',
        'flattering': 'soft',
        'intense': 'hard',
        'harsh': 'hard',
        'confrontational': 'hard',
        'raw': 'hard',
        'gritty': 'hard'
    };

    const lightingKey = moodMap[mood.toLowerCase()];
    const guidance = lightingKey ? LIGHTING_MOODS[lightingKey] : null;
    const contextNote = guidance?.contentTypeNotes[contentType] || '';

    return { guidance, contextNote };
}

/**
 * Get beat structure guidance based on beat type
 */
export function getBeatGuidance(beatType: string): BeatStructureGuidance | null {
    const typeMap: Record<string, string> = {
        'setup': 'setup',
        'establish': 'setup',
        'intro': 'setup',
        'develop': 'development',
        'build': 'development',
        'progress': 'development',
        'turn': 'turning_point',
        'pivot': 'turning_point',
        'reveal': 'turning_point',
        'climax': 'climax',
        'peak': 'climax',
        'resolution': 'resolution',
        'conclude': 'resolution',
        'end': 'resolution'
    };

    const key = Object.keys(typeMap).find(k => beatType.toLowerCase().includes(k));
    return key ? BEAT_TYPES[typeMap[key]] : null;
}

/**
 * Get comedy timing recommendation
 */
export function getComedyTiming(beatContext: string): ComedyTimingRule | null {
    if (beatContext.includes('reaction')) return COMEDY_TIMING['reaction_hold'];
    if (beatContext.includes('three') || beatContext.includes('pattern')) return COMEDY_TIMING['rule_of_three'];
    if (beatContext.includes('double') || beatContext.includes('take')) return COMEDY_TIMING['double_take'];
    if (beatContext.includes('pause') || beatContext.includes('wait')) return COMEDY_TIMING['pregnant_pause'];
    return null;
}

/**
 * Build enhanced shot prompt with cinematographic knowledge AND content type context
 */
export function enhancePromptWithKnowledge(
    basePrompt: string,
    emotion: string,
    intensity: 'low' | 'medium' | 'high' | 'peak',
    mood: string,
    contentType: ContentType = 'general',
    isComedy: boolean = false
): string {
    const parts: string[] = [];
    const contentGuidance = getContentTypeGuidance(contentType);

    // Content type header
    parts.push(`=== CONTENT TYPE: ${contentType.toUpperCase()} ===`);
    parts.push(`Goals: ${contentGuidance.primaryGoals.join(', ')}`);
    parts.push('');

    // Get angle recommendation
    const { guidance: angle, contextNote: angleNote } = getAngleForEmotion(emotion, contentType);
    if (angle) {
        parts.push(`Camera: ${angle.angle} - ${angle.psychology}`);
        if (angleNote) parts.push(`Context: ${angleNote}`);
    }

    // Get shot type
    const { guidance: shot, contextNote: shotNote } = getShotForIntensity(intensity, contentType);
    parts.push(`Shot: ${shot.type} (${shot.shows}) - ${shot.emotionalImpact}`);
    parts.push(`Hold duration: ${shot.holdDuration}`);
    if (shotNote) parts.push(`Context: ${shotNote}`);

    // Get lighting
    const { guidance: lighting, contextNote: lightingNote } = getLightingForMood(mood, contentType);
    if (lighting) {
        parts.push(`Lighting: ${lighting.type} - ${lighting.psychology}`);
        parts.push(`Technical: ${lighting.technical}`);
        if (lightingNote) parts.push(`Context: ${lightingNote}`);
    }

    // Comedy timing notes
    if (isComedy) {
        parts.push(`Comedy note: Hold reactions 2-3 seconds. Cut TO pauses, not through them.`);
    }

    // Content type special considerations
    if (contentGuidance.specialConsiderations.length > 0) {
        parts.push('');
        parts.push(`Special considerations for ${contentType}:`);
        contentGuidance.specialConsiderations.forEach(note => {
            parts.push(`- ${note}`);
        });
    }

    return `=== CINEMATOGRAPHY GUIDANCE ===\n${parts.join('\n')}\n\n${basePrompt}`;
}

/**
 * Get full production guidance for a beat WITH CONTENT TYPE AWARENESS
 */
export function getProductionGuidanceForBeat(
    beatDescription: string,
    mood: string,
    contentType: ContentType = 'general',
    isComedy: boolean = false
): {
    contentTypeGuidance: ContentTypeGuidance;
    shotRecommendation: { guidance: ShotTypeGuidance; contextNote: string };
    angleRecommendation: { guidance: CameraAngleGuidance | null; contextNote: string };
    lightingRecommendation: { guidance: LightingGuidance | null; contextNote: string };
    beatStructure: BeatStructureGuidance | null;
    comedyTiming: ComedyTimingRule | null;
    consistencyTips: ConsistencyTechnique[];
    warnings: string[];
} {
    const contentTypeGuidance = getContentTypeGuidance(contentType);
    const warnings: string[] = [];

    // Analyze beat for intensity
    let intensity: 'low' | 'medium' | 'high' | 'peak' = 'medium';
    if (beatDescription.match(/climax|peak|reveal|confrontation|victory|achievement/i)) intensity = 'peak';
    else if (beatDescription.match(/tension|build|escalat|competition/i)) intensity = 'high';
    else if (beatDescription.match(/establish|setup|intro|overview/i)) intensity = 'low';

    // Analyze for emotion
    let emotion = 'neutral';
    if (beatDescription.match(/power|hero|triumph|victory|dominant/i)) emotion = 'power';
    else if (beatDescription.match(/vulnerable|defeat|small|weak/i)) emotion = 'vulnerable';
    else if (beatDescription.match(/uneasy|wrong|danger|chaos/i)) emotion = 'uneasy';
    else if (beatDescription.match(/trust|honest|authentic|accurate/i)) emotion = 'trust';

    const angleResult = getAngleForEmotion(emotion, contentType);
    const shotResult = getShotForIntensity(intensity, contentType);
    const lightingResult = getLightingForMood(mood, contentType);

    // Check for warnings
    if (angleResult.contextNote.includes('WARNING')) {
        warnings.push(angleResult.contextNote);
    }

    return {
        contentTypeGuidance,
        shotRecommendation: shotResult,
        angleRecommendation: angleResult,
        lightingRecommendation: lightingResult,
        beatStructure: getBeatGuidance(beatDescription),
        comedyTiming: isComedy ? getComedyTiming(beatDescription) : null,
        consistencyTips: CONSISTENCY_TECHNIQUES.filter(t => t.priority === 'critical'),
        warnings
    };
}
