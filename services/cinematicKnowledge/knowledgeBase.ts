/**
 * Cinematic Knowledge Base
 *
 * Provides research-backed cinematography guidance for the Script Director.
 * Queries the knowledge base to enhance shot breakdowns with professional insights.
 */

// ============================================
// CAMERA ANGLE KNOWLEDGE
// ============================================

export interface CameraAngleGuidance {
    angle: string;
    psychology: string;
    useWhen: string[];
    avoidWhen: string[];
    technicalNotes: string;
}

export const CAMERA_ANGLES: Record<string, CameraAngleGuidance> = {
    'low': {
        angle: 'LOW ANGLE (Looking Up)',
        psychology: 'Power, dominance, heroism, threat - mimics child looking at adult',
        useWhen: ['Hero moments', 'Villain reveals', 'Empowerment beats', 'Product dominance'],
        avoidWhen: ['You want audience to relate to character as equal'],
        technicalNotes: 'Extreme low (worm\'s eye) = godlike/monumental. Slight low (15°) = confident/capable. Works best with wide lenses.'
    },
    'high': {
        angle: 'HIGH ANGLE (Looking Down)',
        psychology: 'Vulnerability, weakness, being observed, insignificance',
        useWhen: ['Character defeat', 'Loneliness', 'Overwhelming odds', 'Surveillance feeling'],
        avoidWhen: ['Character should feel strong or relatable'],
        technicalNotes: 'Extreme high (bird\'s eye) = ant-like/pattern recognition. Slight high (15°) = gentle observation.'
    },
    'eye': {
        angle: 'EYE LEVEL',
        psychology: 'Equality, relatability, neutrality, conversation - natural human interaction',
        useWhen: ['Dialogue', 'Documentary feel', 'Establishing character as "one of us"'],
        avoidWhen: [],
        technicalNotes: 'Most "honest" angle - no manipulation. Default when in doubt. Camera at 5\'6" - 5\'8" for standing adults.'
    },
    'dutch': {
        angle: 'DUTCH ANGLE (Tilted)',
        psychology: 'Unease, disorientation, something wrong, psychological instability',
        useWhen: ['Mental instability', 'Danger', 'Surreal moments', 'Transitions'],
        avoidWhen: ['You want comfortable viewing - overuse = amateur hour'],
        technicalNotes: '15-30° is subtle unease. 45° is maximum before stylization. Use sparingly - 1-2 per scene max.'
    },
    'overhead': {
        angle: 'OVERHEAD (Bird\'s Eye)',
        psychology: 'Omniscience, fate, patterns, disconnection',
        useWhen: ['Establishing geography', 'Choreography', 'God\'s-eye revelation', 'Death scenes'],
        avoidWhen: [],
        technicalNotes: 'Pure overhead (90°) = most detached. Slight angle (70-80°) = more narrative engagement.'
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
}

export const SHOT_TYPES: Record<string, ShotTypeGuidance> = {
    'EWS': {
        type: 'EXTREME WIDE SHOT',
        shows: 'Full environment, subject tiny or absent',
        emotionalImpact: 'Scale, loneliness, journey, epic scope',
        useWhen: ['Opening a scene/film', 'Showing journey/distance', 'Emphasizing character vs environment', 'Epic moments'],
        technicalNotes: 'Subject <10% of frame. Environment IS the subject. Often static or very slow movement.',
        holdDuration: '4-6 seconds'
    },
    'WS': {
        type: 'WIDE SHOT',
        shows: 'Full body + environment context',
        emotionalImpact: 'Context, physical action, spatial relationships',
        useWhen: ['Action sequences', 'Dance/movement', 'Character in their world', 'Group dynamics'],
        technicalNotes: 'Subject fills ~30-50% of frame height. Shows costume/wardrobe well.',
        holdDuration: '3-5 seconds'
    },
    'MWS': {
        type: 'MEDIUM WIDE SHOT (Cowboy)',
        shows: 'Head to mid-thigh',
        emotionalImpact: 'Casual observation, Western standoff energy',
        useWhen: ['Walking and talking', 'Showdowns', 'Fashion/outfit emphasis'],
        technicalNotes: 'Named for Westerns (shows holstered gun). Good transition between wide and medium.',
        holdDuration: '3-4 seconds'
    },
    'MS': {
        type: 'MEDIUM SHOT',
        shows: 'Head to waist',
        emotionalImpact: 'Conversational, engaged but not intimate',
        useWhen: ['Dialogue (default)', 'Interviews', 'Product demonstrations', 'Balanced emotion + context'],
        technicalNotes: 'Most versatile shot size. Shows gesture + expression. Safe choice when unsure.',
        holdDuration: '2-4 seconds'
    },
    'MCU': {
        type: 'MEDIUM CLOSE-UP',
        shows: 'Head and shoulders',
        emotionalImpact: 'Attention, importance, beginning of intimacy',
        useWhen: ['Important dialogue', 'Reaction shots', 'Introducing characters', 'Presentations'],
        technicalNotes: 'Cuts below shoulders, above chest. Most common shot in TV.',
        holdDuration: '2-3 seconds'
    },
    'CU': {
        type: 'CLOSE-UP',
        shows: 'Face fills frame',
        emotionalImpact: 'Intimacy, intensity, emotional peak, truth',
        useWhen: ['Emotional peaks', 'Lies/truth reveals', 'Critical decisions', 'Intimate moments'],
        technicalNotes: 'Eyes in upper third. Minimal headroom. Use sparingly for maximum impact.',
        holdDuration: '1-3 seconds'
    },
    'ECU': {
        type: 'EXTREME CLOSE-UP',
        shows: 'Single feature (eyes, lips, hands, object)',
        emotionalImpact: 'Hyper-focus, abstraction, detail, intensity',
        useWhen: ['Critical detail reveals', 'Product beauty shots', 'Psychological intensity', 'Sensory moments'],
        technicalNotes: 'Often macro lens territory. Can feel invasive - use intentionally.',
        holdDuration: '0.5-2 seconds'
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
}

export const LIGHTING_MOODS: Record<string, LightingGuidance> = {
    'high_key': {
        type: 'HIGH KEY',
        look: 'Minimal shadows, bright overall, soft contrast',
        psychology: 'Safety, optimism, clarity, openness, nothing to hide',
        useFor: ['Comedy', 'Corporate positivity', 'Product beauty', 'Children\'s content'],
        technical: 'Fill light near key intensity, soft sources, white/light backgrounds'
    },
    'low_key': {
        type: 'LOW KEY',
        look: 'Strong shadows, high contrast, selective illumination',
        psychology: 'Mystery, danger, drama, secrets, sophistication',
        useFor: ['Thriller/noir', 'Luxury products', 'Dramatic reveals', 'Villain scenes'],
        technical: 'Minimal fill, hard sources, dark backgrounds, motivated practicals'
    },
    'soft': {
        type: 'SOFT LIGHT',
        look: 'Gradual shadow transitions, diffused, flattering',
        psychology: 'Gentleness, beauty, romance, approachability, timelessness',
        useFor: ['Beauty/fashion', 'Romance', 'Interviews', 'Sensitive topics'],
        technical: 'Large sources, diffusion, bounce, overcast simulation'
    },
    'hard': {
        type: 'HARD LIGHT',
        look: 'Sharp shadows, defined edges, dramatic contrast',
        psychology: 'Intensity, truth, harshness, no escape, interrogation',
        useFor: ['Confrontation', 'Documentary truth', 'Gritty reality', 'High fashion edge'],
        technical: 'Small sources, minimal diffusion, Fresnel lenses'
    }
};

export const COLOR_TEMPERATURES: Record<string, { color: string; psychology: string; useFor: string[] }> = {
    'warm': {
        color: 'Orange/yellow (2700K-3500K)',
        psychology: 'Comfort, intimacy, sunset, nostalgia, safety',
        useFor: ['Home scenes', 'Romance', 'Memory/flashback', 'Cozy environments']
    },
    'neutral': {
        color: 'White (4000K-5000K)',
        psychology: 'Reality, present moment, clarity, professional',
        useFor: ['Documentary', 'Corporate', '"Normal" reality']
    },
    'cool': {
        color: 'Blue (5500K-7500K)',
        psychology: 'Technology, cold, clinical, future, isolation, sadness',
        useFor: ['Sci-fi', 'Hospitals', 'Loneliness', 'Digital environments']
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
        application: 'After a joke lands, HOLD on the reactor for 2-3 seconds. Audience needs to see someone else "get it".',
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
// QUERY FUNCTIONS
// ============================================

/**
 * Get camera angle recommendation based on emotional intent
 */
export function getAngleForEmotion(emotion: string): CameraAngleGuidance | null {
    const emotionMap: Record<string, string> = {
        'power': 'low',
        'heroic': 'low',
        'dominant': 'low',
        'vulnerable': 'high',
        'weak': 'high',
        'small': 'high',
        'equal': 'eye',
        'neutral': 'eye',
        'conversational': 'eye',
        'uneasy': 'dutch',
        'unsettling': 'dutch',
        'unstable': 'dutch',
        'omniscient': 'overhead',
        'detached': 'overhead',
        'godlike': 'overhead'
    };

    const angleKey = emotionMap[emotion.toLowerCase()];
    return angleKey ? CAMERA_ANGLES[angleKey] : null;
}

/**
 * Get shot type recommendation based on emotional intensity
 */
export function getShotForIntensity(intensity: 'low' | 'medium' | 'high' | 'peak'): ShotTypeGuidance {
    const intensityMap: Record<string, string> = {
        'low': 'WS',
        'medium': 'MS',
        'high': 'MCU',
        'peak': 'CU'
    };

    return SHOT_TYPES[intensityMap[intensity]];
}

/**
 * Get lighting recommendation based on mood
 */
export function getLightingForMood(mood: string): LightingGuidance | null {
    const moodMap: Record<string, string> = {
        'happy': 'high_key',
        'optimistic': 'high_key',
        'safe': 'high_key',
        'mysterious': 'low_key',
        'dramatic': 'low_key',
        'dangerous': 'low_key',
        'romantic': 'soft',
        'beautiful': 'soft',
        'gentle': 'soft',
        'intense': 'hard',
        'harsh': 'hard',
        'confrontational': 'hard'
    };

    const lightingKey = moodMap[mood.toLowerCase()];
    return lightingKey ? LIGHTING_MOODS[lightingKey] : null;
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
 * Build enhanced shot prompt with cinematographic knowledge
 */
export function enhancePromptWithKnowledge(
    basePrompt: string,
    emotion: string,
    intensity: 'low' | 'medium' | 'high' | 'peak',
    mood: string,
    isComedy: boolean = false
): string {
    const parts: string[] = [];

    // Get angle recommendation
    const angle = getAngleForEmotion(emotion);
    if (angle) {
        parts.push(`Camera: ${angle.angle} - ${angle.psychology}`);
    }

    // Get shot type
    const shot = getShotForIntensity(intensity);
    parts.push(`Shot: ${shot.type} (${shot.shows}) - ${shot.emotionalImpact}`);
    parts.push(`Hold duration: ${shot.holdDuration}`);

    // Get lighting
    const lighting = getLightingForMood(mood);
    if (lighting) {
        parts.push(`Lighting: ${lighting.type} - ${lighting.psychology}`);
        parts.push(`Technical: ${lighting.technical}`);
    }

    // Comedy timing notes
    if (isComedy) {
        parts.push(`Comedy note: Hold reactions 2-3 seconds. Cut TO pauses, not through them.`);
    }

    return `=== CINEMATOGRAPHY GUIDANCE ===\n${parts.join('\n')}\n\n${basePrompt}`;
}

/**
 * Get full production guidance for a beat
 */
export function getProductionGuidanceForBeat(
    beatDescription: string,
    mood: string,
    isComedy: boolean = false
): {
    shotRecommendation: ShotTypeGuidance;
    angleRecommendation: CameraAngleGuidance | null;
    lightingRecommendation: LightingGuidance | null;
    beatStructure: BeatStructureGuidance | null;
    comedyTiming: ComedyTimingRule | null;
    consistencyTips: ConsistencyTechnique[];
} {
    // Analyze beat for intensity
    let intensity: 'low' | 'medium' | 'high' | 'peak' = 'medium';
    if (beatDescription.match(/climax|peak|reveal|confrontation/i)) intensity = 'peak';
    else if (beatDescription.match(/tension|build|escalat/i)) intensity = 'high';
    else if (beatDescription.match(/establish|setup|intro/i)) intensity = 'low';

    // Analyze for emotion
    let emotion = 'neutral';
    if (beatDescription.match(/power|hero|triumph/i)) emotion = 'power';
    else if (beatDescription.match(/vulnerable|defeat|small/i)) emotion = 'vulnerable';
    else if (beatDescription.match(/uneasy|wrong|danger/i)) emotion = 'uneasy';

    return {
        shotRecommendation: getShotForIntensity(intensity),
        angleRecommendation: getAngleForEmotion(emotion),
        lightingRecommendation: getLightingForMood(mood),
        beatStructure: getBeatGuidance(beatDescription),
        comedyTiming: isComedy ? getComedyTiming(beatDescription) : null,
        consistencyTips: CONSISTENCY_TECHNIQUES.filter(t => t.priority === 'critical')
    };
}
