# Public Surface Publication Workflow

Akibwa.com is the public surface. Private or credentialed work should stay in Cloudflare Workers, private local pipelines, or private apps; the static site should consume only public-safe outputs.

## Core Files

- `data/public-surfaces.json`: registry of public routes, fallback data and external short links.
- `scripts/check-publication.mjs`: validates route files, fallback data, static export routes and the edge redirect behind each external surface.
- `.github/workflows/deploy-cloudflare.yml`: builds and deploys the static export from `main`, then verifies both the Worker preview and `akibwa.com`.
- `.github/workflows/deploy-pages.yml`: manual GitHub Pages fallback. Running it alone does not move the public domain away from Cloudflare.
- `wrangler.jsonc`, `public/_headers` and `public/_redirects`: the Cloudflare asset, HTML routing and response policy. Retired pages are deleted and 301 from `_redirects`, never kept as stub pages. The dashboard owns the Custom Domain; [the hosting contract](cloudflare-config.md) records publishing, credentials and fallback operations.

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
4. Put credentialed refresh/API work in a Cloudflare Worker, not in GitHub Actions or a local scheduler, and publish only public-safe outputs.
5. Run `npm run publish:ready`.

## Retire A Surface

Delete its route, components, styles, data and artwork rather than hiding it, remove its registry entry, and add `/<route> / 301` plus `/<route>/* / 301` to `public/_redirects` (static rules above splats). `npm run check:navigation` keeps retired routes from returning.
