# Akibwa Core Site

Public site for [akibwa.com](https://akibwa.com), exported statically with Next.js and deployed from `main` to Cloudflare Workers Static Assets. GitHub hosts the code and runs the deploy workflow; GitHub Pages is only a manual fallback. See [the hosting contract](docs/cloudflare-config.md).

The homepage is one sheet of paper in the manner of Kevin Ngo's papercraft Claude film: warm cream stock with soft diagonal bands, pencil lines that are drawn before things become solid, and five hand-drawn things on a ground line under “I’m Daniel.” The name is rubbed out and rewritten as Akibwa on the original timing, and a paper sky wheel turns with it behind a round window: the sun for Daniel, the moon for Akibwa, through a sunset and back through a dawn. Text is not selectable except in fields. Choosing a thing opens its room in place, with its own hash and history entry:

- **taste** — the restored Taste Library wall (songs, artists, albums, films, games, TV and podcasts), with the top 1,000 songs and top 100 artists from `public/music-ranking.json`;
- **features** — a small untangle in Features' own palette: a five-pointed star that settles into a heart (then a house and a leaf), its threads bending into the outline as it colours in, never a stamp; and the way to features.games;
- **websites** — the previous homepage's project cards for the three sites Dan chose: Português com a Inês, Castle Bank and Butterfly Rose (unlinked while it is in review with the salon);
- **career** — the restored career timeline and its statement lane;
- **trek** — the standalone `/trek/` journey.

The approved career roles, cultural curation and Instagram/X links are restored selectively, not by reverting privacy work. Residential and private life history stay out; the email address is assembled only after activation. Only `/` is advertised in the sitemap. Old pages (the album archive, the wall and the earlier project pages) were deleted; their links 301 to the homepage from `public/_redirects`. See [the interaction and privacy contract](docs/navigation-animation-contract.md).

## Projects

- Features is a playable daily untangling puzzle.
- Português com a Inês links to its own lesson and booking site.
- Castle Bank links to castle-bank.com; its card is a screenshot from `node scripts/capture-websites.mjs` with the founders' named photographs hidden.
- Butterfly Rose's card is a screenshot of the salon's review build (`--from` a local server) and has no link until the site is live on its domain.
- `/trek/` is a `noindex` interactive relief of the original Paris-to-Sofia journey. It retains the exact dated route, daily distances, activity metrics, photo capture times and full photograph set. Journal excerpts are limited to neutral route observations: first-person reflection and personal, health, relationship, financial, accommodation and identifying third-party details are excluded. The walk now waits for its landscape: its pace never outruns the map tiles that have arrived.

## Checks and publishing

- `npm run build`: run the public-boundary and Trek privacy contracts, then export to `out/`.
- `npm run check:navigation:dom`: exercise the rendered public boundary in Chrome.
- `npm run publish:check`: verify registered public surfaces and exported routes.
- `npm run publish:ready`: run the full publication gate.
- `npm run trek:build`: rebuild the Trek from the exact route data and privacy-edited journal.
- `npm run check:trek:dom`: exercise relief, playback, phone layouts and graphics failure paths. See [the Trek design and source contract](docs/trek-design.md).
- `node scripts/build-music-ranking.mjs --history-root PRIVATE_HISTORY_DIRECTORY`: refresh the public song and artist ranking from the private history's prepared top 1,000.
- `node scripts/capture-websites.mjs`: refresh the Castle Bank card screenshot (Butterfly Rose: `node scripts/capture-websites.mjs butterfly-rose --from <review build>`), then `npm run images:generate`.
- The link-preview card, `public/share-card-paper.jpg`, is the front page's first screen captured at 1200×630 (2× then downsized) with reduced motion, so the name and five things are at rest.

Public surface metadata lives in `data/public-surfaces.json`. API-backed refreshes belong in Cloudflare Workers rather than local schedulers or data-mutating GitHub Actions. See [Publication Workflow](docs/publication-workflow.md).
