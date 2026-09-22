# Akibwa Core Site

Public site for [akibwa.com](https://akibwa.com), exported statically with Next.js and deployed from `main` to Cloudflare Workers Static Assets. GitHub hosts the code and runs the deploy workflow; GitHub Pages is only a manual fallback. See [the hosting contract](docs/cloudflare-config.md).

The homepage introduces Daniel/Akibwa, then presents Projects → an airy Career timeline → a horizontal Taste Library. The approved career roles, cultural curation and Instagram/X links are restored selectively, not by reverting privacy work. Residential and private life history stay out; the email address is assembled only after activation. Only `/` is advertised in the sitemap.

The site is one page. Old pages (the album archive, the wall and the earlier project pages) were deleted; their links 301 to the homepage from `public/_redirects`. The Taste Library's Music shelf loads the full reconciled listening catalogue on demand. See [the interaction and privacy contract](docs/navigation-animation-contract.md).

## Projects

- Features is a playable daily untangling puzzle.
- Português com a Inês links to its own lesson and booking site.
- `/trek/` is a `noindex` interactive relief of the original Paris-to-Sofia journey, with the original SVG Atlas as a selectable graphics fallback. It retains the exact dated route, daily distances, activity metrics, photo capture times and full photograph set. Journal excerpts are limited to neutral route observations: first-person reflection and personal, health, relationship, financial, accommodation and identifying third-party details are excluded.

## Checks and publishing

- `npm run build`: run the public-boundary and Trek privacy contracts, then export to `out/`.
- `npm run check:navigation:dom`: exercise the rendered public boundary in Chrome.
- `npm run publish:check`: verify registered public surfaces and exported routes.
- `npm run publish:ready`: run the full publication gate.
- `npm run trek:build`: rebuild the Trek from the exact route data and privacy-edited journal.
- `npm run check:trek:dom`: exercise relief, playback, phone layouts and graphics failure paths. See [the Trek design and source contract](docs/trek-design.md).

Public surface metadata lives in `data/public-surfaces.json`. API-backed refreshes belong in Cloudflare Workers rather than local schedulers or data-mutating GitHub Actions. See [Publication Workflow](docs/publication-workflow.md).
