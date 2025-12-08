# Production Planning & Shot Optimization

## The Producer's Mindset
Maximize quality while minimizing waste. Every generation costs money and time - plan to get it right the first time.

## Shot List Optimization

### Priority Scoring System
Score each shot 1-5 on:
1. **Story Essential** (does narrative work without it?)
2. **Visual Impact** (does it add production value?)
3. **Character Clarity** (does it establish/develop character?)
4. **Reusability** (can it serve multiple purposes?)

**Priority = Sum of scores**
- 16-20: Critical (generate first)
- 11-15: Important (second pass)
- 6-10: Nice to have (if budget allows)
- 0-5: Cut it (doesn't earn its place)

### The Coverage Minimum
For any scene, minimum coverage:
1. **Establishing shot**: Where are we?
2. **Master/wide**: Full action
3. **Medium**: Character interaction
4. **Close-ups**: Emotional beats (one per key character)
5. **Insert**: Detail shot if needed

### Coverage Efficiency
Instead of shooting everything, identify:
- **Hero shots**: The money shots that sell the scene
- **Utility shots**: Connect the heroes
- **Safety shots**: Backup coverage if hero fails

## Asset Planning

### Character Asset Requirements
Before generating scenes, each character needs:
- **Face reference**: Clean, well-lit, multiple angles
- **Full body reference**: Costume, proportions, posture
- **Expression range**: Key emotions for the story
- **Action poses**: If character does physical business

### Location Asset Requirements
- **Establishing wide**: Full environment
- **Key angles**: 2-3 main shooting directions
- **Detail textures**: Materials, lighting character
- **Time of day variants**: If scenes span different times

### Product Asset Requirements
- **Hero beauty shot**: Clean, well-lit, detailed
- **Scale reference**: In context with hands/environment
- **Detail shots**: Texture, materials, branding
- **Action shots**: In use if relevant

## Generation Batching

### Why Batch?
- Consistent style across related shots
- Efficient use of reference images
- Reduced context-switching for AI
- Better character consistency

### Batching Strategy
Group shots by:
1. **Character**: All shots of Character A together
2. **Location**: All shots in Location B together
3. **Lighting setup**: All golden hour shots together
4. **Style**: All stylized/branded shots together

### Batch Size Recommendations
- **Character-heavy**: 3-5 shots per batch
- **Location-heavy**: 5-8 shots per batch
- **Mixed**: 3-4 shots per batch
- **Complex composition**: 1-2 shots per batch

## Production Schedule Template

### Phase 1: Asset Development (40% of time)
1. Create character sheets
2. Generate location establishing shots
3. Build product beauty shots
4. Develop style references

### Phase 2: Hero Shot Generation (35% of time)
1. Generate critical story beats
2. Create emotional peak moments
3. Produce money shots

### Phase 3: Coverage & Polish (25% of time)
1. Fill in connecting shots
2. Generate alternates/options
3. Handle any regenerations

## Quality Control Checkpoints

### Per-Shot QC
- [ ] Character consistency (face, costume, proportions)
- [ ] Location consistency (lighting, details)
- [ ] Composition serves story (framing, focus)
- [ ] Technical quality (no artifacts, proper resolution)
- [ ] Style match (color grade, texture)

### Per-Scene QC
- [ ] Coverage is complete
- [ ] Shots cut together logically
- [ ] Character continuity across shots
- [ ] Lighting continuity
- [ ] Story beats land

### Per-Project QC
- [ ] Style consistent throughout
- [ ] Character integrity maintained
- [ ] Story flows clearly
- [ ] Production value even across scenes

## Cost Estimation

### Per-Generation Costs
- Average generation: $0.03-0.05
- High-quality/complex: $0.08-0.12
- Multiple references: Add $0.02-0.03

### Project Estimation Formula
```
Total Generations =
  (Character sheets × 4) +
  (Location establishing × 3) +
  (Product beauty × 2) +
  (Story beats × shots per beat) +
  (Regeneration buffer: 20%)

Estimated Cost = Total Generations × $0.04
```

### Budget Allocation
- Asset development: 30%
- Hero shots: 45%
- Coverage: 15%
- Regeneration buffer: 10%

## Risk Mitigation

### Common Failure Points
1. **Character inconsistency**: Mitigate with strong references
2. **Style drift**: Mitigate with consistent prompts
3. **Composition issues**: Mitigate with specific framing instructions
4. **Technical artifacts**: Mitigate with QC checkpoints

### Recovery Strategies
- **Minor issues**: Regenerate with refined prompt
- **Character drift**: Return to reference, regenerate
- **Major issues**: Step back, rebuild asset reference
- **Systematic issues**: Audit prompt strategy, revise approach

## Efficient Revision Workflow

### Feedback Processing
1. Batch similar feedback (all "too dark" shots together)
2. Identify root cause (prompt issue? reference issue?)
3. Fix at source level, not per-shot
4. Regenerate in batches

### Iteration Rules
- First pass: Get 80% right
- Second pass: Fix systematic issues
- Third pass: Polish hero shots only
- After third pass: Accept or move on
