# Working on akibwa.com

This public repository serves one page, the music shelf at `/`. Everything committed
here is public. Git records the implementation and the live site shows what shipped.

## Public data and routes

- Publish only the approved music aggregates from Spotify, YouTube and Last.fm.
  Counts mean recorded plays or views. Use Spotify playback for known duration.
  After the Spotify export ends, use each song's usual Spotify length for its Last.fm
  plays, or three and a half minutes for a new song, on the album Last.fm names.
  YouTube contributes views only. [Counting, matching and refresh](docs/listening-history.md)
- Keep raw exports, events, track URIs, timestamps, private source paths, account identifiers,
  booking references, account numbers, credentials, tokens and `.env` files out of the repo.
  Public listening history may be grouped by whole calendar year. Never publish the owner's full
  name, residential history, move dates, personal email in static HTML, daily GPS traces, health
  or family details, or identifying information about anyone else. The page's title and
  description give his first name alone. He chose “Dan’s Listening History”
  as the page title on 26 November 2026. The site name is Akibwa.
- Dan retired the front page, rooms, mascot, name change, contact and studio links, night
  paper, career roles, taste curation and podcasts on 16 November 2026. The Trek, its route,
  photographs and journal and the remaining page aliases were retired by 17 November.
  Earlier publication approvals do not carry forward. Retired routes, styles, data, logos and
  artwork stay out. Product and client credits belong at Oh Life! Studios.
- List only `/` in the sitemap; add another route only when Dan asks for it to be searchable.
  Old room bookmarks open the shelf at the bare homepage. Missing page paths return HTTP 404.
  Any standalone detail surface he asks for needs `noindex` with crawling allowed in `robots.txt`.
  [Public surface registry](data/public-surfaces.json) · [Route checks](docs/publication-workflow.md#public-routes)

## The music shelf

The shelf holds the top 1,000 records by listening hours, albums and singles together, with
four orders, search and a sheet for each record that shows under the pointer. For changes to ranking, covers,
the signature, layout, keyboard, motion or the track sheet, read [the shelf guide](docs/music-shelf.md).
The [listening history guide](docs/listening-history.md) covers how to regenerate public data
from the private source.

## Publish a change

- Use the smallest relevant check while editing. For a site change, `npm run check:fast`
  or `npm run check:release` builds once and checks that the exported shelf opens a record.
  Run `npm run publish:ready` for publication metadata, routing, cloud refresh checks or
  generated public data. Markdown and `docs/**`-only changes skip site builds and deployments.
- Dan's standing instruction is to ship completed public changes immediately unless he asks
  for a preview, local-only work or a pause. Stage the scoped change, get it onto `main`,
  confirm the Cloudflare deployment succeeded and verify the affected live surface.
  `npm run check:hosting -- <origin>` checks the exact built export after deployment.
  When the checkout contains other work, use a clean worktree from `origin/main`.
- Pause before pushing on failed validation, ambiguous or high-impact behaviour, or a change
  involving credentials, secrets, private data or public-data permissions. Update the owning
  document in the same commit when behaviour, architecture, publishing or the next milestone changes.
- A static Next.js export goes from `main` to Cloudflare Workers Static Assets. The dashboard
  owns the Custom Domain. Keep `route` and `routes` out of Wrangler. GitHub Pages is the
  manual fallback. [Hosting and deployment](docs/cloudflare-config.md)
- Keep `public/features/`. The Features repository publishes its client there for
  `features-site` at `features.games` through `wrangler-features.jsonc` and owns its API.
  Both the Akibwa upload and the Pages fallback exclude the game from akibwa.com.
  [Features hosting](docs/cloudflare-config.md#features-standalone-domain)
