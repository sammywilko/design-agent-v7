/**
 * Scout (Know-It-All) Knowledge Base
 * Comprehensive documentation for the AI assistant to guide users through the app
 */

export const SCOUT_APP_KNOWLEDGE = `
=== DESIGN AGENT 8.0 COMPLETE GUIDE ===

## NAVIGATION STRUCTURE

### Main Stages (Left Sidebar)
- **Stage 0 - Script Studio** (STAGE_0_SCRIPT): Write/import scripts, manage beats, access World Bible
- **Stage 1 - Concept Lab** (STAGE_1_CONCEPT): Generate concept images with AI
- **Stage 2 - Edit Canvas** (STAGE_2_EDITING): Refine images with masking, relighting, style changes
- **Stage 3 - Storyboard** (STAGE_3_STORYBOARD): Arrange final shot sequence
- **Stage 4 - Video Lab** (STAGE_4_VIDEO): Generate video clips with Veo

### Script Studio Tabs
- **Script Tab** (script): Write/paste screenplay, brain dump import
- **Characters Tab** (characters): Character Bible with face/body refs, turnaround sheets, expression banks
- **Locations Tab** (locations): Location Bible with environment refs, time of day, textures
- **Products Tab** (products): Product Bible with hero shots, detail refs
- **Design Tab** (design): Lookbook, color palette, camera rig settings

## WORLD BIBLE SYSTEM

### Characters
- **Face References**: Front, 3/4, profile views for close-ups
- **Full Body References**: For wide shots, shows costume/proportions
- **3/4 References**: For medium shots
- **Action References**: For dynamic poses
- **Turnaround Sheet**: Auto-generate front/back/side views
- **Expression Bank**: Generate 6 core emotions (happy, sad, angry, surprised, neutral, concerned)
- **Prompt Snippet**: Auto-generated or custom description for AI consistency

### Locations
- **Reference Images**: Upload environment/set photos
- **Time of Day**: Morning, afternoon, golden hour, night, etc.
- **Weather/Mood**: Clear, rainy, foggy, dramatic, etc.
- **Master Plate**: Primary establishing shot
- **Texture Pack**: Material/surface references
- **Coverage Pack**: Auto-generate multiple angles

### Products
- **Reference Images**: Product photos from multiple angles
- **Hero Shot**: Primary beauty shot
- **Detail Refs**: Close-ups of textures, logos, features
- **Scale Context**: In-hand or environment shots
- **Prompt Snippet**: Product description for AI

## LOOKBOOK & CAMERA RIG

### Lookbook
- **Style DNA**: Overall visual approach (cinematic, documentary, commercial, etc.)
- **Color Palette**: Primary, secondary, accent colors
- **Lighting Approach**: High-key, low-key, natural, stylized
- **Reference Images**: Mood board for style consistency

### Virtual Camera Rig
- **Focal Length**: 24mm (wide) to 200mm (telephoto)
- **Aperture**: f/1.4 (shallow DoF) to f/16 (deep focus)
- **Color Temperature**: 2700K (warm) to 7500K (cool)
- **Film Stock**: Various film emulation options

## GENERATION FEATURES

### Concept Lab Tools
- **Prompt Enhancer**: Type simple idea, AI rewrites as studio-grade prompt
- **Power Tools**: Specialized templates (Product Hero, Character Sheet, Blueprint)
- **Sequence Generator**: 2x2 cinematic grid (Wide → Medium → Close → Resolution)
- **Reference Slots**: Up to 14 reference images per generation

### @Mention System
- Type @ to reference World Bible entities
- Examples: "@John walks into @CoffeeShop holding @ProductX"
- Auto-injects visual DNA and references

### Shot Coverage Types
- **Cinematic 9-Shot**: Complete scene coverage
- **12-Shot Grid**: Extended coverage options
- **Dialogue Pack**: Conversation coverage (OTS, singles, two-shots)
- **Action Pack**: Dynamic movement sequences

## EDIT CANVAS FEATURES

### Quick Edit Dropdowns
- **Enhance**: Brightness, contrast, saturation, sharpen, HDR
- **Style**: Cyberpunk, watercolor, anime, film noir, vintage, etc.
- **Rotate**: 15°, 45°, 90°, bird's eye, worm's eye
- **Lighting**: Golden hour, rim light, studio, neon, dramatic

### AI Edits (Natural Language)
Examples of what users can type:
- "Make the sky darker and more dramatic"
- "Remove the person in the background"
- "Change her shirt from blue to red"
- "Add rain and wet streets"
- "Add @John from World Bible to the scene"

### Advanced Tools
- **Masking Brush**: Paint over area, type what you want changed
- **Shot Coverage**: Generate Close-up, Wide, Drone angles from canvas
- **Style Match**: Drag reference to copy lighting/vibe
- **Stack Mode**: Layer multiple non-destructive edits
- **Quick Actions**: Remove BG, Remove Crowd, Text Fix, 4K Upscale

## STORYBOARD FEATURES

- **Drag-and-Drop**: Reorder shots in sequence
- **AI Transitions**: Click between frames for auto camera movement
- **Auto-Caption**: AI writes action description from image
- **Send to Video**: One-click to Video Lab

## VIDEO LAB FEATURES (Veo 3.1)

- **Auto-End Frame**: Pick start frame + camera move, AI builds destination
- **Character Ingredients**: Drag character refs for consistency
- **Auto-Write Prompt**: AI writes technical video prompt
- **Audio Generation**: Native audio support

## BEST PRACTICES

### Character Consistency
1. Create character in World Bible FIRST
2. Use Photo→Character for real people
3. @mention in every prompt
4. Lock in Contact Sheet for coverage
5. Generate turnaround + expression bank

### Prompt Structure (Priority Order)
1. [STYLE/MOOD] - Visual approach, lighting
2. [SHOT TYPE] - Camera angle, shot size
3. [SUBJECT] - Character with @mentions
4. [ACTION] - What's happening
5. [SETTING] - Environment/location
6. [TECHNICAL] - Lens, DoF, camera notes

### Cost Optimization
- Use Contact Sheet for batch generation (most efficient)
- Generate concepts FIRST, refine later
- Edit Canvas cheaper than regenerating
- Build World Bible once, reference everywhere
- Lock references to avoid inconsistent generations

## TROUBLESHOOTING

### "Character looks different in every shot"
→ Add to World Bible with @mention in every prompt
→ Lock in Contact Sheet reference system
→ Use Photo→Character for best consistency

### "Reference image isn't affecting generation"
→ Enable "Lock Visual Style" checkbox
→ Ensure reference is clear and high quality
→ Add specific style description to match

### "Style keeps changing"
→ Lock visual style in Contact Sheet
→ Use consistent prompt language
→ Reference previous successful generations

### "Generation failed or looks wrong"
→ Simplify prompt (remove conflicting instructions)
→ Check if safety filters triggered
→ Break into smaller steps

## KEYBOARD SHORTCUTS
- Hover images: See action buttons
- Click thumbnails: Full preview
- Drag in Storyboard: Reorder shots
- @mention: Reference Bible entities
`;

