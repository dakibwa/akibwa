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

`/trek/` is a static surface at `public/trek/index.html` — the walk travelled through a full-screen cut-paper atlas. It follows the GPS day points through 17 city anchors from Paris to Sofia; scroll it yourself or press **Begin the journey**. The cached 56 × 34 Open-Meteo elevation grid in `data/trek-terrain.json` drives both the broad terrain planes and deterministic layered mountain ranges, clipped to the real seven-country silhouette over a charcoal contour field. Selected Natural Earth lakes and rivers keep the geography legible without a mapping runtime. The compact translucent country trajectory sits directly over the terrain, and the pinned paper stat strip builds distance, days on foot, ascent, moving time and live map elevation as clean figures with restrained colour edges. The muted country palette forms one thick route ribbon, and a small illustrated walker follows it. Story, photo, place and album panels behave like cut paper laid over the map rather than reducing the atlas to a boxed viewport. Each border crossing opens a restrained country plate. Rest-day points remain on the route but pass silently.

The story rail is sourced from the full 24 September–28 November journal review in `data/trek-journal.json`: 50 public-safe excerpts across 45 walking days, with travel, weather, landscape, music and road detail retained and intimate health, relationship, money and identifying third-party details kept private. `public/trek/photos/manifest.json` currently indexes 394 suitable stills across 52 dates; every one appears in the journey’s continuous photo strips. Face/body-condition photographs, accidental frames and private text are excluded. Photographs from silent rest days move into the next walking scene rather than being discarded. Sleeves remain the real fronts of verified records (Cover Art Archive, printed wall cards as fallback — `npm run trek:covers`), matched as lyrics, then songs, then albums in `data/trek-matches.json`; unverified titles stay blank. `?rec=<day>` deep-links a record and country names jump to their border crossings. Build with `npm run trek:build` (once, after new distances: `--distances <json>`). The wall’s Trek card and the walk chapter on `/life-map/` both open it.
