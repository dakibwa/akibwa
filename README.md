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

The Personal project overlays are user-facing product surfaces, not decorative screenshots. The wall ranks the whole record collection by play count and says plainly what its counts do and do not cover, Cover Collision presents the series as a numbered exhibition with a direct Instagram route, and embedded apps retain their own live behaviour.

`/life-map/` is a static surface at `public/life-map/index.html`. First paint is the 2019 walk (Paris → Sofia, 1,982 km, real GPS). Homes and other countries stay on the map as contour; the rest of the life is still there, quieter.

`/trek/` is a static surface at `public/trek/index.html` — the walk travelled through the map. One full-screen atlas: scroll (or press *walk it*, which plays the journey like a route flyover) and the camera follows a walker along the GPS day points, town by town, Paris to Sofia. Each border crossing opens on that country’s Imagine ground; journal beats from *A Generous Slice* hold the camera at their days; day 39 — the day Strava holds nothing — blacks the map out, because the gap in the data is the event. The day card carries title, date, per-day km/moving time from the Strava archive, and the day’s record; sleeves are the real fronts of verified records (Cover Art Archive, printed wall cards as fallback — `npm run trek:covers`), matched as lyrics, then songs, then albums in `data/trek-matches.json`; unverified titles stay blank. `?rec=<day>` deep-links a record; country names in the masthead jump to their crossings. Optional photographs from the road live in `public/trek/photos/` with a `manifest.json` of `{day, src, w, h}`. Build with `npm run trek:build` (once, after new distances: `--distances <json>`). The wall’s Trek card and the walk chapter on `/life-map/` both open it.
