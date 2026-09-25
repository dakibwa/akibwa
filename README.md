# Akibwa Core Site

Public site for [akibwa.com](https://akibwa.com), exported statically with Next.js and deployed from `main` to Cloudflare Workers Static Assets. GitHub hosts the code and runs the deploy workflow; GitHub Pages is only a manual fallback. See [the hosting contract](docs/cloudflare-config.md).

The homepage is one sheet of paper in the manner of Kevin Ngo's papercraft Claude film: warm cream stock with soft diagonal bands, pencil lines that are drawn before things become solid, and five hand-drawn things standing on their shadows under “I’m Daniel” (no full stop). The name wipes to Akibwa and back on the original timing, and a paper sky wheel turns with it behind a round window: a radiant deep-red sun (after Blake's Urizen) for Daniel, a deep blue moon on a dusk sky for Akibwa, through a sunset and back through a dawn. The Instagram, X and email links sit under “Building in the age of AI.”; the bar carries no wordmark. The Akibwa `a`, with square eyes, is the page's mascot: it starts in the sky's round window on a first visit and leaps out once the things are drawn, letting the sun rise into it; it dances, hops over to inspect the five things (which answer as if hovered; on phones it peeks in from the right-hand edge instead) and can be dragged anywhere. Text is not selectable except in fields. Choosing a thing opens its room in place, with its own hash and history entry:

- **music** — an albums/songs switch over squares packed with no holes (albums as their sleeves, songs typeset on paper tints), each as large as its hours listened, the most listened first, with the hours in its corner and high-resolution art where a sleeve is drawn large; all 1,000 songs show at once, no sleeve is smaller than a grid cell, and a small one grows under the pointer or a tap; an album opens its track list with plays and hours per song (`public/music-ranking.json`);
- **features** — the Features game itself (`/features/`), framed in place and filling the room under the bar, as the trek is;
- **websites** — the previous homepage's project cards for the three sites Dan chose: Português com a Inês, Castle Bank and Butterfly Rose (unlinked while it is in review with the salon);
- **career** — every role on its own card, three to a row (two, then one, as the sheet narrows), with its logo, role, years and statement;
- **trek** — the `/trek/` journey framed in place, filling the room under the bar.

The approved career roles, cultural curation and Instagram/X links are restored selectively, not by reverting privacy work. Residential and private life history stay out; the email address is assembled only after activation. Only `/` is advertised in the sitemap. Old pages (the album archive, the wall and the earlier project pages) were deleted; their links 301 to the homepage from `public/_redirects`. See [the interaction and privacy contract](docs/navigation-animation-contract.md).

## Projects

- Features is a playable daily untangling puzzle.
- Português com a Inês links to its own lesson and booking site.
- Castle Bank links to castle-bank.com. Its card and Butterfly Rose's are illustrations Dan made on 25 September 2026, in the manner of Português com a Inês's, not screenshots.
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
- The link-preview card, `public/share-card-paper.jpg`, is the front page's first screen captured at 1200×630 (2× then downsized) with reduced motion, so the name and five things are at rest.

Public surface metadata lives in `data/public-surfaces.json`. API-backed refreshes belong in Cloudflare Workers rather than local schedulers or data-mutating GitHub Actions. See [Publication Workflow](docs/publication-workflow.md).
