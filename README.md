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

`/trek/` is a static surface at `public/trek/index.html`. Same walk, Features grammar: coloured country threads through the 67 numbered days. Walked-day nodes are tiny record sleeves on that thread. GPS titles are matched as lyrics, then as songs, then as albums; sleeves are the real fronts of those records (printed wall cards when he has them, otherwise Cover Art Archive). Walking-day puns stay blank jackets. Rest days wear an original empty pin, not a sleeve. Country polygons clip original Imagine-style grounds as quiet atmosphere — hover or focus raises that country’s ground; they are never used as fake album sleeves. A low-contrast contour sits behind the net. About 38 km on a walked day (1,982 km / 52). Build with `npm run trek:covers` then `npm run trek:build`. The wall’s Trek card and the walk chapter on `/life-map/` both open it.
