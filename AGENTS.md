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
- Since 24 September 2026 (Dan's redesign request) the page is one sheet of paper with five things — music, features, websites, career and trek — that open in place as rooms with their own hash and history entry; the features and trek rooms frame the standalone `/features/` game and `/trek/` journey (Dan, 25 September 2026). Rooms carry no titles and the bar no wordmark: the bar names the room, and a pencil arrow leads back. Career and the website cards are the previous homepage's components, restyled, not replacements: Dan asked to build on what was there. Taste became Music (albums and songs only) later that day; the Taste Library, films, TV and games were removed. The mascot is the Akibwa `a` (Dan, 24 September 2026), joined on 25 September by `k` and `i`, the next letters of the name, as a cast coming out of a hole where the sun and moon were, all three redrawn that day from Codex drawings Dan chose; the panda mascot was rejected, and the site has no characters besides these letters.
- Dan asked on 24 September 2026 for his top 1,000 songs and top albums with the hours he listened, and on 25 September for one albums/songs switch over square sleeves (covers never cropped) packed with no holes and sized by hours, Music for Psychedelic Therapy a touch larger than Graceland and Discreet Music a little smaller (their true hours still shown), all 1,000 songs at once, a visible minimum size with small sleeves growing on hover, high-resolution sleeves, and no explanatory text. Later that day he asked for the switch and the bar to answer at once, the map to rearrange smoothly on resize, a track sheet that doesn't select with each bar washing in its own colour on hover, the Features game edge to edge in its room, and on the front page music drawn as large as the other things, the cards, windows, trek route and career trail drawing in, and Castle Bank's mark on the back window. `public/music-ranking.json` publishes only titles, artists, plays, the YouTube share and minutes played (Spotify playback), and for each of the top 100 albums the tracks he played with their plays and minutes, built by `scripts/build-music-ranking.mjs` from the private history's prepared ranking; dates, track URIs, raw events and account detail never leave the private history.
- Websites lists the three sites Dan chose on 24 September 2026: Português com a Inês, Castle Bank and Butterfly Rose. Castle Bank's home page names and pictures its founders, Dan included, and nothing on akibwa.com may name Dan in full. Each card is an illustration like Português com a Inês's, never a screenshot of the site (Dan made Castle Bank's and Butterfly Rose's on 25 September 2026). Butterfly Rose is in review with the salon: show it without a link until Dan's build is live on its domain.
- The site is a static Next.js export (`output: "export"`) deployed from `main` to Cloudflare Workers Static Assets. The Cloudflare dashboard owns the `akibwa.com` Custom Domain; omit `route` and `routes` from Wrangler so asset deploys preserve it and the existing Features API and One Bagger Worker routes. [docs/cloudflare-config.md](docs/cloudflare-config.md) records hosting, credentials and the manual GitHub Pages fallback.
- Fast pre-push check: `npm run check:fast`.
- Release check: `npm run check:release` (the same static build for this small site).
- Public surface registry: `data/public-surfaces.json`.
- Publication checks: use the scoped commands under Default Publish Flow below.
- Hosting verification: `npm run check:hosting -- <origin>` after building and deploying the exact export.
- The same checked `out/features/` copy also publishes at `features.games` through `wrangler-features.jsonc`; see the Features section of `docs/cloudflare-config.md`. The Features repository owns its client and API. Preserve the old `/features/` copy for browser-save migration and native compatibility.

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
