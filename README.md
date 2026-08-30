# Akibwa Core Site

Public portfolio site for `akibwa.com`.

The site is a static Next.js export deployed by GitHub Pages from `main`.

The homepage is one visual index rather than a conventional portfolio: a fixed
sentence with one restrained Daniel/Akibwa name cycle, plain word filters, and
a dense two-size mosaic. `Projects` includes the Trek and Life Map pieces, while
Career, Music, Films, Games, and TV remain their own lenses. Only tiles with a
real destination are links; the rest are labelled visual objects, and there is
no modal viewer or card-back interaction.

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

`/trek/` is a static surface at `public/trek/index.html` — the walk travelled through the map. One full-screen atlas opens with a pared-back sans-serif Paris → Sofia route title: scroll (or press *walk it*, which plays the journey like a route flyover) and the camera follows a walker along the GPS day points and through the curated city anchors. A foreshortened paper-diorama relief mesh raises the map, route and markers from the cached Open-Meteo elevation grid in `data/trek-terrain.json`; contours, upright terrain supports, named mountain ranges and selected Natural Earth lakes and rivers make the landscape legible without a mapping runtime. Illustrated landmarks unfold when the walk reaches Champagne, Munich’s Frauenkirche, Zeller See, the High Tauern, Belgrade’s Victor and Sofia’s Alexander Nevsky Cathedral. A bordered left-hand journey instrument builds up distance, days on foot, ascent and moving time alongside the live map elevation and a segmented route line. The active country colours its territory and relief while earlier countries remain as faint traces; France stays blue and Germany shifts to warm oxide so their handover is unmistakable. The masthead is the route: arrows join its countries and the same distance-weighted seven-colour line fills beneath them; the Trek wordmark itself stays plain. On wide screens a right-hand collector accumulates the notable places passed and the latest albums heard; it stays off the map on small screens. Each border crossing opens over a softened trace of that country’s Imagine ground, and journal beats from *A Generous Slice* hold the camera at their days. Rest-day points remain on the route but pass silently, without opening a card or interrupting the flyover. The day card carries title, date, per-day km/moving time from the Strava archive, and the day’s record; sleeves are the real fronts of verified records (Cover Art Archive, printed wall cards as fallback — `npm run trek:covers`), matched as lyrics, then songs, then albums in `data/trek-matches.json`; unverified titles stay blank. `?rec=<day>` deep-links a record; country names jump to their border crossings. After the final map frame, a responsive data wall lays out the final totals, all 17 route places and the 30 unique matched albums. Optional photographs from the road live in `public/trek/photos/` with a `manifest.json` of `{day, src, w, h}`. Build with `npm run trek:build` (once, after new distances: `--distances <json>`). The wall’s Trek card and the walk chapter on `/life-map/` both open it.
