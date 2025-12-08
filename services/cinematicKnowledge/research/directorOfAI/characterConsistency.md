# Character Consistency Techniques

## The Challenge
AI image generation creates beautiful images but struggles with consistency across generations. A character can look like a different person in each shot. These techniques maximize consistency.

## The Reference Image Strategy

### Reference Image Quality Requirements
1. **Resolution**: Minimum 1024x1024 for face references
2. **Lighting**: Clean, even lighting (not stylized)
3. **Angle**: Front-facing or 3/4 view for primary reference
4. **Background**: Clean, non-distracting
5. **Expression**: Neutral for primary reference

### Reference Coverage System
For maximum consistency, generate these reference types:

#### Face References (Critical)
- **Primary**: Front-facing, neutral expression, clean lighting
- **3/4 Left**: Same lighting, slight turn
- **3/4 Right**: Mirror of 3/4 left
- **Profile**: If side shots needed

#### Expression References (Important)
- **Neutral**: Default state
- **Happy/Smile**: For positive beats
- **Concerned/Worried**: For tension
- **Angry/Intense**: For conflict
- *Only generate expressions that appear in your story*

#### Body References (Important)
- **Full body front**: Costume, proportions
- **Full body 3/4**: Movement pose
- **Action pose**: If character does physical business

### Reference Image Limitations
- Maximum useful references per generation: 3-4
- Beyond 4, AI may blend/confuse features
- Prioritize: 1 face + 1 body + 1 expression

## Prompt Engineering for Consistency

### The Anchor Phrase Technique
Create a consistent description phrase used in ALL prompts for that character:

**Example Anchor**:
"Maya, a 28-year-old woman with shoulder-length black wavy hair, warm brown eyes, light tan skin, wearing a burgundy blazer"

**Use this exact phrase** in every prompt featuring Maya.

### Consistency Anchors
Identify 3-5 unchangeable features:
1. **Hair**: Color, length, style, distinctive features
2. **Eyes**: Color, shape, distinctive elements
3. **Skin**: Tone, any distinctive marks
4. **Wardrobe**: Signature pieces that appear throughout
5. **Build**: Body type, height relative to others

### The Same-Seed Technique
When possible, use same random seed for related shots:
- Establishes baseline face structure
- Modify only pose/expression/framing
- Not all systems support this

## Shot-Specific Consistency Tips

### Close-Up Shots
- Use face reference at highest weight
- Include full anchor phrase
- Specify exact expression
- Avoid adding many additional elements

### Medium Shots
- Use body + face reference
- Reduce face weight slightly
- Add costume details to prompt
- Specify posture/gesture

### Wide Shots
- Body reference primary
- Face reference secondary (or omit)
- Focus on silhouette/posture
- Hair and costume are key identifiers

### Action Shots
- Use action pose reference if available
- Focus on distinctive silhouette
- May need to accept some face variation
- Hair movement is key identifier

## Multi-Character Scenes

### The Primary Subject Rule
- Designate ONE character as primary per shot
- Primary gets reference images
- Secondary characters described in prompt
- Avoid equal emphasis on multiple faces

### Character Differentiation
Make characters visually distinct:
- **Hair**: Different colors, lengths, styles
- **Coloring**: Contrasting skin tones if appropriate
- **Wardrobe**: Different color palettes
- **Build**: Different body types
- **Accessories**: Distinctive items (glasses, jewelry)

### Consistency Across Scenes
- Generate all shots of Character A before moving to B
- Use same references throughout
- Note any successful generations as new references

## Consistency Troubleshooting

### Problem: Face Keeps Changing
**Solutions**:
1. Use higher-quality face reference
2. Strengthen anchor phrase
3. Reduce other prompt complexity
4. Try different angle that matches reference

### Problem: Costume Changes
**Solutions**:
1. Include costume in every prompt explicitly
2. Use body reference showing full costume
3. Describe distinctive costume elements
4. Consider costume-focused reference image

### Problem: Character Looks Different in Profile
**Solutions**:
1. Generate profile reference image
2. Use profile reference for profile shots
3. Focus on hair and silhouette
4. Accept some variation in extreme angles

### Problem: Character Looks Different in Different Lighting
**Solutions**:
1. Generate lighting-specific reference
2. Describe lighting effect on features
3. Focus on structural features, not color
4. Use same lighting for related shots

## Character Sheet Best Practices

### What to Include
1. **Face grid**: Front, 3/4, profile (same image session)
2. **Full body**: Front and back
3. **Key expressions**: 3-4 needed for story
4. **Costume details**: Close-ups of distinctive elements
5. **Written description**: The anchor phrase

### Generation Order
1. Face (front) - this is your master reference
2. Face (angles) - based on front
3. Full body - incorporate face reference
4. Expressions - incorporate face reference
5. Character sheet - compile all

### Updating References
As you generate successful shots, add them to reference pool:
- Great face shot → New face reference
- Successful emotion → New expression reference
- Build reference library as you work
