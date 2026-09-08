# Public Surface Publication Workflow

Akibwa.com is the public surface. Private or credentialed work should stay in Cloudflare Workers, private local pipelines, or private apps; the static site should consume only public-safe outputs.

## Core Files

- `data/public-surfaces.json`: registry of public routes, fallback data, refresh endpoints, and private-to-public projection data.
- `components/site-data.js`: imports the registry and exports the values used by pages.
- `scripts/check-publication.mjs`: validates route files, fallback data, generated public packets, and static export routes.
- `scripts/check-cloud-refreshes.mjs`: reads refresh status endpoints from the registry.
- `.github/workflows/deploy-cloudflare.yml`: builds and deploys the static export from `main`, then verifies both the Worker preview and `akibwa.com`.
- `.github/workflows/deploy-pages.yml`: manual GitHub Pages fallback. Running it alone does not move the public domain away from Cloudflare.
- `wrangler.jsonc`, `public/_headers` and `public/_redirects`: the Cloudflare asset, HTML routing and response policy. The dashboard owns the Custom Domain; [the hosting contract](cloudflare-config.md) records publishing, credentials and fallback operations.

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
2. Add an App Router page under `app/<route>/page.jsx`, or a `kind: "static-directory"` entry whose `staticPath` is `public/<route>/index.html` (as `/features` and `/trek` do).
3. Add a public-safe fallback data file under `data/` when runtime data can fail.
4. Put credentialed refresh/API work in `workers/<surface>-refresh/`, not in GitHub Actions.
5. Read the registry from `components/site-data.js` instead of duplicating URLs in page code.
6. Run `npm run publish:ready`.
