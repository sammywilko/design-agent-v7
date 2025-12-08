# Script Director System - Implementation Plan

## Problem Statement

The Design Agent currently handles beats and entities well, but fails at the **shot level**. When a user inputs vague creative direction like "Forrest Gump feather type thing", the system doesn't know how to break that into specific, technically-accurate shots with proper camera angles, lighting, and composition.

### Current System Flow (What Exists)
```
Script Text → analyzeScript() → Beat[] with entity NAME arrays
                                  ↓
                     handleGenerateBeat() builds 7-layer prompt:
                     1. Mood Board Style DNA
                     2. Lookbook/Production Design
                     3. Beat Visual Summary (vague!)
                     4. Character injection (by name match)
                     5. Location injection (by name match)
                     6. Product injection (by name match)
                     7. Camera Language
                                  ↓
                     generateImage(prompt, refs, config)
```

### The Gap
Layer 3 (Beat Visual Summary) is where things fail. "Charming, Forrest Gump type thing" becomes `SHOT ACTION: Charming, Forrest Gump type thing` - the AI doesn't know this means 4 specific tracking shots.

## The Solution: Script Director

A three-layer intelligence system that transforms messy scripts into shot-level generation instructions.

---

## Architecture Overview

```
MESSY SCRIPT INPUT
       ↓
┌─────────────────────────────────────┐
│  LAYER 1: CHAOS PARSER              │
│  - Entity extraction & deduplication│
│  - Metaphor vs literal detection    │
│  - Vague direction interpretation   │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  LAYER 2: SHOT BREAKDOWN ENGINE     │ ← THE CRITICAL MISSING PIECE
│  - Beat → 5-15 specific shots       │
│  - Technical camera specs           │
│  - Composition & lighting notes     │
│  - Generation-ready prompts         │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  LAYER 3: SCENE COMPOSITOR          │
│  - Load assets from Bibles          │
│  - Apply scale/perspective          │
│  - Generate START + END frames      │
│  - Pass to video generation         │
└─────────────────────────────────────┘
       ↓
GENERATION-READY SHOT LIST
```

---

## Phase 1: Types & Data Structures

### New Types (add to types.ts)

```typescript
// Shot-level breakdown
interface Shot {
  id: string;
  beatId: string;
  sequence: number;

  // Technical specs
  shotType: 'extreme-wide' | 'wide' | 'medium' | 'close-up' | 'extreme-close-up' | 'aerial';
  cameraAngle: string;        // "eye-level", "high-angle", "low-angle", "overhead"
  cameraHeight: string;       // "5.5ft", "500ft aerial"
  cameraMovement: string;     // "static", "slow-push-in", "tracking-follow", "crane-up"
  duration: number;           // seconds

  // Composition
  composition: {
    foreground?: string;
    midground?: string;
    background?: string;
    depthOfField: 'shallow' | 'medium' | 'deep';
  };

  // Lighting
  lighting: {
    timeOfDay: string;
    quality: string;          // "soft", "harsh", "diffused"
    direction: string;        // "backlit", "side-lit", "front-lit"
    mood: string;
  };

  // Entity references
  entities: {
    characters: string[];     // IDs from Character Bible
    locations: string[];      // IDs from Location Bible
    products: string[];       // IDs from Product Bible
  };

  // Generation
  generationPrompt: string;   // Full prompt for AI generation
  styleReferences: string[];  // Reference image IDs to attach

  // Metadata
  priority: 'critical' | 'high' | 'medium' | 'low';
  notes?: string;
  transition?: string;        // "cut", "fade", "match-cut"
}

// Script analysis result
interface ScriptAnalysis {
  // Extracted entities (deduplicated)
  entities: {
    characters: ExtractedCharacter[];
    locations: ExtractedLocation[];
    products: ExtractedProduct[];
  };

  // Narrative structure
  narratives: {
    id: string;
    type: 'literal' | 'metaphorical';
    description: string;
  }[];

  // Beat breakdown
  beats: AnalyzedBeat[];

  // Production metadata
  production: {
    estimatedShots: number;
    estimatedDuration: number;
    estimatedCost: number;
    criticalAssets: string[];
  };

  // Questions for user (only critical ambiguities)
  clarifications: ClarificationQuestion[];
}

interface AnalyzedBeat {
  id: string;
  sequence: number;
  title: string;
  description: string;
  duration: number;

  // Shot breakdown
  shots: Shot[];

  // Entity usage
  entityUsage: {
    characters: string[];
    locations: string[];
    products: string[];
  };
}

interface ClarificationQuestion {
  id: string;
  type: 'entity-disambiguation' | 'visual-intent' | 'asset-source' | 'sensitivity';
  question: string;
  options?: string[];
  context: string;
  required: boolean;
}
```

---

## Phase 2: Script Director Service

### New File: services/scriptDirector.ts

