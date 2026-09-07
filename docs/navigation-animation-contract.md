# Homepage interaction and privacy contract

Akibwa is a personal editorial index. Run `npm run check:navigation` on every build and `npm run check:navigation:dom` before publication.

## Restoration intent — 5 September 2026

The restored homepage follows the composition at the parent of `78e3ec8a`:
the original name flick, airy `concept-career-timeline`, a native horizontal
Taste rail and coloured word navigation. The curated music follows listening
order using current catalogue IDs. The serif proposition follows `f5a1f602`, with Dan's
current wording. These references own visual character; the approved current
data projection owns what can appear publicly.

Selectively recover presentation, not the old private data. Keep the improved
full `/albums` gallery, stable identities, reconciled counts, safe public
aggregates and dependency-security fixes. “What a Kibler does” and “Make the
mess legible” are rejected. Rewrite supporting copy naturally without replacing
Projects → Career → Taste or the original character of the page.

## Public index

- `/` introduces Daniel/Akibwa, then presents three current Projects → an airy Career timeline → Taste Library. These named restorations, including the Instagram and X profiles at `@dakibwa`, were explicitly approved. Do not restore the rejected capability slogans or unrelated removed personal history.
- `data/taste-curation.json` is a narrow projection of previously published career roles/dates and cultural choices. Residential history, detailed life traces, health and identifying third-party material remain excluded.
- The later 5 September request restores the eight original public career statements and expands Podcasts to the recorded show library. Only per-show counts and public catalogue metadata are included. Spotify audio/video starts lasting at least 30 seconds rank the shelf; Apple episode records remain separate. Public and subscriber Making Sense feeds are grouped. Missing provider coverage is not a zero, and music-only uploads are excluded.
- `public/listening-catalogue.json` owns the approved Spotify, YouTube, Last.fm and Apple album/show aggregates. [Listening history](listening-history.md) defines exact matching and conservative overlap bounds. Never commit raw events, account IDs or private source paths. `data/listening-summary.json` remains the separate Spotify duration summary; no time is inferred from scrobbles or YouTube views.
- The email control is available to people using the page but the address is assembled only after activation; it must not appear in static HTML.
- The root may be indexed, but image indexing and long search snippets are restricted. It is the only sitemap entry.
- Detailed archives and project-detail routes use `noindex`. Crawlers remain allowed in `robots.txt` so they can read those directives.

## Layout and interaction

