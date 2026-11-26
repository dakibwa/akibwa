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
leave the dashboard-managed domain and any zone routes untouched. Do not
add domain routing to Wrangler or broaden the deployment token to manage DNS.
GitHub Pages is retained as a manual fallback; it no longer publishes on push.

The game and its account service live at `features.games`. Their former page and API addresses on akibwa.com return 404. Hosting checks verify both the retired paths and the game’s health on its own domain.

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
routing. Publish the `out/` tree: the music shelf, album artwork,
listening data, fonts and the legacy `/meditator/sw.js` that unregisters old installations are
part of it. `.assetsignore` excludes `CNAME` and `.nojekyll`, which remain in
the export for the GitHub Pages fallback, and the game's `/features/` copy,
which `features-site` deploys on its own (see below).

`npm run check:hosting -- <origin>` checks exported HTML and representative asset
bytes, security headers, retired page and asset 404s, the `www` redirect,
caching, preview indexing and production API health
at `features.games`. Keep a direct browser run-through of the affected pages
alongside this check.

## Routing and response policy

- The shelf at `/` is the only public page and the only sitemap entry. Old room fragments and query strings clear from the homepage address bar.
- Missing and retired page paths, including the former Trek and game pages, serve the exported error page with HTTP status 404. The manual GitHub Pages fallback also excludes the game.
- `public/_headers` preserves the six production security headers and existing
  public asset CORS behavior. Features' additional hardened meta CSP is left
  byte-for-byte intact.
- The zone's active `security headers` response transform matches
  `(http.host eq "akibwa.com" and not (http.request.uri.path eq "/features/api" or starts_with(http.request.uri.path, "/features/api/")))`.
  The exception dates from when the game API used that path. It now serves the same static 404 as other retired addresses.
- Fingerprinted `/_next/static/*` files receive one-year immutable caching.
  HTML, artwork with stable filenames, JSON and service workers retain
  Cloudflare's default `public, max-age=0, must-revalidate` behavior.
- The zone's configuration rule setting `disable_rum: true` for `/features` and
  `/features/*` kept analytics out of the game while it was served here. Those
  old game pages now return 404.
  Avoid `Cache-Control: no-transform` as a beacon exclusion: it also disables
  compression. See the
  [configuration rule settings](https://developers.cloudflare.com/rules/configuration-rules/settings/#disable-real-user-monitoring-rum).
- The existing zone-managed robots policy prepends Cloudflare's Content Signals
  and crawler rules to the generated `robots.txt`. Keep that provider policy.
  The public-domain check permits only its single marked block and comment
  preface, followed by the exact authored file with nothing added after it.
  Preview robots and every other asset remain exact whole-file comparisons.

## Continuous deployment

`.github/workflows/deploy-cloudflare.yml` runs on changes pushed to `main`,
excluding Markdown and `docs/**`, and can also be dispatched manually. It builds
one export with the release check, deploys it, then verifies the exact served
bytes on both the preview and public domain. Each exact-byte page, browser request
variant and sampled asset gets up to 60 seconds to serve this build's version,
plus any required header policy. Files can propagate independently after Wrangler
finishes, so a current homepage does not establish that a manifest, icon or sitemap
is ready. After readiness, all content, security and route assertions run once,
using the matched responses instead of refetching during propagation. A wrong artifact
at the deadline or any failed assertion fails the workflow; check the affected
response before treating a release as complete.

The workflow uses the `CLOUDFLARE_API_TOKEN` GitHub secret and
`CLOUDFLARE_ACCOUNT_ID` repository variable. The approved account token has only
**Workers Scripts: Edit** on the owning account. It has no DNS, zone routing,
KV, R2 or D1 permission. The token is exposed only to the configuration check
and Wrangler deploy steps; dependency installation, builds and verification do
not receive it. Never substitute a developer's OAuth token or widen this scope
for an asset deployment. The existing limited-token workflow was verified
before the domain cutover.

Features publishes its stripped and hardened client to `dakibwa/akibwa` under
`public/features/` (the repository was renamed from `dakibwa/dakibwa` on 17
September 2026; its deploy key, secrets and paths carried over). That push
triggers the Cloudflare workflow, which is how `features.games` is served, so
preserve the publication path.

## Features standalone domain

`features.games` is the game's only address. The verified `out/features/`
export deploys to the static-only `features-site` Worker using
`wrangler-features.jsonc`. The dashboard owns `features.games` and
`www.features.games`; a zone redirect canonicalises `www`. The API route
`features.games/features/api/*` points to the `features-api` Worker and
database, which belong to the Features repository with the client and account
configuration.

`scripts/prepare-features-site.mjs` adds root-specific headers, old-path aliases,
robots, sitemap and a real 404 after Akibwa's export verification. It
never rebuilds or edits the game. Its sitemap lists the front page and every
page of the game's copy that names its own `features.games` address in a
canonical link and carries no `noindex`. The press page meets those criteria.
The legal and stats pages carry `noindex`, so the sitemap skips them. The
Features repository controls which game pages qualify. Akibwa's own
sitemap is separate (`app/sitemap.js`) and still lists `/` alone.

Change notices to search engines are left to Cloudflare. Dan chose the
`features.games` zone's Crawler Hints switch (dashboard: Caching, then
Configuration) on 12 November 2026, over a script in this deploy that sent the
same IndexNow notices itself and was closed unmerged as #95. While the switch
is on, Cloudflare tells Bing and the engines that share IndexNow when a page it
serves looks changed, judging by its own cache. Nothing in this repository
sends a notice or holds a key for one, and Google reads the sitemap either way.
When the notices arrive, the IndexNow page of Bing Webmaster Tools names
Cloudflare as their source.

`check-features-hosting.mjs` verifies exact
game/asset bytes, aliases, caching, security and production API health. Its
workers.dev preview has no account proxy. CI deploys both static Workers using
the same existing account-scoped Workers Scripts credential, without DNS access.

## Manual fallback

`.github/workflows/deploy-pages.yml` remains available through
`workflow_dispatch` only. Running it updates the GitHub Pages copy; it does not
change the public domain or disable Cloudflare publishing.

If the static origin needs to return to GitHub Pages, first obtain a successful
manual Pages deployment. Then coordinate the dashboard Custom Domain and DNS
rollback (the previous apex used proxied A records `185.199.108.153`,
`185.199.109.153`, `185.199.110.153` and `185.199.111.153`), preserve the `www`
redirect, and move the main-push trigger back to
Pages in the same operation. Verify the public pages and Features API before
calling the rollback complete. Do not operate two automatic production
publishers.

## Primary references

- [Workers Static Assets recommendation](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/#use-workers-static-assets-for-new-projects)
- [Static asset billing and limits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Static generation, HTML routing and real 404 pages](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [Static response headers](https://developers.cloudflare.com/workers/static-assets/headers/)
- [Cloudflare managed robots and existing files](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/#existing-robotstxt-file)
- [Custom Domains and interaction with existing routes](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#interaction-with-routes)
- [Workers deployment through GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
