# Homepage interaction and privacy contract

Akibwa is a personal editorial index. Run `npm run check:navigation` on every build and `npm run check:navigation:dom` before publication.

## Restoration intent — 5 September 2026

The restored homepage follows the composition at the parent of `78e3ec8a`:
the original name flick, airy `concept-career-timeline`, a native horizontal
Taste rail and coloured word navigation. Graceland leads the curation using its
current catalogue ID. The serif proposition follows `f5a1f602`, with Dan's
current wording. These references own visual character; the approved current
data projection owns what can appear publicly.

Selectively recover presentation, not the old private data. Keep the improved
full `/albums` gallery, stable identities, audited count provenance, safe public
aggregates and dependency-security fixes. “What a Kibler does” and “Make the
mess legible” are rejected. Rewrite supporting copy naturally without replacing
Projects → Career → Taste or the original character of the page.

## Public index

- `/` introduces Daniel/Akibwa, then presents three current Projects → an airy Career timeline → Taste Library. These named restorations, including the Instagram and X profiles at `@dakibwa`, were explicitly approved. Do not restore the rejected capability slogans or unrelated removed personal history.
- `data/taste-curation.json` is a narrow projection of previously published career roles/dates and cultural choices. Residential history, detailed life traces, health and identifying third-party material remain excluded.
- `data/listening-summary.json` is the separately approved Spotify music-audio aggregate: coarse coverage, gaps and definitions only. Never commit raw playback events, account IDs or private source paths. The displayed duration is recorded time, not attention or complete listens. Last.fm track scrobbles are never added to Spotify figures or described as full-album plays.
- The email control is available to people using the page but the address is assembled only after activation; it must not appear in static HTML.
- The root may be indexed, but image indexing and long search snippets are restricted. It is the only sitemap entry.
- Detailed archives and project-detail routes use `noindex`. Crawlers remain allowed in `robots.txt` so they can read those directives.

## Layout and interaction

- The hero uses a two-column editorial composition on wide screens and one reading column on narrow screens.
- Project cards share one image-above-caption anatomy. Descriptions stay in normal flow and are visible for every input mode; no chapter can overlap a floating caption. On phones, projects form a native horizontal snap rail.
- The Daniel/Akibwa name uses the original 220ms word flick: first at 3.2 seconds, then every 4.2 seconds. Invisible sizers hold surrounding text stable. Reduced motion displays Daniel without animation; hidden tabs suspend the timer.
- “Building in the AI age” keeps the historical `concept-lede` treatment from `f5a1f602`: Iowan Old Style/Palatino/Georgia serif, `clamp(1.7rem, 3vw, 3.2rem)`, 1.04 line height and −0.035em tracking. Dan's current wording supersedes the historical “Building in the age of AI.” The contact row stays left-aligned with the proposition.
- Career keeps the original coloured node line and logo cards. Role details work through keyboard focus, tap and hover in one reserved 94px lane, without displacing Taste. Escape and leaving the section by keyboard close held detail. Narrow phones scroll the timeline natively.
- The homepage Taste archive is a native horizontal rail with coloured word navigation, visible titles and creators, and a twelve-cover mixed edit. Each non-music filter exposes its complete approved shelf; Music previews twelve favourites and links to the full catalogue. Spotify statistics live in the full archive so the homepage keeps its light composition. The separate full album archive searches and sorts the complete available catalogue but mounts at most 36 gallery cards per page. Unmatched counts and measured zeroes remain distinct; failed refreshes leave the saved catalogue usable.
- Count provenance belongs to each record. Valid network counts can overlay a valid session snapshot and then the saved catalogue; missing/invalid fields retain their prior count, source and date. Mixed coverage is labelled visibly. Cached data is never called fresh; empty, wholly unmatched, undated, future or older-than-baseline packets cannot overwrite the session cache. An older network packet cannot replace a newer cached record.
- Music keys and deep links use catalogue IDs, not album titles. Equal titles by different artists must remain distinct through reload, modal navigation and browser back.
- Native modal dialogs trap focus, close with Escape/backdrop/close control, and return focus and scroll to the opener. URL state supports browser back and direct album links. Changing album details keeps identity stable during asynchronous count refreshes.
- Restrained blue/orange name accents, rose Career and green Taste rules retain the historical editorial language. Keep the homepage rail distinct from the full gallery's readable two-column mobile layout; do not miniaturise desktop tiles.
- Images disable native dragging and touch callouts without stealing the enclosing link or button target.

## Standalone project surfaces

- Features may show a compact Akibwa banner when entered from the homepage. That banner stays brand-only.
- The Trek is always standalone and excluded from search and image indexes. Its route is abstracted; the separate Trek privacy contract owns its data and image allow-lists.
- After the homepage restoration, improve the Trek's presentation and explore a beautiful 3D/isometric map within those existing privacy boundaries. That requested overhaul is outstanding, not delivered by the homepage work.

## Verification — 5 September 2026

`npm run publish:ready` and `npm run check:navigation:dom` pass for the
restoration. Rendered checks cover 320, 390, 560, 800, 1024 and 1440px widths,
name timing and stable geometry, the visible keyboard/touch career detail,
the native Taste rail, Graceland-first identity, modal focus/back/reload, the
complete paginated album catalogue, reduced motion and the public boundary.
Desktop and phone inspection retains the historical composition with readable
project captions and cover labels. Features' published payload is unchanged.
The 3D/isometric Trek overhaul remains the next Akibwa outcome.
