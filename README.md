# Akibwa Core Site

Public portfolio site for `akibwa.com`.

The site is a static Next.js export deployed by GitHub Pages from `main`.

The homepage is one visual index rather than a conventional portfolio: a fixed
sentence with one restrained Daniel/Akibwa name cycle, plain word filters, and
a dense two-size mosaic. `Projects` includes Features, Português com a Inês and
the Trek, while
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

`/trek/` is a privacy-minimised static surface at `public/trek/index.html`. It uses a deliberately abstracted city-to-city line through 17 public place anchors from Paris to Sofia rather than a recorded daily trace. The cached Open-Meteo elevation grid in `data/trek-terrain.json` drives the cut-paper terrain, and selected Natural Earth lakes and rivers keep the seven-country geography legible without a mapping runtime. The interface retains aggregate route distance, country sequence, numbered route markers, reviewed landscape photographs and verified record artwork.

The public Trek data excludes exact dates, daily coordinates and distances, activity metrics, personal writing, identity details and unreviewed files. `public/trek/photos/manifest.json` is the allow-list for every served route photograph; images showing people, bodies, accommodation or identifying text are excluded. Sleeves remain real fronts of verified records (Cover Art Archive, printed wall cards as fallback — `npm run trek:covers`), and unverified titles stay blank. `?rec=<day>` deep-links a record and country names jump to their generalized route sections. Build with `npm run trek:build`; `npm run check:trek-privacy` enforces the public-data boundary.
