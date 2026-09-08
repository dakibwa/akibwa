# Cloudflare hosting for akibwa.com

The site remains a Next.js static export. Cloudflare Workers Static Assets serves
the existing `out/` tree without a Next.js server, a framework adapter, or another
application Worker. Cloudflare now recommends Workers Static Assets for new
static hosting; asset requests are free and unlimited. The current export fits
the Free plan's 20,000-file and 25 MiB-per-file limits.

## Current production and preview

The `akibwa-site` Worker serves `akibwa.com` through a Custom Domain managed in
the Cloudflare dashboard. The same deployment is available at
`https://akibwa-site.dakibwa.workers.dev`, with preview URLs excluded from search
through `X-Robots-Tag: noindex`. The Cloudflare zone owns the permanent redirect
from `www.akibwa.com` to the apex, preserving the path and query string.
Its Single Redirect matches only `www.akibwa.com`; the proxied `www` A record
uses Cloudflare's reserved originless address `192.0.2.0`.

`wrangler.jsonc` deliberately omits both `route` and `routes`. Asset deployments
leave the dashboard-managed domain and existing zone routes untouched. Do not
add domain routing to Wrangler or broaden the deployment token to manage DNS.
GitHub Pages is retained as a manual fallback; it no longer publishes on push.

Two existing routes must remain ahead of the static origin:

| Route | Existing Worker |
| --- | --- |
| `akibwa.com/features/api/*` | `features-api` |
| `akibwa.com/onebagger*` | `one-bag` |

Cloudflare treats a Worker Custom Domain as the origin, so existing route
Workers execute before it. Static deployments must not replace these routes
or change their Worker bindings, databases, cookies,
`PUBLIC_ORIGIN`, provider callbacks, or secrets. The static preview has no API
proxy: its `/features/api/*` returns 404, and account/purchase flows belong to
the production origin. Hosting checks probe production API health separately;
account, cookie and purchase behavior is verified on `akibwa.com/features/`.

## Build and deploy

```sh
npm ci
npm run publish:ready
npm run deploy:cloudflare -- --dry-run
npm run deploy:cloudflare
npm run check:hosting -- https://akibwa-site.dakibwa.workers.dev
npm run check:hosting -- https://akibwa.com
```

The deployment command uploads the already-checked export once, updating both
the public site and preview. It does not build a second copy or change domain
routing. Publish the whole `out/` tree:
standalone `/features/`, `/probe/`, `/meditator/` and `/trek/`, generated artwork,
listening data, fonts and service-worker retirement files are part of it.
`.assetsignore` excludes `CNAME` and `.nojekyll` from Cloudflare assets; these
files remain in the export for the GitHub Pages fallback.

`npm run check:hosting -- <origin>` checks exported HTML and representative asset
bytes, Features' script hashes and native marker, security headers, canonical
game and `www` redirects, real 404s, caching, preview indexing and production API health.
Keep a direct browser run-through of the affected pages alongside this check.

## Routing and response policy

- Folder index pages keep trailing slashes. `/features` keeps its existing 301
  to `/features/`. Explicit `index.html` links remain usable through Cloudflare's
  canonical HTML redirect.
- Missing paths serve the exported `404.html` with status 404. There is no
  homepage fallback for missing or retired routes such as `/life-map/`.
- Legacy route pages keep their current JavaScript redirects. The old proposed
  redirect table was stale: `/offer`, `/systems`, `/work`, `/personal`,
  `/projects`, `/professional`, `/about` and `/contact` now return to `/`;
  `/portugal` points to `https://portuguesewithines.com/`. Deep personal links
  still target their corresponding project route. Do not restore old targets.
- `public/_headers` preserves the six production security headers and existing
  public asset CORS behavior. Features' additional hardened meta CSP is left
  byte-for-byte intact.
- Fingerprinted `/_next/static/*` files receive one-year immutable caching.
  HTML, artwork with stable filenames, JSON and service workers retain
  Cloudflare's default `public, max-age=0, must-revalidate` behavior.

## Continuous deployment

`.github/workflows/deploy-cloudflare.yml` runs on changes pushed to `main`,
excluding Markdown and `docs/**`, and can also be dispatched manually. It builds
one export with the release check, deploys it, then verifies the exact served
bytes on both the preview and public domain. A failed verification fails the
workflow; check the affected response before treating a release as complete.

The workflow uses the `CLOUDFLARE_API_TOKEN` GitHub secret and
`CLOUDFLARE_ACCOUNT_ID` repository variable. The approved account token has only
**Workers Scripts: Edit** on the owning account. It has no DNS, zone routing,
KV, R2 or D1 permission. The token is exposed only to the configuration check
and Wrangler deploy steps; dependency installation, builds and verification do
not receive it. Never substitute a developer's OAuth token or widen this scope
for an asset deployment. The existing limited-token workflow was verified
before the domain cutover.

Features continues publishing its stripped and hardened client to
`dakibwa/dakibwa` under `public/features/`. That push triggers the Cloudflare
workflow, so preserve the repository and publication path.

## Manual fallback

`.github/workflows/deploy-pages.yml` remains available through
`workflow_dispatch` only. Running it updates the GitHub Pages copy; it does not
change the public domain or disable Cloudflare publishing.

If the static origin needs to return to GitHub Pages, first obtain a successful
manual Pages deployment. Then coordinate the dashboard Custom Domain and DNS
rollback (the previous apex used proxied A records `185.199.108.153`,
`185.199.109.153`, `185.199.110.153` and `185.199.111.153`), preserve both API
Worker routes and the `www` redirect, and move the main-push trigger back to
Pages in the same operation. Verify the public pages and Features API before
calling the rollback complete. Do not operate two automatic production
publishers.

## Primary references

- [Workers Static Assets recommendation](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/#use-workers-static-assets-for-new-projects)
- [Static asset billing and limits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Static generation, HTML routing and real 404 pages](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [Static response headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Custom Domains and interaction with existing routes](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#interaction-with-routes)
- [Workers deployment through GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
