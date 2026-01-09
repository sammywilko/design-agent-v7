# Design Agent V9 Roadmap

**Created:** January 9, 2026
**Owner:** Sam Wilkinson, Channel Changers
**Status:** Planning → Implementation

---

## V8 Status Check (Completed Features)

| Feature | Status | Location |
|---------|--------|----------|
| Coverage Packs | ✅ Done | `components/CoverageModal.tsx` |
| Camera Controls/Stability | ✅ Done | `components/StageFour.tsx` |
| Batch Generation | ✅ Done | `services/batchGenerationService.ts` |
| useHistory Hook | ✅ Code exists | `hooks/useHistory.ts` (needs wiring) |
| Entity Extraction Stage | ❌ V9 | Blueprint in `v8-starter/docs/` |
| Scene Composition Stage | ❌ V9 | Blueprint in `v8-starter/docs/` |

---

## V9 Priority Features

### 🔥 P1: Asset Bank (Social Media Ready)

**Purpose:** Send liked images directly to Supabase asset bank for social media selection.

**User Story:**
> "I generate images, I like some, I want to save them to an asset bank that I can browse later when creating social content."

**Requirements:**
- [ ] One-click "Save to Asset Bank" button on generated images
- [ ] Supabase `asset_bank` table with metadata (project, tags, dimensions, created_at)
- [ ] Browse/filter interface for selecting assets
- [ ] Tags/categories for organization (character, location, product, hero shot, etc.)
- [ ] Thumbnail generation for fast browsing
- [ ] Export selected assets for social media

**Schema:**
```sql
CREATE TABLE asset_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT DEFAULT 'cc-internal-001',
  project_id TEXT,
  project_name TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Metadata
  entity_type TEXT, -- 'character', 'location', 'product', 'scene', 'hero'
  entity_name TEXT,
  tags TEXT[],

  -- Generation context
  prompt_used TEXT,
  model_used TEXT,
  generation_params JSONB,

  -- Social media tracking
  used_in_posts TEXT[], -- Track where asset was used
  is_favorite BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_bank_tenant ON asset_bank(tenant_id);
CREATE INDEX idx_asset_bank_entity_type ON asset_bank(entity_type);
CREATE INDEX idx_asset_bank_favorite ON asset_bank(is_favorite);
```

**Implementation:**
1. Add "Save to Bank" button in StageThree (Edit Canvas)
2. Create `assetBankService.ts` for Supabase operations
3. Add Asset Bank browser modal/panel
4. Connect to social media workflow

---

### 🔥 P2: Scheduled Tasks (Headless Execution)

**Purpose:** Run design operations on schedule using headless functions.

**User Story:**
> "I want to schedule batch generations, consistency checks, or social posts to run automatically."

**Requirements:**
- [ ] Connect to existing headless function infrastructure (built yesterday)
- [ ] Task types: batch generation, consistency check, asset cleanup, social post
- [ ] Cron-style scheduling
- [ ] Task history/logs
- [ ] Notifications on completion

**Task Types:**
```typescript
interface ScheduledTask {
  id: string;
  type: 'batch_generation' | 'consistency_check' | 'cleanup' | 'social_post';
  schedule: string; // cron expression
  payload: {
    projectId?: string;
    prompt?: string;
    targetPlatform?: string;
    // ... type-specific params
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  lastRun?: Date;
  nextRun?: Date;
}
```

**Implementation:**
1. Create `scheduledTaskService.ts`
2. Connect to headless function endpoints
3. Add task scheduler UI
4. Integrate with notification system

---

### 🔥 P3: Project Memory Context

**Purpose:** Persistent project context across sessions - never "forget" project state.

**User Story:**
> "When I come back to a project, I want the AI to remember all my characters, locations, style decisions, and past conversations."

**Requirements:**
- [ ] Supabase `project_memory` table
- [ ] Auto-save key decisions (character traits, style choices, corrections)
- [ ] Context injection into AI prompts
- [ ] Memory browser/editor
- [ ] Cross-session persistence

**Schema:**
```sql
CREATE TABLE project_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT DEFAULT 'cc-internal-001',
  project_id TEXT NOT NULL,

  -- Memory types
  memory_type TEXT, -- 'character', 'location', 'style', 'decision', 'correction'
  key TEXT NOT NULL,
  value JSONB NOT NULL,

  -- Context
  confidence FLOAT DEFAULT 1.0,
  source TEXT, -- 'user_input', 'ai_extraction', 'correction'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(project_id, memory_type, key)
);

CREATE INDEX idx_project_memory_project ON project_memory(project_id);
```

