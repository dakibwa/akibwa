# Refresh Routing

Akibwa public data refreshes should run in Cloudflare by default.

The website remains a static GitHub Pages export. GitHub Actions should build and deploy the site, not wake up hourly to mutate data files. Data refreshes that can run from API credentials or public seeds belong in Cloudflare Workers with KV storage, public JSON endpoints, status endpoints, and checked-in fallback seeds.

## Current Cloudflare Refreshes

| Surface | Worker | Schedule | Public data | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Vitals | `akibwa-vitals-refresh` | `30 7 * * *` | `https://akibwa-vitals-refresh.dakibwa.workers.dev/vitals` | `https://akibwa-vitals-refresh.dakibwa.workers.dev/status` | WHOOP credentials live in Cloudflare secrets; only aggregate public health data is served. |
| Chorus | `akibwa-chorus-refresh` | `17 * * * *` | `https://akibwa-chorus-refresh.dakibwa.workers.dev/chorus` | `https://akibwa-chorus-refresh.dakibwa.workers.dev/status` | Last.fm credentials live in Cloudflare secrets. Strava run pairing is supported when Strava secrets are present; otherwise it keeps the public seed pairings. |
| Cover Collision | `akibwa-cover-collision-refresh` | `42 6 * * *` | `https://akibwa-cover-collision-refresh.dakibwa.workers.dev/cover-collision` | `https://akibwa-cover-collision-refresh.dakibwa.workers.dev/status` | Uses `data/cover-collision-data.json` until Instagram API credentials are configured. |

## Pattern For New Refreshes

1. Put a Worker under `workers/<surface>-refresh/`.
2. Store refreshed public data in Cloudflare KV.
3. Serve a public JSON endpoint for the static site to fetch at runtime.
4. Keep a checked-in fallback seed under `data/` when the output is public-safe.
5. Store all credentials with `npx wrangler secret put`; never commit tokens.
6. Add `/status` and `/refresh` endpoints; protect `/refresh` with `ADMIN_TOKEN`.
7. Keep GitHub Actions to build/deploy only.

Use `npm run refresh:status` to inspect the Cloudflare refresh status endpoints from this repo.

## Not Public-Site Refreshes

Private or sensitive refreshes can still use Cloudflare, but they should not publish raw or detailed data into this public repo.

- Monzo and other finance sources: private, aggregate-only design first; no transaction rows, merchant row details, identifiers, notes, addresses, or receipt links.
- Gmail, Drive, Calendar, and broader personal-memory mining: use a private pipeline, not a public JSON endpoint.
- Local file/archive refreshes: move source storage to private cloud storage first, or keep them local until that exists.
