# Akibwa Core Site

Public site for [akibwa.com](https://akibwa.com), exported statically with Next.js and deployed from `main` to Cloudflare Workers Static Assets. GitHub hosts the code and runs the deploy workflow; GitHub Pages is only a manual fallback. See [the hosting contract](docs/cloudflare-config.md).

From 16 November 2026 (Dan) akibwa.com is one page: a shelf of the records Dan plays most, in the Akibwa signature's style: his top 150 albums and the records his top 1,000 songs come from, merged, so a record loved for one song (King Krule's Hey World!) is there too. Every square in a row shares one size, taken from those records' hours between a floor (big enough to see) and a cap (none dominates), with one gap across and down. One bar at the top holds everything there is to know: the signature, the order (hours; the year each was played most; kind of music, from `public/music-kinds.json`; a to z) and a smart search (artists and the artists around them, genres and eras, from `public/music-meta.json`). A label at the foot of the screen names the record under the pointer or keyboard focus. Changing the order during a glide starts each visible cover from its current position. With reduced motion enabled, the shelf and sheets update immediately. An album opens its track list with plays and hours per song and links to Spotify and Apple Music (`public/music-ranking.json`, `public/music-links.json`). Long track lists scroll inside the sheet. The signature and browser icons use the same red flower in `public/favicon.svg`.

The shelf at `/` is the only public page and the only entry in the sitemap. On 17 November 2026 the standalone Trek, its photographs and journal, and the remaining links to old pages were removed. Former page addresses and the old game API return 404. Opening a bookmark with a room name after `#` shows the shelf at the bare homepage address. The game in `public/features/` is published separately at features.games.

## Checks and publishing

- `npm run build`: run the public-boundary and music checks, then export to `out/`.
- `npm run check:fast` and `npm run check:release`: build once, then check the exported shelf with JavaScript off and open a record with it on. The check uses a temporary Chromium profile.
- `npm run check:navigation:dom`: exercise the rendered public boundary in Chrome.
- `npm run check:worker`: check repeat-visit caching, background refreshes, offline failures and cache isolation from other apps.
- `npm run publish:check`: verify registered public surfaces and exported routes.
- `npm run publish:ready`: run the full publication gate.
- `node scripts/build-music-ranking.mjs --history-root PRIVATE_HISTORY_DIRECTORY`: refresh the public song and artist ranking from the private history's prepared top 1,000.
- The link-preview card, `public/share-card-music.jpg`, is the shelf's first screen captured at 1200×630 with headless Chrome once the sleeves have loaded. When the first screen changes, capture it again under a new filename so link previews drop their cached copy.

Public surface metadata lives in `data/public-surfaces.json`. API-backed refreshes belong in Cloudflare Workers rather than local schedulers or data-mutating GitHub Actions. See [Publication Workflow](docs/publication-workflow.md).