**Memory Examples:**
```json
// Character memory
{ "memory_type": "character", "key": "protagonist_hair", "value": { "color": "auburn", "style": "wavy, shoulder-length" } }

// Style decision
{ "memory_type": "style", "key": "lighting_preference", "value": { "type": "golden hour", "direction": "backlit" } }

// Correction
{ "memory_type": "correction", "key": "skin_tone", "value": { "original": "too pale", "corrected": "warm olive" } }
```

**Implementation:**
1. Create `projectMemoryService.ts`
2. Add memory extraction from AI responses
3. Inject memory into generation prompts
4. Add memory browser UI
5. Auto-save on key decisions

---

### ⚡ P4: Hybrid AI Routing

**Purpose:** Smart routing between Gemini (fast/cheap) and Claude (deep reasoning).

**User Story:**
> "Simple generation tasks should use Gemini. Complex analysis or consistency checks should use Claude."

**Requirements:**
- [ ] Query complexity detection
- [ ] Model-specific prompt optimization
- [ ] Automatic routing based on task type
- [ ] Manual override option

**Routing Logic:**
```typescript
// services/aiRouter.ts
type TaskType =
  | 'generate_image'      // → Gemini
  | 'generate_video'      // → Gemini (Veo)
  | 'analyze_consistency' // → Claude
  | 'extract_style_dna'   // → Claude
  | 'suggest_improvements'// → Claude
  | 'simple_edit'         // → Gemini
  | 'complex_reasoning';  // → Claude

const CLAUDE_INDICATORS = [
  'analyze', 'consistency', 'why', 'compare',
  'optimize', 'troubleshoot', 'explain', 'review',
  'suggest', 'improve', 'critique'
];
```

**Implementation:**
1. Create `aiRouter.ts` service
2. Add task classification logic
3. Integrate with existing geminiService
4. Add Claude service for reasoning tasks
5. Update Producer Chat to use router

---

### ⚡ P5: Wire useHistory Hook

**Purpose:** Enable undo/redo across all stages.

**Status:** Hook exists in `hooks/useHistory.ts`, needs integration.

**Requirements:**
- [ ] Wire into StageOne (Script)
- [ ] Wire into StageTwo (Concept)
- [ ] Wire into StageThree (Edit)
- [ ] Add undo/redo buttons to UI
- [ ] Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)

---

### 🎯 P6: Entity Extraction Stage (V8 Backlog)

**Purpose:** Upload real photos → AI extracts specs → Use for generation.

**From V8 Blueprint:**
- Upload product photos, reference images
- AI analyzes and extracts visual DNA
- Creates structured entity from upload
- Maintains consistency with real assets

**Implementation:** See `v8-starter/docs/V8-MASTER-BLUEPRINT.md`

---

### 🎯 P7: Scene Composition Stage (V8 Backlog)

**Purpose:** Multi-entity scene builder with AI verification.

**From V8 Blueprint:**
- Place multiple entities in scene
- AI suggests beat compositions
- Verify entity consistency before generation
- Camera move integration

**Implementation:** See `v8-starter/docs/V8-MASTER-BLUEPRINT.md`

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Create Supabase tables (asset_bank, project_memory)
- [ ] Implement `aiRouter.ts` with hybrid routing
- [ ] Wire useHistory hook into all stages

### Week 2: Asset Bank
- [ ] "Save to Bank" button implementation
- [ ] `assetBankService.ts` CRUD operations
- [ ] Asset browser UI
- [ ] Tagging system

### Week 3: Project Memory
- [ ] `projectMemoryService.ts` implementation
- [ ] Memory extraction from AI responses
- [ ] Context injection into prompts
- [ ] Memory browser UI

### Week 4: Scheduled Tasks
- [ ] Connect to headless function infrastructure
- [ ] `scheduledTaskService.ts` implementation
- [ ] Task scheduler UI
- [ ] Notification integration

### Week 5+: V8 Backlog
- [ ] Entity Extraction Stage
- [ ] Scene Composition Stage
- [ ] Polish and testing

---

## NOT Including (User Decision)

- ~~Cost tracking~~ - Not interested
- ~~Anti-AI voice filter~~ - Not needed
- ~~Postiz integration~~ - Eliminated

---

## Technical Notes

### Supabase Connection
Using existing tenant pattern: `tenant_id: 'cc-internal-001'`

### Headless Functions
Built yesterday - need to locate and integrate:
- Endpoint for scheduled execution
- Prompt-based posting capability

### Toast Notifications
Already implemented in v7 - ensure v9 inherits the system.

---

**Next Action:** Implement hybrid AI router → Create asset bank schema → Connect headless functions

---

*Last Updated: January 9, 2026*