```typescript
// Main analysis function
export async function analyzeScript(
  rawScript: string,
  existingBibles?: {
    characters: CharacterProfile[];
    locations: LocationProfile[];
    products: ProductProfile[];
  }
): Promise<ScriptAnalysis>

// Shot breakdown for a single beat
export async function breakdownBeatToShots(
  beatDescription: string,
  entities: { characters, locations, products },
  style?: ProductionDesign
): Promise<Shot[]>

// Generate composite prompt for a shot
export function buildShotPrompt(
  shot: Shot,
  characterRefs: CharacterProfile[],
  locationRefs: LocationProfile[],
  productRefs: ProductProfile[],
  style?: ProductionDesign
): string

// Interpret vague creative direction
export async function interpretCreativeDirection(
  vagueInput: string
): Promise<{
  shotSequence: ShotTemplate[];
  technicalNotes: string;
  referenceStyle: string;
}>
```

---

## Phase 3: UI Components

### New Component: ScriptDirectorModal.tsx

A modal workflow for script analysis:

1. **Input Step**: Paste/upload script
2. **Analysis Step**: Show extracted entities, beats, clarification questions
3. **Review Step**: Show shot breakdown per beat (editable)
4. **Import Step**: One-click import to Bibles + Storyboard

### Integration Points

- Add "Analyze Script" button in Script Studio
- Show shot breakdown in Beat cards
- Connect to existing generation pipeline

---

## Phase 4: Gemini Integration

### New Prompts in gemini.ts

1. **Entity Extraction Prompt**: Extract and deduplicate characters, locations, products from messy text
2. **Shot Breakdown Prompt**: Convert beat description into 5-15 technical shots
3. **Creative Interpretation Prompt**: Convert vague directions ("Forrest Gump feather") into specific shot sequences
4. **Composite Prompt Builder**: Combine shot specs + entity refs into generation prompt

---

## Implementation Order

### Step 1: Types (30 min)
- Add Shot, ScriptAnalysis, AnalyzedBeat, ClarificationQuestion to types.ts

### Step 2: Script Director Service Core (2 hours)
- Create services/scriptDirector.ts
- Implement analyzeScript() - entity extraction
- Implement breakdownBeatToShots() - shot-level breakdown
- Implement buildShotPrompt() - prompt composition

### Step 3: Gemini Prompts (1 hour)
- Add entity extraction prompt
- Add shot breakdown prompt
- Add creative interpretation prompt

### Step 4: UI - Script Director Modal (2 hours)
- Create ScriptDirectorModal.tsx
- Build multi-step workflow
- Add clarification question handling
- Add shot editing interface

### Step 5: Integration (1 hour)
- Connect to Script Studio
- Auto-populate Bibles from analysis
- Connect shots to beat generation

### Step 6: Testing & Refinement (1 hour)
- Test with EY script example
- Refine prompts based on results
- Polish UI

---

## Total Estimated Time: 7-8 hours

---

## Key Design Decisions

1. **Shot breakdown happens at analysis time**, not generation time - this gives user visibility and control

2. **Clarification questions are minimal** - only ask about truly ambiguous items (entity disambiguation, sensitive content)

3. **Existing Bible entries are respected** - if a character already exists, link to it rather than creating duplicate

4. **Prompts are composable** - shot prompts combine technical specs + entity DNA + style DNA

5. **Two-way editing** - user can modify shots before generation, or regenerate analysis

---

## Detailed Integration Points

Based on codebase exploration, here's exactly where Script Director hooks in:

### 1. Existing Beat Structure (types.ts line 209)
The Beat interface already has a `shots?: Shot[]` field - this is where we store the breakdown.

### 2. handleGenerateBeat Enhancement (App.tsx line 241)
Current flow builds prompt from `beat.visualSummary`. We intercept here to:
- Check if `beat.shots` exists
- If yes: generate per-shot instead of per-beat
- If no: fall back to existing behavior

### 3. Entity Name Matching Pattern
Current system uses NAME-based matching:
```typescript
const relevantChars = characters.filter(c => beat.characters?.includes(c.name));
```
Shot breakdown preserves this - each Shot stores entity NAMES, not IDs.

### 4. Smart Reference Selection (App.tsx lines 343-388)
Existing code maps shotType to reference category:
- 'CLOSE' → face refs
- 'WIDE' → fullBody refs
- 'MED' → threeQuarter refs

We enhance this with Shot.shotType for more precise selection.

### 5. Storage Location
Shots stored within Beat objects, which are part of ScriptData:
```typescript
ScriptData.beats[].shots[]
```
No new DB stores needed - piggybacks on existing scripts store.

---

## Questions to Confirm

1. Should shot breakdown be visible in the main Beat view, or only in a dedicated "Shot List" view?

2. For video generation, should we auto-generate end frames for each shot, or let user control?

3. How much technical camera detail should be exposed to users vs abstracted away?
