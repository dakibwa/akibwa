# Trek: Paris to Sofia

This is a friend's view of a long walk: follow the real paths through rivers,
mountains and towns, with the day's photographs, route notes and music beside
the landscape. Dan selected Paths as the only map view on 5 September 2026.

## Presentation

- Keep one 3D map across all seven countries. The opening shows the whole
  journey; walking brings the camera to the current recorded path. No Atlas
  or coarse relief selector appears in the page.
- Warm paper, sage terrain, a Fraunces title and orange progress establish the
  visual foundation. The current path has a pale outline; upcoming recordings
  are grey. Keep roads, trails, mountains and towns readable behind the route.
- Present the route as an open field journal. Give the chapter title a strong
  serif hierarchy, date the page, frame the day's photograph and set its factual
  note in readable editorial type. A quiet record sleeve sits beside the map;
  describe its link to the original day's title without implying audio playback.
- Six chapter tabs provide useful starting points, with photograph previews on
  desktop hover and keyboard focus. The distance marks below them show the rhythm
  of all 67 numbered days. Mark heights use daily kilometres, not elevation;
  days 16–17 share their recording and unrecorded days remain visible gaps.
  An accessible range control scrubs to a day. Keep exact metrics in the day and
  a whole-walk dialog, with cumulative distance and remaining kilometres beside
  the timeline. Avoid bringing back a dashboard of equally weighted stat tiles.
- Enlarged photographs include the day's note, arrow-key navigation and a
  contact strip. Browsing photos must preserve the exact route position. On
  phones, a compact journal leaves the terrain visible; Read the day expands
  the complete note, photograph and record. Returning restores the landscape.
  Resize must preserve the journey clock. Respect reduced motion for photo,
  journal and record transitions; do not animate the whole surface continuously.
- The map stage is fixed. A sticky stage can make focusing a control change
  page scroll and accidentally jump to another day. Camera padding reserves
  space for the card without moving the geographic centre onto another hill.
- Scroll, the day picker, country links, chapters and playback share one clock.
  Explicit Pause, Resume, Replay and Reset remain available. Dragging or zooming
  pauses following and exposes Follow again; Whole day fits the selected track.
  Manual input, Escape and hidden pages pause playback. Respect reduced motion.
- Photos and records open in keyboard-accessible dialogs and remain available
  if the map cannot load. A map error must explain the loss without replacing
  the user's day. Keep photo-day markers qualified when exact location is unknown.

## Geography and source ownership

`data/trek-days.json`, `data/trek-journal.json`, the existing photo manifest and
cover assets own the original public narrative. Preserve all 67 numbered days,
394 photographs with their approved date/time grouping, and 44 factual notes.
The existing journal privacy checker still owns its field allow-list and
excluded subjects. Trek remains standalone, `noindex` and `noimageindex`.

Dan explicitly approved publishing the 2019 GPS route on 5 September 2026.
`public/trek/route-detail.json` is the reviewed coordinate-only projection of
52 original recordings: 14,338 points across 57 separate lines. The local
conversion split discontinuities over 1 km before simplification to about 8 m
and five coordinate decimals. It excludes sample times, biometrics, activity
identifiers and private source paths. Do not broaden this scoped exception to
other activities or copy raw exports into the public repository.

Never connect separate recordings or recording gaps. Unrecorded days hold the
last recorded endpoint. Days 16–17 share one recording; the approximate division
and combined metrics are labelled. Cumulative progress divides that record
between both displayed days, while preserving the original aggregate totals.

`data/trek-moments.json` owns six chapters and nine photo/note-backed moments.
Monument markers identify a photographed day, not a verified monument coordinate.
Do not invent summit names or exact landmark locations from photographs.

## Runtime and builds

`npm run trek:build` runs `scripts/build-trek-paths.mjs` and the
`scripts/trek-journey-template.html` template. It regenerates
`public/trek/index.html` and `public/trek/moments.json`. The older Atlas/relief
source files are retained but are not the active build or a reachable view.

`journey-clock.js` handles timeline and record dialogs. `journey-story.js` owns
the distance marks, whole-walk summary and mobile journal expansion.
`journey-story.css` applies the journal presentation over the map's base styles.
`journey-map.js` handles MapLibre, route interpolation, camera, day card and
photograph dialogs. MapLibre 5.6.2 and its
licence are vendored locally. `journey-style.json` derives from
[OpenFreeMap Liberty](https://openfreemap.org/quick_start/), with muted colours;
its vector tiles supply real roads, trails, names and building geometry.
[Terrarium elevation tiles](https://www.mapzen.com/rights/) supply continuous
terrain at 1.35× exaggeration using [MapLibre terrain](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/).
Keep the map-provider attribution visible. The remote basemap needs network
access; the day records and photographs remain local static assets.

## Verification

`npm run check:trek-privacy` checks the original factual projection plus the
approved coordinate schema, all recording segments, unconnected gaps and
evidenced moments. `npm run check:trek:dom` uses the isolated browser harness
and `scripts/check-trek-paths-dom.mjs` for day/chapter/country jumps, playback,
reset and replay, photo/music dialogs, 320/390px fit and graphics loss.
`CHECK_TREK_STORY_ONLY=1 npm run check:trek:dom` targets the photograph contact
strip, keyboard browsing, exact position preservation, distance scrubbing,
full phone journal, responsive record sleeve and reduced motion.

Run `npm run publish:ready` once before publishing. After Pages succeeds, check
the live page and approved route asset and inspect desktop and phone views.
Compilation and DOM checks alone do not establish visual acceptance.
