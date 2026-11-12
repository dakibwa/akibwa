# Akibwa Core Site Notes

This repository is the public `akibwa.com` website.

- Treat everything committed here as public.
- Do not add credentials, tokens, `.env` files, booking references, account numbers, raw source exports, identifiers, or similar secrets.
- Dan explicitly approved the Daniel/Akibwa introduction, the selectively restored public career roles/dates and taste curation in `data/taste-curation.json`, and Instagram/X at `@dakibwa`. This is not permission to restore other removed personal data. Do not publish the owner's full name, residential history, future-move dates, personal email in static HTML, daily GPS traces, health details, family details, or identifying third-party information.
- Scoped GPS exception (Dan, 2026-09-05; explicitly reaffirmed 2026-09-07): Dan explicitly answered “Yes, publish this 2019 GPS route” to publication of the detailed route from the 52 Paris-to-Sofia recordings on public akibwa.com. `public/trek/route-detail.json` contains only that 2019 route's simplified coordinates and day/segment grouping. This exception excludes sample timestamps, biometrics, private identifiers, raw source files and every other journey.
- Dan approved album and podcast counts from all available Spotify, YouTube, Last.fm and Apple listening history (5 September 2026). `public/listening-catalogue.json` owns the reconciled public aggregates; [docs/listening-history.md](docs/listening-history.md) defines matching, overlap bounds and regeneration. Raw events, account identifiers and private source paths stay outside this public repository. Counts are recorded plays/views, not completed albums or episodes. Recorded duration remains Spotify-only; never infer YouTube watch time.
- `data/taste-curation.json` owns the approved job statements, cultural selection and verified public artwork. It must not duplicate old provider-only listening counts. Taste and album cards show counts on hover/focus and do not open details or navigate on click.
- Keep only `/` in the sitemap unless a route has been explicitly approved for search. Standalone detail surfaces such as `/trek/` must use `noindex`, and `robots.txt` must continue allowing crawlers to read that directive.
- The site is one page. Dan had the album archive, the wall and the old project pages deleted on 22 September 2026: retire surfaces by deleting their code, styles, data and artwork and adding 301s to `public/_redirects`, never by keeping stub pages. Do not restore them.
- From 9 November 2026 (Dan's instruction), the personal homepage has four things: music, trek, career and Oh Life! Studios. The first three open in place with their own hash and history entry; the studio links to https://ohlifestudios.com. It credits Features, Portudo and Português com a Inês. Legacy `#features` links go straight to https://features.games/; `#websites` links go to the studio. The existing `/trek/` files must remain. Rooms carry no visible titles and the bar no wordmark. Preserve the orange Akibwa `a`, its ink outline, dragging, eyes and varied play; do not restore other mascots.
- Dan asked on 24 September 2026 for his top 1,000 songs and top albums with the hours he listened, and on 25 September for one albums/songs switch over square sleeves (covers never cropped) packed with no holes and sized by hours, Music for Psychedelic Therapy a touch larger than Graceland and Discreet Music a little smaller (their true hours still shown), all 1,000 songs at once, a visible minimum size with small sleeves growing on hover, high-resolution sleeves, and no explanatory text. Later that day he asked for the switch and the bar to answer at once, the map to rearrange smoothly on resize, a track sheet that doesn't select with each bar washing in its own colour on hover, the Features game reaching the edges of its paper frame (framed like the trek), and on the front page music drawn as large as the other things, the cards, windows, trek route and career trail drawing in, and Castle Bank's mark on the back window. `public/music-ranking.json` publishes only titles, artists, plays, the YouTube share and minutes played (Spotify playback), and for each of the top 100 albums the tracks he played with their plays and minutes, built by `scripts/build-music-ranking.mjs` from the private history's prepared ranking; dates, track URIs, raw events and account detail never leave the private history. On 26 September 2026 Dan approved publishing each of those albums' and songs' hours by calendar year for a line of years in the room (`public/music-years.json`: whole years and Spotify minutes only, never a day, time or event), and asked for songs to open their album's track list, Spotify and Apple Music links on every sheet (`public/music-links.json`, or a search where no release is confirmed), every sleeve checked against an independent cover of its album or by eye (`data/music-sources.json`, enforced by `check:navigation`), and one command to rebuild the room from the history (`npm run music:refresh -- --history-root …`; the path is never committed).
- Product and client-site credits belong at Oh Life! Studios. Akibwa has one studio link in place of the old Features and Websites entries. Do not add studio products as separate personal homepage sections.
- The site is a static Next.js export (`output: "export"`) deployed from `main` to Cloudflare Workers Static Assets. The Cloudflare dashboard owns the `akibwa.com` Custom Domain; omit `route` and `routes` from Wrangler so asset deploys preserve it. [docs/cloudflare-config.md](docs/cloudflare-config.md) records hosting, credentials and the manual GitHub Pages fallback.
- Fast pre-push check: `npm run check:fast`.
- Release check: `npm run check:release` (the same static build for this small site).
- Public surface registry: `data/public-surfaces.json`.
- Publication checks: use the scoped commands under Default Publish Flow below.
- Hosting verification: `npm run check:hosting -- <origin>` after building and deploying the exact export.
- Features lives only at `features.games`. The Features repository owns its client and API and publishes the game into `public/features/`; that copy is what `features-site` serves at `features.games` through `wrangler-features.jsonc` (see the Features section of `docs/cloudflare-config.md`), so keep it. The old address `akibwa.com/features` was retired on 12 November 2026: `public/_redirects` sends `/features`, `/features/` and everything beneath them to the same path on `features.games` with a 301, and `public/.assetsignore` leaves the copy out of the `akibwa-site` upload.

## Artwork and images

`output: "export"` forces `images.unoptimized`, so `next/image` cannot resize
anything — it emits a plain `<img>` with the original file. Responsive variants
are therefore pre-rendered at build time and committed.

- Render artwork with `<SiteImage>` (`components/site-image.jsx`), never a bare
  `<img>` or `next/image`. It emits AVIF with a WebP fallback and the right
  `srcset`. CSS backgrounds go through `resolveBackground()`.
- Every image is bound to a **slot** — the layout it renders into — in
  `scripts/generate-image-variants.mjs`. A slot carries the aspect ratio, the
  CSS widths it takes at real breakpoints, and the `object-position` the layout
  applies. Variants are cropped to the slot, so the crop position must match
  what the CSS does or the artwork silently reframes.
- After adding or replacing artwork, record existing edits in `public/_img/`
  and `components/image-variants.json`, then run `npm run images:generate`.
  The generator re-encodes every rung, and AVIF bytes differ between encoder
  builds. Commit only intended artwork changes. Discard unrelated generation
  churn only if it was introduced by this run, preserving pre-existing edits
  even when they share a file with generated changes.
- `npm run check:images` (part of `publish:ready`) fails if a source has changed
  since its variants were generated.
- The general slot ladder caps at 1.5x DPR. Album sleeves use one separate
  264px rung (`public/album-art/<id>-wall.*`) for the ~130px Music tiles.
- **Export artwork once, at final size.** Re-encoding an already-lossy WebP
  keeps the previous generation's artefacts as detail and inflates the file:
  `contact-blue-clouds.webp` costs 437K for 899x1198 that way, and no amount of
  re-encoding recovers it — only resizing does.

## Default Publish Flow

**Standing policy (Dan, 2026-06-23): completed changes go live immediately. Ship by default — do not ask for per-change approval, and do not park finished work behind an unmerged PR or leave it local-only.**

- For completed public Akibwa site changes: validate locally (`npm run check:fast`), commit the scoped change, get it onto `main` (push directly, or open a PR and merge it straight away once checks pass — don't wait for a separate "please publish"), then confirm the Cloudflare deploy succeeded and verify the live `akibwa.com` surface. GitHub Pages is a manual fallback, not the automatic publication target.
- `check:fast` and `check:release` intentionally run the same ~15-second static build: this site is small enough that a second, weaker gate would add vocabulary without shortening the loop. Use `npm run publish:ready` only when publication metadata, public surface routing, cloud refresh checks, or generated public data are touched.
- Use the smallest relevant check while iterating. Markdown and `docs/**`-only changes do not require a site build or deployment; the Cloudflare workflow intentionally ignores them.
- Do not leave finished changes local-only unless Dan explicitly asks for a preview, local-only work, or a paused WIP state.
- If the checkout has unrelated local edits, use a clean worktree based on `origin/main` and stage only the intended files. Do not include, revert, or overwrite unrelated worktree changes.
- Pause before pushing only when validation fails, the change could expose private or sensitive data, the intended behaviour is ambiguous or high-impact, or credentials/secrets/public-data boundaries are involved. Outside those cases, ship without asking.

## Documentation

- Trek presentation, approved route projection and graphics fallback: [docs/trek-design.md](docs/trek-design.md).

- Git and the live site own implementation and delivery truth. Update the relevant repository documentation in the same commit whenever a material change alters public behaviour, architecture, publishing, or the next product milestone.
