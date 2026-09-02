# Akibwa Core Site

Public site for [akibwa.com](https://akibwa.com), exported statically with Next.js and deployed from `main` through GitHub Pages.

The indexed homepage is deliberately brand-led: Akibwa, three current projects and three broad capabilities. It does not publish a personal biography, employment timeline, residential history, taste archive, direct social links or a static email address. Detailed archive routes remain available only by direct link and use `noindex`; only `/` is advertised in the sitemap.

## Projects

- Features is a playable daily untangling puzzle.
- Português com a Inês links to its own lesson and booking site.
- `/trek/` is a `noindex` static atlas of the original Paris-to-Sofia journey. It retains the exact dated route, daily distances, activity metrics, photo capture times and full photograph set. Journal excerpts are limited to neutral route observations: first-person reflection and personal, health, relationship, financial, accommodation and identifying third-party details are excluded.

## Checks and publishing

- `npm run build`: run the public-boundary and Trek privacy contracts, then export to `out/`.
- `npm run check:navigation:dom`: exercise the rendered public boundary in Chrome.
- `npm run publish:check`: verify registered public surfaces and exported routes.
- `npm run publish:ready`: run the full publication gate.
- `npm run trek:build`: rebuild the Trek from the exact route data and privacy-edited journal.

Public surface metadata lives in `data/public-surfaces.json`. API-backed refreshes belong in Cloudflare Workers rather than local schedulers or data-mutating GitHub Actions. See [Refresh Routing](docs/refresh-routing.md) and [Publication Workflow](docs/publication-workflow.md).
