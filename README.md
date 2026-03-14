# Dakibwa

Dakibwa is evolving into a **music constellation**: a visual map of listening taste built from real listening data.

## Direction
The core idea is:
- connect to Last.fm
- build a graph of artists / albums / listening clusters
- render it as a beautiful star-map / constellation
- use LLMs sparingly to enrich the map with labels and relationship explanations

This project is intentionally moving away from a vague general "consumption dashboard" toward a clearer music-first identity.

## Current stack
- Vite
- React
- TypeScript

## Local development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Notes
- The long-term product direction is documented in `docs/constellation-plan.md`.
- The current implementation still contains older experiments and mixed provider references; cleanup/refocus is in progress.
