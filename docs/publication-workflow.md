# Public Surface Publication Workflow

Akibwa.com is the public surface. Private or credentialed work should stay in Cloudflare Workers, private local pipelines, or private apps; the static site should consume only public-safe outputs.

## Core Files

- `data/public-surfaces.json`: registry of public routes and their fallback data.
- `scripts/check-publication.mjs`: validates route files, fallback data and exported pages.
- `.github/workflows/deploy-cloudflare.yml`: builds and deploys the static export from `main`, then verifies both the Worker preview and `akibwa.com`.
- `.github/workflows/deploy-pages.yml`: manual GitHub Pages fallback. Running it alone does not move the public domain away from Cloudflare.
- `wrangler.jsonc` and `public/_headers` define static asset routing and response headers. The dashboard owns the Custom Domain. See [the hosting contract](cloudflare-config.md).


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

## Public routes

Dan chose a single public page on 17 November 2026. Register the shelf at `/` and keep the sitemap to that address. Retiring a page removes its route, components, styles, data, artwork and registry entry. Its old addresses return the site's 404 page with HTTP status 404. The hosting check covers both the public domain and the Worker preview.
