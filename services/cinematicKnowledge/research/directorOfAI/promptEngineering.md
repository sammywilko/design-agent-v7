# Prompt Engineering Mastery

## The Fundamental Principle
AI models read prompts linearly. Information at the beginning has highest weight. Structure prompts strategically.

## Prompt Priority Order

### Standard Shot Prompt Structure
```
1. [STYLE/MOOD] - Visual approach, lighting mood
2. [SHOT TYPE] - Camera angle, shot size
3. [SUBJECT] - Character/product with anchors
4. [ACTION] - What's happening
5. [SETTING] - Environment/location
6. [TECHNICAL] - Lens, DoF, specific camera notes
```

### Why This Order Works
- Style sets overall tone first
- Shot type establishes framing early
- Subject gets weighted heavily (usually most important)
- Action clarifies the moment
- Setting provides context
- Technical refines execution

## Style Descriptors That Work

### Cinematic Looks
- **Film grain, 35mm**: Organic, classic cinema feel
- **Anamorphic lens flares**: Sci-fi, epic, premium
- **Shallow depth of field**: Intimate, professional
- **High contrast, desaturated**: Gritty, dramatic
- **Soft, diffused lighting**: Romantic, beauty

### Photographic Styles
- **Editorial photography**: High fashion, intentional
- **Documentary style**: Authentic, raw
- **Product photography**: Clean, detailed, commercial
- **Portrait photography**: Subject-focused, flattering
- **Street photography**: Candid, urban, energetic

### Period/Genre Looks
- **1970s film stock**: Warm, grainy, nostalgic
- **Noir lighting**: High contrast, shadows, mystery
- **Wes Anderson symmetry**: Centered, pastel, precise
- **Blade Runner aesthetic**: Neon, rain, cyberpunk
- **Spielbergian warmth**: Golden hour, lens flares, wonder

## Technical Specifications That Work

### Lens Descriptions
- **24mm wide angle**: Expansive, environmental
- **35mm**: Cinematic standard, balanced
- **50mm**: Natural eye perspective
- **85mm portrait**: Flattering, compressed background
- **200mm telephoto**: Compressed, surveillance feel

### Depth of Field
- **f/1.4 shallow DoF**: Background creamy blur
- **f/2.8 medium DoF**: Subject sharp, background soft
- **f/8 deep focus**: Everything sharp, landscape
- **Bokeh**: Explicitly request for blurred lights

### Lighting Descriptions
- **Rembrandt lighting**: Triangle under eye, classical
- **Split lighting**: Half face lit, dramatic
- **Butterfly lighting**: Overhead, beauty standard
- **Backlit with rim**: Separation, ethereal
- **Practical lighting**: Motivated by in-scene sources

## Subject Description Techniques

### Character Descriptions
**Do**:
- Lead with distinctive features
- Use consistent anchor phrases
- Describe current expression/pose
- Reference wardrobe consistently

**Don't**:
- Use celebrity comparisons (often blocked)
- Describe features that conflict with reference
- Over-describe common features
- Contradict reference images

### Action Descriptions
**Strong verbs**: Running, leaping, crouching, embracing, confronting
**Weak verbs**: Going, doing, being, having
**Specific beats**: "turning to face the camera" not "turning"

### Environment Descriptions
- Lead with lighting condition
- Include key set pieces
- Describe atmosphere/mood
- Mention depth (foreground/background elements)

## Negative Prompts (What to Exclude)

### Common Negative Prompt Items
- blurry, out of focus (unless intentional)
- distorted, deformed
- extra limbs, missing fingers
- text, watermark, logo
- cartoon, anime (unless desired)
- oversaturated, HDR look

### When to Use Negative Prompts
- Fighting against common AI tendencies
- Preventing specific unwanted elements
- Refining after initial generation

## Prompt Templates by Shot Type

### Close-Up Character
```
[Cinematic portrait, 85mm lens, shallow depth of field]
[Close-up shot, eye level]
[CHARACTER ANCHOR with EXPRESSION]
[Looking DIRECTION, subtle EMOTION]
[LIGHTING QUALITY from DIRECTION]
[Background softly blurred, BACKGROUND ELEMENTS]
```

### Wide Establishing
```
[Cinematic wide shot, 24mm lens, deep focus]
[Wide establishing shot, EYE HEIGHT eye level/slightly elevated]
[LOCATION DESCRIPTION]
[TIME OF DAY, WEATHER/ATMOSPHERE]
[CHARACTER if visible: small in frame, POSITION in environment]
[LIGHTING: natural/artificial, QUALITY, DIRECTION]
```

### Product Beauty
```
[Commercial product photography, clean and modern]
[SHOT SIZE of PRODUCT]
[PRODUCT centered/POSITION in frame]
[SURFACE/BACKGROUND description]
[LIGHTING: soft/dramatic, creating EFFECT on materials]
[DETAIL: showing SPECIFIC FEATURES]
```

### Action Shot
```
[Dynamic cinematic shot, motion blur on background]
[SHOT SIZE, ANGLE capturing movement]
[CHARACTER ANCHOR in ACTION POSE]
[MID-ACTION description: SPECIFIC MOMENT]
[Environment MOTION indicators]
[LIGHTING: dramatic/natural appropriate to action]
```

## Iterative Refinement

### First Pass: Structure
- Get composition right
- Establish basic scene
- Confirm character presence

### Second Pass: Mood
- Refine lighting
- Adjust color/atmosphere
- Enhance emotional tone

### Third Pass: Detail
- Specific expressions
- Background elements
- Technical refinements

### When to Start Over
- Character completely wrong
- Composition fundamentally off
- Style significantly mismatched
- After 3 iterations without improvement

## Common Prompt Mistakes

### Overloading
- Too many subjects = confusion
- Too many style descriptors = muddy result
- Too much detail = AI picks and chooses
- Fix: Simplify, prioritize

### Underspecifying
- "Person in room" = generic result
- Missing lighting = AI defaults
- No camera info = random framing
- Fix: Add specific technical direction

### Contradicting
- "Dark and bright" = confusion
- Reference shows X, prompt says Y
- Multiple subjects with equal weight
- Fix: Be consistent, prioritize

### Wrong Priority
- Burying important info at end
- Style after subject
- Technical before subject
- Fix: Use standard priority order
