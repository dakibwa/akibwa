# Akibwa Core Site

Public site for [akibwa.com](https://akibwa.com), exported statically with Next.js and deployed from `main` through GitHub Pages.

The homepage introduces Daniel/Akibwa, then presents Projects → an airy Career timeline → a horizontal Taste Library. The approved career roles, cultural curation and Instagram/X links are restored selectively, not by reverting privacy work. Residential and private life history stay out; the email address is assembled only after activation. The full album archive remains `noindex`; only `/` is advertised in the sitemap.

The archive has searchable, source-specific album counts and paginated artwork. The archive keeps the Spotify summary, leaving the homepage as a light editorial index. That summary is an approved aggregate of recorded music audio, not a lifetime total or an estimate of attention. Last.fm track scrobbles remain separate. See [the interaction and privacy contract](docs/navigation-animation-contract.md).

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

Public surface metadata lives in `data/public-surfaces.json`. API-backed refreshes belong in Cloudflare Workers rather than local schedulers or data-mutating GitHub Actions. See [Refresh Routing](docs/refresh-routing.md) and [Publication Workflow](docs/publication-workflow.md).
