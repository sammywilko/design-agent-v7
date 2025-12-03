# Design Agent 7.0

Premium AI visual storytelling platform for sport-fashion content creation.

## What's New in v7.0

- **@Mention Character System**: Type `@CharacterName` to auto-inject reference images
- **Character Sheet Generator**: 2x2 turnaround grids for consistency
- **Expression Bank Generator**: 6-emotion sprite sheets
- **Smart Reference Priority**: Uses characterSheet → refCoverage → imageRefs
- **Virtual Camera Rig**: Professional cinematography controls
- **Location Anchoring**: Consistent environment generation
- **Multi-Reference Composite**: Combine multiple refs per generation

## Quick Start

```bash
npm install
npm run dev
```

## Deployment

1. Push to GitHub
2. Import to Vercel
3. Add environment variable: `GEMINI_API_KEY`
4. Deploy

## Stack

- React 19 + Vite + TypeScript
- Google Gemini AI (Nano Banana Pro)
- IndexedDB for persistence
