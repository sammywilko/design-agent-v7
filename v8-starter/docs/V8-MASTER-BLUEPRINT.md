# Design Agent v8 - Master Blueprint
## Everything You Need to Build v8 from v7

**Date:** December 8, 2025  
**Strategy:** Preserve v7 stability, add gems incrementally  
**Goal:** Production-ready platform in 7 weeks

---

## 🎯 Development Strategy

### Option: Side-by-Side Development ✅ RECOMMENDED

```
/design-agent
  /v7                    ← Keep this stable, don't touch
    /src
    /components
    package.json
    
  /v8                    ← New development branch
    /src
      /components
        /v7-preserved    ← Copy working v7 components
        /v8-new         ← Add new features
      /services
        /v7-core        ← Copy working v7 services
        /v8-enhanced    ← Enhanced + new services
    package.json         ← New dependencies
    
  README.md             ← Document both versions
```

**Benefits:**
- ✅ v7 stays working (production safety net)
- ✅ v8 can break/iterate freely
- ✅ Easy to compare implementations
- ✅ Can demo either version
- ✅ Gradual migration when ready

---

## 📦 What Carries Over from v7 (Copy As-Is)

### ✅ KEEP EXACTLY (Working Great):

```typescript
// Core Architecture
/types
  ├─ entities.ts              ✅ Copy exactly
  ├─ storyboard.ts            ✅ Copy exactly
  └─ worldBible.ts            ✅ Copy exactly

// Stage Components (Base)
/components
  ├─ Stage1-ScriptStudio.tsx  ✅ Copy exactly
  ├─ Stage4-Storyboard.tsx    ✅ Copy exactly (enhance later)
  └─ Layout.tsx               ✅ Copy exactly

// Services (Core)
/services
  ├─ indexedDBService.ts      ✅ Copy exactly
  ├─ geminiService.ts         ✅ Copy as base, enhance
  └─ projectService.ts        ✅ Copy exactly

// Utilities
/utils
  ├─ @mention parsing         ✅ Copy exactly
  ├─ export functions         ✅ Copy exactly
  └─ validation              ✅ Copy exactly

// State Management
/store or /context            ✅ Copy exactly
```

### 🔧 ENHANCE (Keep Base, Add Features):

```typescript
// These work in v7, but we'll add gems
/components
  ├─ Stage2-ConceptGeneration.tsx  🔧 Enhance
  │  ├─ Keep: Character/Product/Location creation
  │  └─ Add: Upload analysis, structured input
  │
  ├─ Stage3-EditCanvas.tsx         🔧 Enhance
  │  ├─ Keep: Basic editing
  │  └─ Add: Lighting controls, camera params
  │
  └─ Stage5-VideoStudio.tsx        🔧 Enhance
     ├─ Keep: Basic Veo generation
     └─ Add: Camera moves, stability, polling UI

/services
  └─ geminiService.ts               🔧 Enhance
     ├─ Keep: All existing functions
     └─ Add: Batch generation, graceful errors
```

---

## 🆕 What's Completely New in v8

### NEW STAGES:

```typescript
/components/v8-new
  ├─ Stage1.5-EntityExtraction
  │  ├─ EntityExtractionStage.tsx
  │  ├─ AssetUploader.tsx
  │  ├─ AssetAnalyzer.tsx
  │  └─ SpecEditor.tsx
  │
  ├─ Stage2.5-CoverageGeneration
  │  ├─ CoverageGenerationStage.tsx
  │  ├─ PackSelector.tsx
  │  ├─ BatchProgress.tsx
  │  └─ CoverageLibraryViewer.tsx
  │
  └─ Stage2.75-SceneComposition
     ├─ SceneComposer.tsx
     ├─ MultiEntityComposer.tsx
     ├─ CompositionVerifier.tsx
     └─ HybridPreview.tsx
```

### NEW SERVICES:

```typescript
/services/v8-enhanced
  ├─ assetAnalysisService.ts       🆕 AI photo analysis
  ├─ coverageGenerationService.ts  🆕 Pack-based generation
  ├─ sceneCompositionService.ts    🆕 Multi-entity composition
  ├─ batchGenerationService.ts     🆕 Parallel batching
  └─ productionMetadataService.ts  🆕 Auto-generated notes
```

### NEW TYPES:

