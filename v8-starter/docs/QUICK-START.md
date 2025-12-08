# v8 Quick Start Guide - Get Running in 30 Minutes

**Goal:** Get v8 foundation running with batch generation and undo/redo

---

## ⚡ Quick Setup (10 minutes)

### 1. Create v8 Project

```bash
# From your design-agent parent directory
cd /path/to/design-agent-parent

# Create v8 folder
mkdir design-agent-v8
cd design-agent-v8

# Copy v7 as starting point
cp -r ../design-agent-v7/* .

# Install new dependencies
npm install immer lodash.chunk
```

### 2. Update package.json

```json
{
  "name": "design-agent-v8",
  "version": "8.0.0",
  "scripts": {
    "dev": "vite --port 5174",
    "build": "tsc && vite build"
  },
  "dependencies": {
    // ... keep all v7 dependencies ...
    "immer": "^10.0.3",
    "lodash.chunk": "^4.2.0"
  }
}
```

### 3. Copy v8 Starter Files

```bash
# Create v8 directories
mkdir -p src/hooks/v8-new
mkdir -p src/constants/v8-new
mkdir -p src/types/v8-new

# Copy files from this package:
# - hooks/useHistory.ts → src/hooks/v8-new/
# - constants/coveragePacks.ts → src/constants/v8-new/
# - constants/cameraMoves.ts → src/constants/v8-new/
# - types/coverage.ts → src/types/v8-new/
```

---

## 🎯 Week 1 Implementation (20 minutes)

### Step 1: Add Undo/Redo to One Component

Pick any existing stage component (e.g., `Stage2-ConceptGeneration.tsx`):

```typescript
// At top of file
import { useHistory } from '../hooks/v8-new/useHistory';

// Inside component
const YourComponent = () => {
  // OLD: const [state, setState] = useState(initialState);
  
  // NEW: Replace with useHistory
  const { state, setState, undo, redo, canUndo, canRedo } = useHistory(initialState);
  
  // Rest of component stays the same - setState works identically
  
  // Add undo/redo buttons in your header
  return (
    <div>
      <div className="header">
        <h2>Your Stage</h2>
        <div className="history-controls">
          <button onClick={undo} disabled={!canUndo}>
            <Undo2 /> Undo
          </button>
          <button onClick={redo} disabled={!canRedo}>
            <Redo2 /> Redo
          </button>
        </div>
      </div>
      
      {/* Rest of your component */}
    </div>
  );
};
```

**Test:** Make changes, click undo, click redo. Should work!

### Step 2: Add Parallel Batch Generation

In your existing `geminiService.ts`, add this function:

```typescript
import chunk from 'lodash.chunk';

/**
 * Generate multiple images in parallel batches
 */
export const generateBatch = async (
  prompts: string[],
  options?: {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<Array<{ prompt: string; imageUrl: string; status: 'success' | 'failed' }>> => {
  
  const batchSize = options?.batchSize || 10;
  const batches = chunk(prompts, batchSize);
  const results: any[] = [];
  
  let completed = 0;
  const total = prompts.length;
  
  // Process each batch
  for (const batch of batches) {
    // Generate all in batch simultaneously
    const batchResults = await Promise.all(
      batch.map(async (prompt) => {
        try {
          const imageUrl = await generateImage(prompt); // Your existing function
          completed++;
          options?.onProgress?.(completed, total);
          return { prompt, imageUrl, status: 'success' };
        } catch (error) {
          completed++;
          options?.onProgress?.(completed, total);
          console.error(`Failed: ${prompt}`, error);
          return { prompt, imageUrl: '', status: 'failed' };
        }
      })
    );
    
    results.push(...batchResults);
    
    // Small delay between batches (rate limiting)
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
};
```

**Test in console:**

```typescript
// In your component
const testBatch = async () => {
  const prompts = [
    'Athletic man, front view',
    'Athletic man, side view',
    'Athletic man, back view'
  ];
  
  const results = await generateBatch(prompts, {
    batchSize: 3,
    onProgress: (completed, total) => {
      console.log(`Progress: ${completed}/${total}`);
    }
  });
  
  console.log('Results:', results);
};
```

**Expected:** All 3 generate in ~30 seconds instead of 90 seconds.

---

## 🧪 Test Your v8 Foundation

### Test 1: Undo/Redo Works

1. Run `npm run dev`
2. Open localhost:5174
3. Go to any stage with undo/redo buttons
4. Make a change
5. Click undo → should revert
6. Click redo → should restore
7. ✅ **Pass if it works!**

### Test 2: Batch Generation Faster