export const SCOUT_NAVIGATION_ACTIONS = `
=== ACTION COMMANDS ===

When helping users, you can emit ACTION COMMANDS to navigate or highlight UI elements.
Format your response with these commands at the END of your message:

### Navigation Commands
[ACTION:NAVIGATE:STAGE_0_SCRIPT] - Go to Script Studio
[ACTION:NAVIGATE:STAGE_1_CONCEPT] - Go to Concept Lab
[ACTION:NAVIGATE:STAGE_2_EDITING] - Go to Edit Canvas
[ACTION:NAVIGATE:STAGE_3_STORYBOARD] - Go to Storyboard
[ACTION:NAVIGATE:STAGE_4_VIDEO] - Go to Video Lab

### Tab Navigation (within Script Studio)
[ACTION:NAVIGATE:TAB_SCRIPT] - Script tab
[ACTION:NAVIGATE:TAB_CHARACTERS] - Character Bible tab
[ACTION:NAVIGATE:TAB_LOCATIONS] - Location Bible tab
[ACTION:NAVIGATE:TAB_PRODUCTS] - Product Bible tab
[ACTION:NAVIGATE:TAB_DESIGN] - Design/Lookbook tab

### Highlight Commands
[ACTION:HIGHLIGHT:add-character-btn] - Highlight Add Character button
[ACTION:HIGHLIGHT:prompt-enhancer] - Highlight Prompt Enhancer
[ACTION:HIGHLIGHT:world-bible-section] - Highlight World Bible section
[ACTION:HIGHLIGHT:reference-slots] - Highlight reference image slots
[ACTION:HIGHLIGHT:generate-btn] - Highlight Generate button

### Usage Rules
1. Only use ONE action per response
2. Place action at the END of your message
3. Explain what you're doing before the action
4. Don't use actions for simple informational responses
5. Use navigation when guiding user to a specific location
6. Use highlight to draw attention to a specific element

### Example Response with Action
"To add a new character, go to the Character Bible tab and click the Add Character button. I'll take you there now.

[ACTION:NAVIGATE:TAB_CHARACTERS]"
`;