```typescript
/types/v8-new
  ├─ coverage.ts              🆕 Coverage packs & libraries
  ├─ composition.ts           🆕 Scene composition
  ├─ analysis.ts              🆕 AI spec extraction
  └─ enhanced-entities.ts     🆕 Extended entity types
```

### NEW HOOKS:

```typescript
/hooks/v8-new
  ├─ useHistory.ts            🆕 Undo/redo system
  ├─ useBatchGeneration.ts    🆕 Batch state management
  ├─ useCoverageLibrary.ts    🆕 Coverage library state
  └─ useComposition.ts        🆕 Composition state
```

### NEW CONSTANTS:

```typescript
/constants/v8-new
  ├─ coveragePacks.ts         🆕 Pack definitions
  ├─ cameraMoves.ts           🆕 Move templates
  └─ atmospherePresets.ts     🆕 Time/weather options
```

---

## 🏗️ v8 Project Structure

```
/design-agent-v8
  /src
    /components
      /v7-preserved          ← Copy from v7, don't modify
        ├─ Stage1-ScriptStudio.tsx
        ├─ Stage4-Storyboard.tsx
        └─ Layout.tsx
        
      /v7-enhanced          ← Copy from v7, enhance with gems
        ├─ Stage2-ConceptGeneration.tsx
        ├─ Stage3-EditCanvas.tsx
        └─ Stage5-VideoStudio.tsx
        
      /v8-new               ← Brand new components
        ├─ Stage1.5-EntityExtraction/
        ├─ Stage2.5-CoverageGeneration/
        ├─ Stage2.75-SceneComposition/
        └─ shared/
        
    /services
      /v7-core              ← Copy from v7
        ├─ indexedDBService.ts
        └─ projectService.ts
        
      /v7-enhanced          ← Enhance from v7
        └─ geminiService.ts
        
      /v8-new               ← Brand new services
        ├─ assetAnalysisService.ts
        ├─ coverageGenerationService.ts
        ├─ sceneCompositionService.ts
        └─ batchGenerationService.ts
        
    /types
      /v7-preserved         ← Copy from v7
        ├─ entities.ts
        └─ storyboard.ts
        
      /v8-new               ← New types
        ├─ coverage.ts
        ├─ composition.ts
        └─ analysis.ts
        
    /hooks
      /v8-new
        ├─ useHistory.ts
        ├─ useBatchGeneration.ts
        └─ useCoverageLibrary.ts
        
    /constants
      /v8-new
        ├─ coveragePacks.ts
        ├─ cameraMoves.ts
        └─ atmospherePresets.ts
        
    /utils
      /v7-preserved         ← Copy from v7
        ├─ mentionParsing.ts
        └─ exports.ts
        
      /v8-new
        └─ batchHelpers.ts
        
    App.tsx                 🆕 New app with v8 routing
    main.tsx
    
  package.json              🆕 New dependencies
  tsconfig.json
  vite.config.ts
  README-V8.md              📝 v8 documentation
```

---

## 🔧 Migration Path

### Phase 1: Setup (Day 1)
```bash
# 1. Create v8 directory
mkdir design-agent-v8
cd design-agent-v8

# 2. Copy v7 as starting point
cp -r ../design-agent-v7/* .

# 3. Reorganize into v7-preserved, v7-enhanced, v8-new
mkdir -p src/components/{v7-preserved,v7-enhanced,v8-new}
mkdir -p src/services/{v7-core,v7-enhanced,v8-new}
mkdir -p src/types/{v7-preserved,v8-new}
mkdir -p src/hooks/v8-new
mkdir -p src/constants/v8-new

# 4. Install new dependencies
npm install
```

### Phase 2: Add v8 Features (Week 1-7)
```
Week 1: Core enhancements
  - Add useHistory hook
  - Enhance geminiService with batching
  - Add graceful error handling
  
Week 2-3: Coverage system
  - Build Stage 2.5
  - Add coverage services
  - Create pack system
  
Week 4: Creative controls
  - Enhance Stage 2 with atmosphere
  - Add lighting controls to Stage 3
  
Week 5-6: Composition & Video
  - Build Stage 2.75
  - Enhance Stage 5 with camera controls
  
Week 7: Polish
  - Production metadata
  - End-to-end testing
```

### Phase 3: Testing (Parallel)
```
Development:
  - Run v8 locally on different port
  - Test new features
  - Keep v7 running as fallback

Validation:
  - Test v7 vs v8 side-by-side
  - Verify v8 improvements
  - Gather feedback

Migration:
  - When v8 stable → Make it main
  - Archive v7 as reference
  - Update documentation
```

