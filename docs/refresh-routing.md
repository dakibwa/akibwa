# Akibwa Surface And Refresh Routing

Akibwa.com is the product surface. Public project views should be reachable and usable on the website itself, while Cloudflare runs the background jobs, private credentials, API calls, dynamic app runtime, KV storage, and scheduled refreshes.

The website remains a static GitHub Pages export. GitHub Actions should build and deploy the site, not wake up hourly to mutate data files. Data refreshes that can run from API credentials or public seeds belong in Cloudflare Workers with KV storage, public JSON endpoints, status endpoints, and checked-in fallback seeds.

Dynamic project apps should be framed, rendered, or progressively rebuilt inside Akibwa routes. The wall is rendered directly by the site at `https://akibwa.com/albums` — the artwork and the ranking ship with the export, and only the play counts come from a Worker.

The current public surface registry is `data/public-surfaces.json`. Keep routes, fallback data files, Worker names, public data endpoints, and status endpoints there first; scripts and site data should read from the registry rather than duplicating endpoint lists.

## Current Cloudflare Refreshes

| Surface | Worker | Schedule | Public data | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| The wall | `akibwa-albums-refresh` | `23 * * * *` | `https://akibwa-albums-refresh.dakibwa.workers.dev/albums` | `https://akibwa-albums-refresh.dakibwa.workers.dev/status` | Last.fm credentials live in Cloudflare secrets. Reads the sleeve list from `https://akibwa.com/album-wall-manifest.json` so there is one source of truth, and serves only `{ id: playcount }`. `data/album-wall.json` carries baked counts as the fallback seed. |
| Cover Collision | `akibwa-cover-collision-refresh` | `42 6 * * *` | `https://akibwa-cover-collision-refresh.dakibwa.workers.dev/cover-collision` | `https://akibwa-cover-collision-refresh.dakibwa.workers.dev/status` | Uses Instagram API credentials when present, the public Instagram profile endpoint when absent, and `data/cover-collision-data.json` only as the final public seed fallback. |

## Pattern For New Refreshes

1. Put a Worker under `workers/<surface>-refresh/`.
2. Store refreshed public data in Cloudflare KV.
3. Serve a public JSON endpoint for the static site to fetch at runtime.
4. Keep a checked-in fallback seed under `data/` when the output is public-safe.
5. Store all credentials with `npx wrangler secret put`; never commit tokens.
6. Add `/status` and `/refresh` endpoints; protect `/refresh` with `ADMIN_TOKEN`.
7. Keep GitHub Actions to build/deploy only.

Use `npm run refresh:status` to inspect the Cloudflare refresh status endpoints from this repo.
Use `npm run publish:ready` before publishing website changes live.

## Not Public-Site Refreshes

Private or sensitive refreshes can still use Cloudflare, but they should not publish raw or detailed data into this public repo.

- Monzo and other finance sources: private, aggregate-only design first; no transaction rows, merchant row details, identifiers, notes, addresses, or receipt links.
- Gmail, Drive, Calendar, and broader personal-memory mining: use a private pipeline, not a public JSON endpoint.
- Local file/archive refreshes: move source storage to private cloud storage first, or keep them local until that exists.
