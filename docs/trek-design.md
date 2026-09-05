# Trek: Paris to Sofia

A moving view of the walk, looking along the traveller's path. The landscape
does the storytelling; original photographs briefly take its place. Dan selected
one Paths view, then requested continuous joins, smoother motion, a traveller's
perspective and much less text and interface on 5 September 2026.

## Presentation

- Give the 3D landscape the whole viewport across all seven countries. Follow
  the direction of travel from above the route, with a long look ahead and a
  gently turning camera. This is a terrain view, not street-level imagery.
- Use muted sage terrain, warm paper, a rust path and Fraunces for the opening.
  Retain real roads, trails, rivers and buildings, while removing map labels
  from the moving view. Avoid a fixed compass direction or an overhead overview
  as the main experience.
- Keep the small mark, country, menu, play control, progress line, date and
  photograph button on the landscape. A quiet row above the progress line shows
  day out of 67, kilometres covered and total metres climbed, as Dan requested
  on 5 September 2026. Use open typography, not cards. The opening has one start action; Sofia
  has one replay action. Map credits remain in a visible compact disclosure.
- The menu owns all 67 days, six chapters, pace, the photograph-interlude toggle,
  original notes and day metrics, actual record artwork and journey context.
  Do not bring back a permanent journal card, top statistics, chapter strip,
  record dock or a collection of reset, resume, zoom and follow buttons.
- Photographic interludes fade through the whole viewport and hold the journey
  briefly. Preserve the image composition with `contain` and use a blurred copy
  to fill the remaining space. Timing uses elapsed time independently of map
  frame rate. A click skips the image; the play control pauses it. Interludes
  can be disabled and default off for reduced motion.
- Manual photographs use a full-screen dialog with arrows, arrow keys and swipe.
  Browsing preserves the exact route position. All 394 photographs remain
  reachable through their original day. Portrait and landscape photographs must
  both fit desktop, 390px and 320px screens without an inset card or copy panel.
- There is one distance clock. Scrubbing and day/chapter changes pause playback;
  dragging the map pauses following. Play returns to the traveller camera.
  Escape and hidden pages pause. Resize preserves the exact journey position.
- A distant jump first loads local elevation with a ground-clamped camera, then
  places the travelling camera above that ground. Never use a sea-level guess
  for an alpine viewpoint. A graphics failure leaves days and photographs usable.

## Geography and source ownership

`data/trek-days.json`, `data/trek-journal.json`, the photo manifest and cover
assets own the public narrative. Preserve all 67 numbered days, 394 photographs
with their approved date/time grouping and 44 factual notes. The journal privacy
checker owns the field allow-list and exclusions. Trek remains `noindex` and
`noimageindex`.

Dan explicitly approved publishing the 2019 GPS route on 5 September 2026.
`public/trek/route-detail.json` is the reviewed coordinate-only projection of
52 recordings: 14,338 points across 57 separate lines. The source conversion
split discontinuities over 1 km before simplification to about 8 m and five
coordinate decimals. No sample times, biometrics, private identifiers or raw
exports belong in this public repository. The approval covers this journey only.

The later request to join the view authorises **presentation connections**:
leave the reviewed route file unchanged, round displayed corners within 18 m
of their original vertices, and create separate, labelled connection geometry
between all 56 gaps. Draw connections as lighter dashed curves. They are not
recorded walking and must never inflate the stated 1,982 km distance.

Playback traverses one continuous distance including those visual connections.
Every numbered day's end meets the next day's start. Missing days share the
connection to the next recording; days 16–17 divide their shared record
approximately. The menu preserves that qualification and the combined metrics.

The visible counters use the approved daily cumulative totals. Within-day values
are estimates interpolated over recorded portions only; visual connections never
advance distance or ascent. The finish must read 1,982 km and the original total
ascent. "Metres climbed" is accumulated ascent, not camera altitude or a live
measurement of the traveller's elevation.

`data/trek-moments.json` owns six chapters and nine photo/note-backed moments.
Photographs belong to a day, not a verified coordinate. Retain the location
qualifications in the original-day details; do not invent landmark or summit
identifications from the images.

## Runtime and verification

`npm run trek:build` runs `scripts/build-trek-paths.mjs` with
`scripts/trek-journey-template.html`. It generates `public/trek/index.html` and
`public/trek/moments.json`. Content hashes version every active runtime asset.

`journey-route.js` owns bounded display smoothing, distinct connection geometry,
continuous distance sampling and day boundaries. `journey-traveller.js` owns
the map, camera, clock, menu and photographs; `journey-traveller.css` owns the
presentation. Earlier map, journal and clock files are inactive.

MapLibre 5.6.2 and its licence are vendored. `journey-style.json` derives from
[OpenFreeMap Liberty](https://openfreemap.org/quick_start/); its vector tiles
supply roads, trails and building geometry. [Mapzen elevation
tiles](https://www.mapzen.com/rights/) supply continuous terrain at 1.35× height.
Keep all provider credits accessible from the map. Remote tiles require network
access; the original day records and photographs are local static assets.

`npm run check:trek-privacy` checks source privacy, every recording, photograph
metadata, original metrics, generated asset hashes and the continuous route.
`scripts/check-trek-continuity.mjs` covers all joins and day boundaries, the
largest gap, bounded rounding and source non-mutation.
`npm run check:trek:dom` covers actual terrain readiness, quiet controls,
photographs, original records, continuous playback and heading changes, interlude
timing, phone fit, resize, replay, reduced motion and graphics loss.

Run the site's fast gate before release. After Pages succeeds, compare the live
HTML and versioned runtime assets and inspect the desktop and phone landscape.
Compilation and DOM checks do not replace visual acceptance.
