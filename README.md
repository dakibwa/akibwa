# Akibwa Core Site

Public site for [akibwa.com](https://akibwa.com), exported statically with Next.js and deployed from `main` to Cloudflare Workers Static Assets. GitHub hosts the code and runs the deploy workflow; GitHub Pages is only a manual fallback. See [the hosting contract](docs/cloudflare-config.md).

From 16 November 2026 (Dan) akibwa.com is one page: a shelf of the records Dan plays most, in the Akibwa signature's style: his top 150 albums and the records his top 1,000 songs come from, merged, so a record loved for one song (King Krule's Hey World!) is there too. Every square in a row shares one size, taken from those records' hours between a floor (big enough to see) and a cap (none dominates), with one gap across and down. One bar at the top holds everything there is to know: the signature, the shelf's count and hours or whatever is under the pointer, the order (hours; the year each was played most; kind of music, from `public/music-kinds.json`; a to z) and a smart search (artists and the artists around them, genres and eras, from `public/music-meta.json`). An order sorts the whole shelf with a glide and shows only the headings it needs. An album opens its track list with plays and hours per song and links to Spotify and Apple Music (`public/music-ranking.json`, `public/music-links.json`).

The front page, the trek and career rooms, the mascot, the name change, the contact links, the night paper, the career and podcast data and their artwork were retired that day. Old `#trek` links go to the trek's own page, `#features` to https://features.games/, `#websites` to https://ohlifestudios.com/, and `#music` or `#career` to the shelf. Only `/` is advertised in the sitemap. Old pages (the album archive, the wall and the earlier project pages) were deleted; their links 301 to the homepage from `public/_redirects`. The game's old address, `akibwa.com/features`, was retired on 12 November 2026 and now 301s to the same path on features.games. The `public/features/` copy stays in this repository because it is what features.games serves.

## The trek

- `/trek/` is a `noindex` interactive relief of the original Paris-to-Sofia journey. It retains the exact dated route, daily distances, activity metrics, photo capture times and full photograph set. Journal excerpts are limited to neutral route observations: first-person reflection and personal, health, relationship, financial, accommodation and identifying third-party details are excluded. The walk now waits for its landscape: its pace never outruns the map tiles that have arrived.

## Checks and publishing

- `npm run build`: run the public-boundary and Trek privacy contracts, then export to `out/`.
- `npm run check:navigation:dom`: exercise the rendered public boundary in Chrome.
- `npm run check:worker`: check repeat-visit caching, background refreshes, offline failures and cache isolation from other apps.
- `npm run publish:check`: verify registered public surfaces and exported routes.
- `npm run publish:ready`: run the full publication gate.
- `npm run trek:build`: rebuild the Trek from the exact route data and privacy-edited journal.
- `npm run check:trek:dom`: exercise relief, playback, phone layouts and graphics failure paths. See [the Trek design and source contract](docs/trek-design.md).
- `node scripts/build-music-ranking.mjs --history-root PRIVATE_HISTORY_DIRECTORY`: refresh the public song and artist ranking from the private history's prepared top 1,000.
- The link-preview card, `public/share-card-music.jpg`, is the shelf's first screen captured at 1200×630 with headless Chrome once the sleeves have loaded. When the first screen changes, capture it again under a new filename so link previews drop their cached copy.

Public surface metadata lives in `data/public-surfaces.json`. API-backed refreshes belong in Cloudflare Workers rather than local schedulers or data-mutating GitHub Actions. See [Publication Workflow](docs/publication-workflow.md).
