# Cloudflare hosting for akibwa.com

The site remains a Next.js static export. Cloudflare Workers Static Assets serves
the existing `out/` tree without a Next.js server, a framework adapter, or another
application Worker. Cloudflare now recommends Workers Static Assets for new
static hosting; asset requests are free and unlimited. The current export fits
the Free plan's 20,000-file and 25 MiB-per-file limits.

## Current production and preview

GitHub Pages is still the production origin behind Cloudflare for `akibwa.com`.
The existing main-push workflow remains enabled. `wrangler.jsonc` deliberately
has no custom domains or zone routes: deploying it creates only the
`https://akibwa-site.dakibwa.workers.dev` preview, with preview URLs excluded from
search through `X-Robots-Tag: noindex`.

Two existing routes must remain ahead of the static origin:

| Route | Existing Worker |
| --- | --- |
| `akibwa.com/features/api/*` | `features-api` |
| `akibwa.com/onebagger*` | `one-bag` |

Cloudflare treats a Worker Custom Domain as the origin, so existing route
Workers execute before it. Attaching the static Worker to `akibwa.com` must not
replace these routes or change their Worker bindings, databases, cookies,
`PUBLIC_ORIGIN`, provider callbacks, or secrets. The static preview has no API
proxy: its `/features/api/*` returns 404, and account/purchase flows continue to
belong to the production origin. Verify production API health separately until
the custom-domain cutover permits a complete same-origin smoke test.

## Build and deploy

```sh
npm ci
npm run publish:ready
npm run deploy:cloudflare -- --dry-run
npm run deploy:cloudflare
npm run check:hosting -- https://akibwa-site.dakibwa.workers.dev
```

The deployment command uploads the already-checked export. It does not build a
second copy or change the production domain. Publish the whole `out/` tree:
standalone `/features/`, `/probe/`, `/meditator/` and `/trek/`, generated artwork,
listening data, fonts and service-worker retirement files are part of it.
`.assetsignore` excludes GitHub's `CNAME` and `.nojekyll` hosting metadata.

`npm run check:hosting -- <origin>` checks exported HTML and representative asset
bytes, Features' script hashes and native marker, security headers, canonical
game redirects, real 404s, caching, preview indexing and production API health.
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

## Continuous deployment and cutover

The prepared Cloudflare workflow is manual. It expects an approved
`CLOUDFLARE_API_TOKEN` GitHub secret and `CLOUDFLARE_ACCOUNT_ID` repository
variable; it fails clearly before building if either is absent. Use a scoped
deployment credential for the existing account that owns `akibwa.com`, never a
developer's OAuth token. An existing authorized Workers Builds Git integration
is another supported automation option and avoids storing the token in GitHub.

Before activating the domain, verify the concrete preview and working automatic
deployment. The final coordinated change must move the existing main-push
trigger to the Cloudflare deployment and disable GitHub's production deploy,
then attach `akibwa.com` as the Worker Custom Domain and verify both existing
API routes, sign-in/cookies and public pages on the unchanged URLs. A pre-existing
CNAME can prevent Custom Domain attachment; inspect the DNS record before the
cutover and keep its previous value available for rollback.

Features continues publishing its stripped and hardened client to
`dakibwa/dakibwa` under `public/features/`. Its push must trigger the new static
deployment, so do not change that repository or publication path.

## Primary references

- [Workers Static Assets recommendation](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/#use-workers-static-assets-for-new-projects)
- [Static asset billing and limits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Static generation, HTML routing and real 404 pages](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [Static response headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Custom Domains and interaction with existing routes](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#interaction-with-routes)
- [Workers Builds integration](https://developers.cloudflare.com/workers/ci-cd/builds/)