1. Time a generation: Generate 3 beats one-by-one
2. Note time taken
3. Use batch generation for same 3 beats
4. Compare times
5. ✅ **Pass if batch is ~3x faster**

---

## 📋 Next Steps (Week 2+)

Once foundation works:

### Week 2: Build Coverage Pack Selector

```typescript
// Create new component: CoveragePackSelector.tsx

import { COVERAGE_PACKS } from '../constants/v8-new/coveragePacks';

const CoveragePackSelector = ({ onSelectPack }) => {
  return (
    <div className="pack-selector">
      <h2>Select Coverage Pack</h2>
      <div className="pack-grid">
        {Object.values(COVERAGE_PACKS).map(pack => (
          <PackCard
            key={pack.id}
            pack={pack}
            onClick={() => onSelectPack(pack.id)}
          />
        ))}
      </div>
    </div>
  );
};

const PackCard = ({ pack, onClick }) => (
  <div 
    className={`pack-card ${pack.recommended ? 'recommended' : ''}`}
    onClick={onClick}
  >
    <div className="pack-icon">{pack.icon}</div>
    <h3>{pack.name}</h3>
    <p>{pack.description}</p>
    <div className="pack-meta">
      <span>{pack.shots} shots</span>
      <span>{pack.estimatedTime}</span>
      <span>{pack.estimatedCost}</span>
    </div>
  </div>
);
```

### Week 3: Generate Coverage from Pack

```typescript
// Use the batch generation you already built

const generateCoverageFromPack = async (
  entity: CharacterEntity,
  packId: string
) => {
  const pack = COVERAGE_PACKS[packId];
  
  // Build prompts for each angle
  const prompts = pack.angles.map(angle => 
    `${entity.description}. ${angle.description}. 
     Professional cinematography, 4K, ${angle.type} shot, ${angle.angle}.`
  );
  
  // Use your batch generation
  const results = await generateBatch(prompts, {
    batchSize: 10,
    onProgress: (completed, total) => {
      setProgress((completed / total) * 100);
    }
  });
  
  // Create coverage library
  const library: CoverageLibrary = {
    id: generateId(),
    entityId: entity.id,
    entityType: 'character',
    entity,
    packId,
    packName: pack.name,
    angles: results.map((r, i) => ({
      id: generateId(),
      category: pack.angles[i].category,
      type: pack.angles[i].type,
      angle: pack.angles[i].angle,
      description: pack.angles[i].description,
      imageUrl: r.imageUrl,
      resolution: '4K',
      source: 'generated',
      status: r.status,
      tags: [],
      favorite: false,
      usedInStoryboard: false,
      usedInScenes: [],
      metadata: {},
      createdAt: new Date()
    })),
    status: 'complete',
    progress: 100,
    uploadedAngles: 0,
    generatedAngles: results.filter(r => r.status === 'success').length,
    failedAngles: results.filter(r => r.status === 'failed').length,
    createdAt: new Date()
  };
  
  return library;
};
```

---

## 🎯 Success Criteria

### Week 1 ✅
- [ ] v8 runs on port 5174
- [ ] Undo/redo works in at least one component
- [ ] Batch generation 3x faster than sequential
- [ ] No breaking changes to v7 functionality

### Week 2 ✅  
- [ ] Pack selector UI built
- [ ] Can select Contact Sheet pack
- [ ] Generates 12 images in 3-5 minutes
- [ ] Coverage library stores in IndexedDB

### Week 3+ ✅
- [ ] All packs working
- [ ] Coverage library viewer built
- [ ] Can reuse angles in storyboard
- [ ] End-to-end workflow complete

---

## 🚨 Troubleshooting

### "Module not found: immer"
```bash
npm install immer
```

### "Batch generation not faster"
- Check network tab - are requests parallel?
- Verify `Promise.all()` is used
- Check batch size (should be 10)

### "Undo/redo not working"
- Verify `useHistory` imported correctly
- Check if `setState` calls updated
- Ensure state is serializable (no functions)

---

## 💡 Tips

1. **Keep v7 running** - Easy to compare
2. **Test incrementally** - One feature at a time
3. **Use console.log** - Debug batch progress
4. **Commit often** - Can revert if needed
5. **Check v7 still works** - Ensure no breaking changes

---

## 📚 Reference

- Full architecture: `V8-MASTER-BLUEPRINT.md`
- Integration details: `INTEGRATION-MAP-V7-TO-GEMS.md`
- Pack system: `COVERAGE-GENERATION-V2-PRACTICAL.md`

---

**Ready to start? Run the setup commands above and you'll have v8 foundation in 30 minutes!** 🚀