---

## 📋 Package.json (v8 New Dependencies)

```json
{
  "name": "design-agent-v8",
  "version": "8.0.0",
  "description": "Design Agent v8 - Production AI Video Platform",
  
  "dependencies": {
    // v7 dependencies (keep all)
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@google/genai": "^latest",
    "lucide-react": "^latest",
    
    // v8 new dependencies
    "immer": "^10.0.3",              // For undo/redo
    "lodash.chunk": "^4.2.0",        // For batch processing
    "file-saver": "^2.0.5"           // Enhanced exports
  },
  
  "devDependencies": {
    // Keep all v7 dev dependencies
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    
    // v8 additions (if needed)
    "@types/lodash.chunk": "^4.2.7"
  },
  
  "scripts": {
    "dev": "vite --port 5174",       // Different port from v7
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 🎨 App.tsx (v8 Routing)

```typescript
// v8 App.tsx - Enhanced routing with new stages

import React, { useState } from 'react';
import Layout from './components/v7-preserved/Layout';

// v7 stages (preserved)
import ScriptStudio from './components/v7-preserved/Stage1-ScriptStudio';
import Storyboard from './components/v7-preserved/Stage4-Storyboard';

// v7 stages (enhanced)
import ConceptGeneration from './components/v7-enhanced/Stage2-ConceptGeneration';
import EditCanvas from './components/v7-enhanced/Stage3-EditCanvas';
import VideoStudio from './components/v7-enhanced/Stage5-VideoStudio';

// v8 new stages
import EntityExtraction from './components/v8-new/Stage1.5-EntityExtraction';
import CoverageGeneration from './components/v8-new/Stage2.5-CoverageGeneration';
import SceneComposition from './components/v8-new/Stage2.75-SceneComposition';

export enum Stage {
  SCRIPT = 'script',
  ENTITY_EXTRACTION = 'entity-extraction',      // 🆕
  CONCEPT = 'concept',
  COVERAGE = 'coverage',                        // 🆕
  COMPOSITION = 'composition',                  // 🆕
  EDIT = 'edit',
  STORYBOARD = 'storyboard',
  VIDEO = 'video'
}

const App: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<Stage>(Stage.SCRIPT);
  
  const renderStage = () => {
    switch (currentStage) {
      case Stage.SCRIPT:
        return <ScriptStudio onNext={() => setCurrentStage(Stage.ENTITY_EXTRACTION)} />;
        
      case Stage.ENTITY_EXTRACTION:
        return <EntityExtraction onNext={() => setCurrentStage(Stage.CONCEPT)} />;
        
      case Stage.CONCEPT:
        return <ConceptGeneration onNext={() => setCurrentStage(Stage.COVERAGE)} />;
        
      case Stage.COVERAGE:
        return <CoverageGeneration onNext={() => setCurrentStage(Stage.COMPOSITION)} />;
        
      case Stage.COMPOSITION:
        return <SceneComposition onNext={() => setCurrentStage(Stage.EDIT)} />;
        
      case Stage.EDIT:
        return <EditCanvas onNext={() => setCurrentStage(Stage.STORYBOARD)} />;
        
      case Stage.STORYBOARD:
        return <Storyboard onNext={() => setCurrentStage(Stage.VIDEO)} />;
        
      case Stage.VIDEO:
        return <VideoStudio />;
        
      default:
        return <ScriptStudio onNext={() => setCurrentStage(Stage.ENTITY_EXTRACTION)} />;
    }
  };
  
  return (
    <Layout 
      currentStage={currentStage} 
      onNavigate={setCurrentStage}
      version="v8"
    >
      {renderStage()}
    </Layout>
  );
};