- Project images use a compact 5:2 frame. Keep three equal cards on desktop and a native swipe rail capped at 400px through tablet widths; Features must not expand into an oversized full-row image. The Features cover composes its existing wordmark and approved game stamps in `public/project-art/personal/features-discoveries.svg`. Hover and held details do not draw an outer ring around a card; keyboard focus remains visible.
- The hero uses a two-column editorial composition on wide screens and one reading column on narrow screens.
- Project cards share one image-above-caption anatomy. Hover or keyboard focus previews a short serif description and an underlined destination link in the same compact white box as Career and Taste; click/tap holds it open. Share their 280px width (260px on narrow screens), thin accent border, small radius, soft shadow and padding. Align the box below the selected card, following the native rail as it scrolls and clamping it inside the page. Keep repeated titles, category headings and filled buttons out. Escape, another selection and leaving the section by keyboard dismiss it. Space opens over 480ms and closes over 340ms, physically moving the Career divider, while the text shares the same gentle fade and downward movement. Keep the last content mounted during closing so the divider returns smoothly; the closed panel is inert and hidden from assistive technology. On phones, the shared box stays outside the clipped project rail with its link beneath the description. Reduced motion makes both the space and text changes immediate.
- The Daniel/Akibwa name uses the original 220ms word flick: first at 3.2 seconds, then every 4.2 seconds. Invisible sizers hold surrounding text stable. Reduced motion displays Daniel without animation; hidden tabs suspend the timer.
- “Building in the age of AI” stays on one line with the historical `concept-lede` serif treatment. Scale the phone type to fit its available width; do not wrap or clip the phrase. The contact row stays left-aligned; each visible label is `dakibwa`, with platform icons and distinct accessible names.
- Career keeps the original coloured node line and logo cards. Restore the small serif mission text, selective bold emphasis and 280px detail from `88b8661e` (260px on phones). Opening a role expands the section's lower spacing to 140px over 480ms and pushes the Taste divider down; closing returns to the compact spacing over 340ms. The detail fades and moves gently into place. Keyboard, tap, hover and Escape remain available; reduced motion makes these changes immediate. Narrow phones scroll the timeline natively.
- The homepage Taste archive is a native horizontal rail with coloured word navigation and a twelve-cover mixed edit. Desktop covers reveal their title, creator and available play count in one shared panel beneath the rail on hover or keyboard focus. The panel uses the Career detail's typography, fade and downward movement, with 480ms opening and 340ms closing space; retain its content through closing and keep it inside the page when the rail scrolls. Escape, leaving the section, changing category or scrolling the active cover out of view dismisses it. Touch devices keep the title, creator and count visible beneath each cover. Reduced motion makes the reveal immediate.
- Music and Podcasts use the complete available aggregate catalogue, ranked by reconciled counts. Long shelves load another 36 cards near the rail's end, with a keyboard-accessible More control. The closing sentence and Browse all album link are removed. Counts carry no provider labels, and a + marks a conservative lower bound. Taste and album cards remain articles with no click-through, modal or URL change. The full album archive retains visible labels, counts over artwork, search, sorting and 36-card pagination.
- Spotify music-duration statistics live in the full archive. Unmatched counts and measured zeroes remain distinct; failed refreshes leave the saved catalogue usable. The homepage and archive share one refresh hook and the same per-record provenance rules.
- Podcast counts combine the approved Spotify, YouTube and Apple records with verified show identities. Keep recorded starts and views, including clips, distinct from completed listens.
- Count provenance belongs to each record. Valid network counts can overlay a valid session snapshot and then the saved catalogue; missing/invalid fields retain their prior count, source and date. Mixed coverage is labelled visibly. Cached data is never called fresh; empty, wholly unmatched, undated, future or older-than-baseline packets cannot overwrite the session cache. An older network packet cannot replace a newer cached record.
- Music keys use catalogue IDs, not album titles. Equal titles by different artists remain distinct through catalogue refreshes. Old taste-item and album detail hashes do not reopen removed dialogs.
- Restrained blue/orange name accents, rose Career and green Taste rules retain the historical editorial language. Keep the homepage rail distinct from the full gallery's readable two-column mobile layout; do not miniaturise desktop tiles.
- Images disable native dragging and touch callouts without stealing the enclosing link or button target.

## Standalone project surfaces

- Features may show a compact Akibwa banner when entered from the homepage. That banner stays brand-only.
- The Trek is always standalone and excluded from search and image indexes. Its existing exact public route and factual-only journal remain governed by the Trek privacy checker; the [Trek contract](trek-design.md) owns presentation, geographic limits and source allow-lists.
- Trek opens as an interactive terrain relief with an SVG Atlas alternative, explicit playback controls and reachable photo/music context on phones and desktop. It uses the existing public geography and cached elevation.

## Verification — 5 September 2026

The release uses `npm run publish:ready` and `npm run check:navigation:dom`.
Rendered checks cover 320, 390, 560, 800, 1024 and 1440px widths,
name timing and stable geometry, project dropdowns, the visible career statements,
ranked listening rails, hover counts and non-navigation, the
complete paginated album catalogue, reduced motion and the public boundary.
Desktop and phone inspection retains the historical composition with readable
project captions and cover labels. Features' published payload is unchanged.
The separate Trek change implements the requested 3D/isometric presentation;
its design and focused checks are recorded in [trek-design.md](trek-design.md).