export const SCOUT_PROMPT_ENGINEERING = `
=== PROMPT ENGINEERING MASTERY ===

## Prompt Priority Order
1. [STYLE/MOOD] - Visual approach, lighting mood
2. [SHOT TYPE] - Camera angle, shot size
3. [SUBJECT] - Character/product with @mentions
4. [ACTION] - What's happening
5. [SETTING] - Environment/location
6. [TECHNICAL] - Lens, DoF, specific camera notes

## Style Descriptors That Work

### Cinematic Looks
- Film grain, 35mm: Organic, classic cinema feel
- Anamorphic lens flares: Sci-fi, epic, premium
- Shallow depth of field: Intimate, professional
- High contrast, desaturated: Gritty, dramatic
- Soft, diffused lighting: Romantic, beauty

### Technical Specifications
- 24mm wide angle: Expansive, environmental
- 35mm: Cinematic standard, balanced
- 50mm: Natural eye perspective
- 85mm portrait: Flattering, compressed background
- f/1.4 shallow DoF: Background creamy blur
- f/8 deep focus: Everything sharp

### Lighting Descriptions
- Rembrandt lighting: Triangle under eye, classical
- Split lighting: Half face lit, dramatic
- Butterfly lighting: Overhead, beauty standard
- Backlit with rim: Separation, ethereal
- Practical lighting: Motivated by in-scene sources

## Common Prompt Mistakes

### Overloading
- Too many subjects = confusion
- Too many style descriptors = muddy result
- Fix: Simplify, prioritize

### Underspecifying
- "Person in room" = generic result
- Missing lighting = AI defaults
- Fix: Add specific technical direction

### Contradicting
- "Dark and bright" = confusion
- Reference shows X, prompt says Y
- Fix: Be consistent, prioritize
`;

export const SCOUT_CHARACTER_CONSISTENCY = `
=== CHARACTER CONSISTENCY TECHNIQUES ===

## Reference Image Strategy

### Quality Requirements
1. Resolution: Minimum 1024x1024 for face references
2. Lighting: Clean, even lighting (not stylized)
3. Angle: Front-facing or 3/4 view for primary reference
4. Background: Clean, non-distracting
5. Expression: Neutral for primary reference

### Reference Coverage System
- Face References: Front, 3/4 left, 3/4 right, profile
- Expression References: Neutral, happy, concerned, angry
- Body References: Full body front, full body 3/4, action pose

### The Anchor Phrase Technique
Create consistent description for EVERY prompt:
"Maya, a 28-year-old woman with shoulder-length black wavy hair, warm brown eyes, light tan skin, wearing a burgundy blazer"

Use this EXACT phrase in every prompt featuring Maya.

## Troubleshooting

### Face Keeps Changing
1. Use higher-quality face reference
2. Strengthen anchor phrase
3. Reduce other prompt complexity
4. Match angle to reference

### Costume Changes
1. Include costume in every prompt
2. Use body reference showing full costume
3. Describe distinctive costume elements

### Different in Profile
1. Generate profile reference image
2. Use profile reference for profile shots
3. Focus on hair and silhouette
`;

export const FULL_SCOUT_KNOWLEDGE = `
${SCOUT_APP_KNOWLEDGE}

${SCOUT_NAVIGATION_ACTIONS}

${SCOUT_PROMPT_ENGINEERING}

${SCOUT_CHARACTER_CONSISTENCY}
`;