export default App;
```

---

## 🚀 Implementation Checklist

### Week 1: Setup & Core Enhancements ✅

- [ ] **Day 1: Project Setup**
  - [ ] Create design-agent-v8 directory
  - [ ] Copy v7 as base
  - [ ] Reorganize into v7-preserved/v7-enhanced/v8-new
  - [ ] Update package.json with new dependencies
  - [ ] Test v8 runs on different port (5174)
  
- [ ] **Day 2-3: Core Services**
  - [ ] Copy useHistory.ts from AI Studio
  - [ ] Enhance geminiService.ts with parallel batching
  - [ ] Add graceful error handling throughout
  - [ ] Test: Batch generation works
  
- [ ] **Day 4-5: UI Enhancements**
  - [ ] Add undo/redo buttons to all stages
  - [ ] Test history system works
  - [ ] Verify v7 stages still work in v8

### Week 2-3: Coverage System ✅

- [ ] **Week 2: Stage 2.5 Foundation**
  - [ ] Create CoverageGenerationStage.tsx
  - [ ] Build PackSelector component
  - [ ] Create coveragePacks.ts constants
  - [ ] Build coverageGenerationService.ts
  - [ ] Test: Turnaround pack generates
  
- [ ] **Week 3: Coverage Complete**
  - [ ] Add BatchProgress component
  - [ ] Build CoverageLibraryViewer
  - [ ] Implement all packs (Turnaround → Full)
  - [ ] Test: Contact Sheet generates in 3-5 min
  - [ ] Integrate with IndexedDB storage

### Week 4: Creative Controls ✅

- [ ] **Atmosphere Controls**
  - [ ] Add time of day selector to Location Builder
  - [ ] Add weather selector
  - [ ] Add real location grounding input
  - [ ] Test: Golden Hour + Rain generates correctly
  
- [ ] **Lighting & Camera**
  - [ ] Add lighting controls to Edit Canvas
  - [ ] Add camera parameters
  - [ ] Test: Studio lighting presets work

### Week 5-6: Composition & Video ✅

- [ ] **Week 5: Composition**
  - [ ] Build Stage 2.75
  - [ ] Create MultiEntityComposer
  - [ ] Add AI verification
  - [ ] Test: Char + Prod + Loc composition
  
- [ ] **Week 6: Video Enhancement**
  - [ ] Add camera move selector to Video Studio
  - [ ] Add stability slider
  - [ ] Build Veo polling UI
  - [ ] Test: All camera moves work

### Week 7: Polish & Launch ✅

- [ ] **Production Ready**
  - [ ] Update all UI copy to production language
  - [ ] Add production metadata generation
  - [ ] End-to-end testing
  - [ ] Performance optimization
  - [ ] Documentation update
  
- [ ] **Launch Prep**
  - [ ] Create demo video
  - [ ] Write migration guide (v7 → v8)
  - [ ] Deploy v8 to staging
  - [ ] Beta testing with real project
  - [ ] Production deployment

---

## 🧪 Testing Strategy

### Parallel Testing:

```bash
# Terminal 1: Run v7 (control)
cd design-agent-v7
npm run dev
# Runs on localhost:5173

# Terminal 2: Run v8 (development)
cd design-agent-v8
npm run dev
# Runs on localhost:5174

# Compare side-by-side
# Test same project in both versions
# Verify v8 improvements
```

### Test Projects:

1. **Simple Test** (Week 1)
   - 3 beats, 1 character
   - Test: Batch generation faster than v7?
   
2. **Coverage Test** (Week 2-3)
   - Generate Turnaround pack
   - Generate Contact Sheet
   - Verify: 12 shots in 3-5 min?
   
3. **Real Asset Test** (Week 4)
   - Upload product photo
   - AI extract specs
   - Generate coverage from upload
   - Verify: Consistency maintained?
   
4. **Full Production** (Week 6-7)
   - Complete video project
   - Use all v8 features
   - Compare to v7 workflow
   - Verify: 83% time savings?

---

## 📊 Success Metrics

### Week 1:
- [ ] v8 runs without breaking
- [ ] Batch generation 9x faster than v7
- [ ] Error handling prevents crashes

### Week 3:
- [ ] Contact Sheet generates in 3-5 min
- [ ] Coverage library stores correctly
- [ ] User can select from packs

### Week 5:
- [ ] Multi-entity composition works
- [ ] AI verification catches errors
- [ ] Professional controls functional

### Week 7:
- [ ] Complete project 83% faster than v7
- [ ] All features working smoothly
- [ ] Production-ready output

---

## 🎬 Next Steps

1. **Read this blueprint** ✅
2. **Review file structure** above
3. **Ready to start?** I'll create:
   - Complete starter files
   - All new services
   - Enhanced components
   - Migration scripts
   - Testing guides

**Want me to generate the v8 starter package?** I can create:
- All new TypeScript files
- Enhanced services
- New UI components
- Complete working v8 foundation

Just say "yes, create v8 starter files" and I'll build you everything ready to code! 🚀
