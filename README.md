# Akibwa Core Site

Public portfolio site for `akibwa.com`.

The site is a static Next.js export deployed by GitHub Pages from `main`.
Vitals can publish aggregate health values when intentionally approved. Raw health source exports, identifiers, credentials, and unreduced private artifacts should stay out of this repository.

Data refreshes that can run from API credentials or public seeds should run in Cloudflare Workers, not local schedulers or data-mutating GitHub Actions. See [Refresh Routing](docs/refresh-routing.md).
