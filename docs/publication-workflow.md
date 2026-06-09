# Public Surface Publication Workflow

Akibwa.com is the public surface. Private or credentialed work should stay in Cloudflare Workers, private local pipelines, or private apps; the static site should consume only public-safe outputs.

## Core Files

- `data/public-surfaces.json`: registry of public routes, fallback data, refresh endpoints, and private-to-public projection data.
- `components/site-data.js`: imports the registry and exports the values used by pages.
- `scripts/check-publication.mjs`: validates route files, fallback data, generated public packets, and static export routes.
- `scripts/check-cloud-refreshes.mjs`: reads refresh status endpoints from the registry.
- `.github/workflows/deploy-pages.yml`: builds and deploys the static export from `main`.

## Publish Check

Run this before pushing site changes live:

```bash
npm run publish:ready
```

For a quicker local-only check:

```bash
npm run build
npm run publish:check
```

## Add A New Public Surface

1. Add one entry to `data/public-surfaces.json`.
2. Add the route under `app/<route>/page.jsx` or attach it to an existing route with a hash.
3. Add a public-safe fallback data file under `data/` when runtime data can fail.
4. Put credentialed refresh/API work in `workers/<surface>-refresh/`, not in GitHub Actions.
5. Read the registry from `components/site-data.js` instead of duplicating URLs in page code.
6. Run `npm run publish:ready`.

## Private Documents To Website

The Personal Knowledge Base surface is a public projection, not a memory browser. Refresh it from the private memory workspace:

```bash
cd /Users/danatkinson/Documents/Codex/2026-04-30/what-can-you-be-working-on/personal-memory-wiki
python3 scripts/publish_public_system.py
```

That command rebuilds the project registry, agentic boot packet, public Akibwapedia packet, and `data/akibwapedia-data.json` in this site. It should export only low-sensitivity architecture, counts, source-family labels, routes, and guardrails.
