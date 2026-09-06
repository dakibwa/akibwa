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
- On 6 September 2026 Dan approved a landscape made from layered paper. Use
  cut and folded tree canopies, pale village walls with warm pitched roofs,
  distinct sage and ochre fields, fine paper fibres and a consistent light from
  the northwest. Keep the actual landforms; printed facets follow their slopes.
  Secondary roads are fine cream lines. Avoid bright yellow road networks,
  floating decorative islands, invented settlements, a screen of giant trees,
  or texture that makes the route and ground look blurred.
  Dan reconfirmed the [approved visual reference](trek-paper-concept.png) as
  the quality bar on 6 September 2026. Judge the finished rendering against its
  richness, material detail and depth. Its individual trees, houses and field
  divisions remain illustrative; the reference does not replace mapped geography.
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
- Following Dan's 6 September feedback, keep a gently changing 42–60° camera
  pitch, real terrain height and a broad view of the path. The camera glides on a separately
  smoothed rail and anticipates bends; it must not copy each GPS zigzag. Ease
  rotation in and out, slow down before tight turns and ease into movement after
  pauses or photographs. Look ahead for rising ground and descend gently.
  On steep descents, gradually look down to retain the route. Widen the vertical
  field of view from 38° to 55° in portrait layouts so the path remains visible.
  Keep background trail strokes faint and solid so their dashes do not compete
  with the recorded route or the explicitly dashed connections.

## Visual acceptance

The paper reference sets the standard for the finished landscape. Adding a paper
palette, texture and simple scenery establishes a first pass; it does not by
itself meet that standard. Preserve these visible qualities as detail improves:

- Dense woodland has varied tree silhouettes, heights and tones, with convincing
  clusters, edges and clearings. Sparse repeated cones do not convey the reference's
  miniature forest.
- Villages read as detailed groups of buildings, with distinct walls, pitched
  roofs, small facade details and grounding shadows. Keep settlement placement
  and building footprints tied to the map.
- Fields form a layered patchwork with legible boundaries, tactile paper edges,
  fine fibres and subtle directional marks. Material detail stays crisp at the
  travelled viewing distance without overwhelming the route.
- One soft light unifies trees, buildings and terrain. Contact shadows ground
  objects; foreground, middle distance and distant hills have clear depth.
  Atmospheric softness belongs in the distance, with the nearby path readable.
- The landscape fills the frame, with the rust route leading naturally through
  the terrain. Fine cream roads, quiet typography and open controls preserve
  the composition and leave the landscape primary.

Compare the running German woodland and village, plus an Alpine pass, with the
reference at phone and desktop sizes. Check both a paused frame and continuous
movement: density, materials and shadows must remain stable without popping or
camera distraction. Use actual phone evidence before claiming phone performance.
Automated checks establish correctness; they cannot establish visual parity.
Keep a working first pass distinct from a visually finished landscape until this
comparison supports the latter.

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
continuous distance sampling and day boundaries. `journey-camera.js` owns the
camera rail, forward heading, turn acceleration and bend-aware pace.
`journey-traveller.js` owns the map, terrain clearance, clock, menu and photographs;
`journey-traveller.css` owns the presentation. Earlier map, journal and clock
files are inactive.

`journey-paper.js` owns the paper palette, mapped field and rock fills, printed
ground material, slope facets, tree shadows and the custom WebGL scenery layer.
It uses the map's existing vector tiles and elevation; no additional account,
imagery service or credentials are required. Individual trees illustrate mapped
woodland. Their positions are deterministically seeded in geographic space,
respect polygon holes and leave the journey and mapped roads open. They must
not shuffle when a tile reloads or the camera moves. Trees are not a survey of
individual specimens. Field boundaries and building footprints come from current
OpenStreetMap, not a reconstruction of their 2019 appearance. Simple rectangular
buildings get illustrative gables; other buildings retain their mapped outlines
and flat tops. Scenery heights and roof forms are stylised for legibility.

Scenery is limited to 6,500 trees and 1,800 roofs near the view, with a distant
fade. Geometry is rebuilt in short chunks after movement or source changes,
never by querying every feature on every frame. Reuse the map's WebGL context,
use a local coordinate origin for precision and discard stale in-flight builds
after a new destination. The material and facets stay attached to the ground.
Retry pending scenery when the map becomes idle: source events can arrive before
the destination camera finishes loading, and a paused first visit must populate
without needing Play or a day change. Do not let that retry become an idle loop.
If the extra scenery cannot initialise, retain the terrain, days and photographs.
Keep dynamic GeoJSON sources at zoom 18, above the view cap of 17. Lower source
caps exposed a MapLibre 5.6.2 child-tile retention error when resizing between
phone and desktop while terrain was active. Include those resizes in browser QA.

MapLibre 5.6.2 and its licence are vendored. `journey-style.json` derives from
[OpenFreeMap Liberty](https://openfreemap.org/quick_start/); its vector tiles
supply roads, trails and building geometry. [Mapzen elevation
tiles](https://www.mapzen.com/rights/) supply continuous terrain at real height.
Keep all provider credits accessible from the map. Remote tiles require network
access; the original day records and photographs are local static assets.

`npm run check:trek-privacy` checks source privacy, every recording, photograph
metadata, original metrics, generated asset hashes and the continuous route.
`scripts/check-trek-continuity.mjs` covers all joins and day boundaries, the
largest gap, bounded rounding and source non-mutation.
`scripts/check-trek-camera.mjs` checks camera continuity across the whole route,
proximity to the path and difficult turns at every pace. The camera uses a
weighted 880 m neighbourhood, a 1.1 km heading chord, a 9°/s turning limit and
6°/s² acceleration limit. Pitch changes by at most 3°/s. Playback brakes before
upcoming bends. The normal clearance is 720 m above the highest sampled ground in the next kilometre,
with a 420 m floor during movement. Solve the complete camera transform from
the eye and a target at local ground height; changing pitch after solving zoom
and centre changes the eye position and can cause clipping. Update the reference
elevation with the ground at every frame. Retaining an old mountain reference
after descending can force a distant zoom and enlarge the draped roads and route.
`npm run check:trek:dom` covers actual terrain readiness, quiet controls,
steep viewpoints and sustained camera movement, photographs, original records,
continuous playback and heading changes, interlude
timing, phone fit, resize, replay, reduced motion and graphics loss.

Run the site's fast gate before release. After Pages succeeds, compare the live
HTML and versioned runtime assets and inspect the desktop and phone landscape.
Include a sustained descent into a valley without changing days: resetting the
camera between viewpoints can hide the stale elevation and enlarged texture bug.
Compilation and DOM checks do not replace visual acceptance.

`scripts/check-trek-paper.mjs` covers geographic projection, woodland holes,
route clearance, deterministic placement across view changes, duplicate tiles,
geometry budgets and valid mapped layer styling. The browser journey checks
include the day-17 woodland and village, Alpine detail and photographs on phone.
On a Mac with a working GPU, `CHECK_TREK_HARDWARE_GPU=1` runs those browser
checks with hardware graphics. The default remains software rendering for
environments without a GPU. Measure playback separately with hardware graphics;
software rendering is not evidence of phone performance.
