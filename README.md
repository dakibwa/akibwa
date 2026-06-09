# Akibwa Core Site

Public portfolio site for `akibwa.com`.

The site is a static Next.js export deployed by GitHub Pages from `main`.
Vitals can publish aggregate health values when intentionally approved. Raw health source exports, identifiers, credentials, and unreduced private artifacts should stay out of this repository.

Data refreshes that can run from API credentials or public seeds should run in Cloudflare Workers, not local schedulers or data-mutating GitHub Actions. See [Refresh Routing](docs/refresh-routing.md).

## Publishing

- `npm run build`: build the static export into `out/`.
- `npm run publish:check`: verify registered public surfaces, fallback data, public projection data, and exported routes when `out/` exists.
- `npm run refresh:status`: read live Cloudflare refresh status endpoints from `data/public-surfaces.json`.
- `npm run publish:ready`: run build, publication checks, and live refresh-status checks before pushing `main`.

Public project metadata lives in `data/public-surfaces.json`. Add new website surfaces there first, then wire the route/component/data seed around that registry entry.

The Personal Knowledge Base view reads `data/akibwapedia-data.json`, which is generated from the private local memory workspace. Refresh it from `/Users/danatkinson/Documents/Codex/2026-04-30/what-can-you-be-working-on/personal-memory-wiki` with:

```bash
python3 scripts/publish_public_system.py
```
