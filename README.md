# Akibwa Core Site

Public portfolio site for `akibwa.com`.

The site is a static Next.js export deployed by GitHub Pages from `main`.

Data refreshes that can run from API credentials or public seeds should run in Cloudflare Workers, not local schedulers or data-mutating GitHub Actions. See [Refresh Routing](docs/refresh-routing.md).

## Publishing

- `npm run build`: build the static export into `out/`.
- `npm run publish:check`: verify registered public surfaces, fallback data, public projection data, and exported routes when `out/` exists.
- `npm run refresh:status`: read live Cloudflare refresh status endpoints from `data/public-surfaces.json`.
- `npm run publish:ready`: run build, publication checks, and live refresh-status checks before pushing `main`.
- Markdown and `docs/**`-only changes intentionally do not start a Pages build or deployment.

Public project metadata lives in `data/public-surfaces.json`. Add new website surfaces there first, then wire the route/component/data seed around that registry entry.

The Personal project overlays are user-facing product surfaces, not decorative screenshots. Chorus distinguishes live from fallback data without timestamps and keeps its last paired Strava runs visible, Cover Collision presents the series as a numbered exhibition with a direct Instagram route, and embedded apps retain their own live behaviour.
