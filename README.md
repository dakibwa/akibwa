# Dakibwa

Dakibwa is a **music constellation** built around Daniel's listening history.

The site is intentionally narrow in scope now: one beautiful, music-first experience instead of a generic consumption dashboard. It uses **Last.fm as the primary source** and arranges favourite artists into a small interactive cosmos — part portrait, part listening map.

## What changed in this rebuild

- removed the mixed Spotify / OpenAI / Gemini drift from the main experience
- rebuilt the homepage around a single constellation interaction
- split the app into smaller modules for data fetching, graph shaping, and rendering
- added a taste-aware fallback snapshot so the site still feels specific when Last.fm data is unavailable
- updated the copy and visual language to feel calmer, stranger, and more intentional

## Stack

- Vite
- React
- TypeScript
- Last.fm API

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment

Create a `.env` file with:

```bash
VITE_LASTFM_API_KEY=your_lastfm_api_key
```

If the key is missing, Dakibwa falls back to an embedded taste snapshot based on the current project direction and known listening profile.
