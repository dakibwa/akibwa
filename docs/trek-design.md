# Trek: Paris to Sofia

A moving view of the walk, looking along the traveller's path. The landscape
does the storytelling; original photographs appear as small paper keepsakes. Dan selected
one Paths view, then requested continuous joins, smoother motion, a traveller's
perspective and much less text and interface on 5 September 2026.

## Presentation

- Give the 3D landscape the whole viewport across all seven countries. Follow
  the direction of travel from above the route, with a long look ahead and a
  gently turning camera. This is a terrain view, not street-level imagery.
- Use muted sage terrain, warm paper, a rust path and Fraunces for the opening.
  Retain real roads, trails, rivers and buildings, while keeping ordinary map labels
  out of the moving view. Let town names appear briefly as the route approaches
  mapped settlements. Avoid a fixed compass direction or an overhead overview
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
- On 7 September 2026 Dan requested more detail using satellite views and
  explicitly retained the paper model style. Use those views as visual reference
  for landscape character; the rendered geometry still comes from reusable map
  data. Do not reconstruct, extract or store a new dataset from Google imagery.
  Give forest a continuous canopy with varied folded tiers and broadleaf crowns,
  retain mapped clearings, and show grain and narrow cut edges on actual fields.
- Streams and rivers have full muted-blue channels, a pale paper bank and a
  subtle light centre. Their displayed width is stylised for legibility. Keep
  lakes visibly blue and respect mapped shorelines. Draw every ground material,
  field fill and hillshade before the first waterway layer, so paper treatments
  cannot wash out streams. Leave mapped surface waterways free of tree trunks.
- Keep the small mark, play control, progress line, date and photograph button
  on the landscape. The current country and mapped height sit in the minimap.
  A clearly readable row above the progress line shows
  day out of 67, kilometres covered and total metres climbed, as Dan requested
  on 5 September 2026. Use large, dark Fraunces numerals and smaller Plex labels on the open landscape. The opening has a primary start action and a quiet link to browse days,
  accessible while terrain loads or fails; Sofia
  has one replay action. Map credits remain in a visible compact disclosure.
- The upper-right corner holds a small paper minimap of the full journey, with
  the completed route, remaining route, dashed connections and a moving direction
  marker carrying a small muted flag. Use the existing country outlines
  and a 2D canvas, with no second terrain renderer. Flags are local SVGs from
  flag-icons with its MIT licence alongside them, loaded only as needed.
  Following Dan’s 7 September feedback, remove the top-right menu button and
  place the compact atlas there; tapping the day number opens journey options.
- Settlement names come from the existing map tiles. Show one name briefly near
  a city, town, village or hamlet, with a small geographic margin to avoid flicker.
  Never announce passing a town on a visual connection. Names clear after leaving;
  replay and scrubbing can reveal them again. Small photo prints leave the atlas
  and landscape visible; the full-screen gallery covers the scene when opened.
- Ten landmarks have paper models anchored at verified public positions:
  Reims and Nancy cathedrals, Château des Rohan, the Frauenkirche, St. Jakob in Villach,
  Ptuj Castle, Osijek’s co-cathedral, the Name of Mary Church in Novi Sad, the
  Temple of Saint Sava and Alexander Nevsky Cathedral. Towers, domes, gables,
  cornices and facade details are architectural interpretations. Show a quiet
  name when a model is in view. Keep the source links in the menu. These are
  nearby landmarks, not evidence of entering a building.
  On 7 September Dan explicitly asked for artistic liberties so the cathedrals
  stand out along the route. Make these selected buildings deliberately oversized:
  about three times the width and three to four times the height, with Reims and
  Nancy especially prominent above the town. Compact the long naves and allow
  a fixed display rotation to make the facade readable from the approach.
  Preserve their geographic anchors, the real route and the surrounding terrain. Their scale is illustrative.
  Reims has Gothic twin towers and a rose window; Nancy has the broad classical
  facade, octagonal belfries, domes and lanterns described by the city’s
  [architecture reference](https://www.nancy.fr/fileadmin/NAN/culture/patrimoine/Ressources/patrimoine-parcours-germain-boffrand.pdf), page 28.
  Do not add a large external dome over Nancy’s nave: its painted cupola is inside.
  During the approach, give the silhouette more room with a gentle upward and
  sideways camera adjustment. The pitch can ease down to 32 degrees for a close
  landmark, keeping its base above the controls. Keep the eye on the route and use the same turn
  limits. The independent route heading still controls speed and the minimap,
  so looking at a landmark does not brake playback. Use short cathedral captions;
  keep full names in the sources and hide the duplicate town arrival while the
  landmark name is on screen.
- The menu owns all 67 days, six chapters, pace, the automatic-photo toggle,
  original notes and day metrics, actual record artwork and journey context.
  Do not bring back a permanent journal card, top statistics, chapter strip,
  record dock or a collection of reset, resume, zoom and follow buttons.
- Following Dan's renewed 7 September request for faster travel, default Flow
  has a 1,600 m/s presentation pace, with Wander at 300 m/s and Fly at 3,200 m/s. These
  are playback speeds, not recorded walking speeds. Let gentler bends pass more
  readily while retaining the smooth turn and acceleration limits below.
- Original photographs appear as lightly angled paper prints beside the moving
  landscape, for 9.5 seconds of elapsed time. Preserve the full composition with
  `contain`; do not interrupt playback or hide the route, atlas or elevation.
  Clicking a print opens that photograph in the full-screen gallery and pauses
  at the current position. Select from the actual day; the caption names the day,
  because exact photo positions are unknown. Show at most one print per day in
  continuous playback, and on preparing a directly selected day. The option
  can be disabled and defaults off for reduced motion.
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

The 6 September 2026 audit of the saved 29 July 2026 Strava export matched all
52 numbered walk recordings to the public route. Day 13 has two recordings:
its distance, moving time and ascent must aggregate both halves (42.9 km,
372 minutes and 856 m at the public rounding), rather than keep the last row.
The shared days 16–17 recording remains counted only once. The source has a
20.5 km straight-line gap between the end of day 33 and the start of day 34;
showing a connection there does not establish the route or mode of travel.

The visible counters use the approved daily cumulative totals. Within-day values
are estimates interpolated over recorded portions only; visual connections never
advance distance or ascent. The finish must read 1,982 km and the reconciled source total
ascent. "Metres climbed" is accumulated ascent, not camera altitude or a live
measurement of the traveller's elevation.

`data/trek-moments.json` owns six chapters and nine photo/note-backed moments.
Photographs belong to a day, not a verified coordinate. Retain the location
qualifications in the original-day details; do not invent landmark or summit
identifications from the images.

## Elevation and loading

On 6 September 2026 Dan requested an elevation profile for the whole journey,
preparation before playback and caching to keep the landscape smooth. Put the
profile just above the existing scrubber, with a small moving height marker.
Keep the larger day, distance and ascent figures, and keep the scene dominant
on desktop and narrow phones. Hide the profile during full-screen photographs.

`public/trek/elevation-profile.json` is generated by
`scripts/build-trek-elevation.mjs` from the already-public route and Mapzen's
Terrarium terrain tiles at zoom 11. It contains 11,677 mapped ground heights at
roughly 200 m intervals. These are approximate terrain elevations, not private
GPS altitude samples. Include every recorded section and presentation connection
across all seven countries. Connection heights describe the mapped ground beneath
the illustrative link; use a dashed, quieter profile and label them as connections.
These samples do not imply a recorded walking route. The horizontal axis follows the continuous journey;
it does not redefine the 1,982 km walking total or accumulated ascent. Keep its
route hash and the generation method with the data. Regeneration uses a temporary
DEM cache and is an explicit maintenance step, not a network-dependent site build.

`journey-elevation.js` draws the full silhouette once per viewport size and updates
the position at most about 11 times per second. `journey-cache.js` gives MapLibre
one shared tile request path for foreground terrain, hillshade and look-ahead
work. Prepare the current scene and nearby route before enabling Play; allow
the paper geometry to finish uploading. A seek supersedes old preparation, and
Replay starts after Paris has prepared. Keep photographs accessible during a
network failure, with an explicit retry for the landscape.

Cache only public OpenFreeMap vector tiles and Mapzen DEM tiles. Reuse them via
Cache Storage across visits, expire them after seven days, and fall back to
ordinary fetching if persistent storage is unavailable. Keep a 32-tile memory
cache and prune the disk cache to 256 tiles in batches, with no stored tile above
512 KiB. Look ahead along the next 16 km with three speculative requests at a
time; do not download every zoom level of Europe or promise the entire journey
works offline. Version the local route, moments, style and elevation JSON by
content hash so a release cannot reuse mismatched data. Keep the existing
provider credits. Cap map rendering at 1.5 device pixels per CSS pixel and
update the numeric overlays about 11 times per second; the camera keeps its
animation-frame clock.

## Runtime and verification

`npm run trek:build` runs `scripts/build-trek-paths.mjs` with
`scripts/trek-journey-template.html`. It generates `public/trek/index.html` and
`public/trek/moments.json`. Content hashes version every active runtime asset.

`journey-route.js` owns bounded display smoothing, distinct connection geometry,
continuous distance sampling and day boundaries. `journey-camera.js` owns the
camera rail, forward heading, turn acceleration and bend-aware pace.
`journey-traveller.js` owns the map, preparation, terrain clearance, clock, menu and photographs;
`journey-traveller.css` owns the presentation. `journey-wayfinding.js` owns the
inset and settlement selection; `data/trek-landmarks.json` owns reviewed landmark
positions and public source links, and `journey-landmarks.js` makes their meshes.
Earlier map, journal and clock
files are inactive.

`journey-paper.js` owns the paper palette, mapped field and rock fills, printed
ground material, slope facets, tree shadows and the custom WebGL scenery layer.
It uses the map's existing vector tiles and elevation; no additional account,
imagery service or credentials are required. Individual trees illustrate mapped
woodland. Their positions are deterministically seeded in geographic space,
respect polygon holes and leave the journey and mapped roads open. They must
not shuffle when a tile reloads or the camera moves. Trees are not a survey of
individual specimens. Field boundaries and building footprints come from current
OpenStreetMap, not a reconstruction of their 2019 appearance. Clean collinear
vertices before choosing a roof, so extra map vertices do not suppress a gable.
Simple rectangular buildings get illustrative gables. A thin native extrusion
applies roof material to every mapped building using the same terrain anchoring
as its walls, retaining complex outlines and courtyard holes. A custom flat cap
sampled only at the centroid can sink into native roofs on slopes; do not use it.
Nearby buildings receive narrow fascia and small window panels.
Scenery heights, windows and roof forms are stylised, not surveyed architecture.

Custom landmarks share the existing scenery buffer and terrain heights. Their
size exaggeration lives in the mesh transform, separate from sourced positions
and native-building bounds. Expand their ground shadows and leave their enlarged
footprints free of custom trees and roof details. After a
model builds, remove only native building features fully inside its mapped bounds,
including multi-part towers. Select those feature IDs with geographic containment:
MapLibre 5.6.2’s `within` expression only tests point and line features, so it cannot
exclude building polygons. A nearby building crossing the bounds stays untouched.

Scenery is limited to 6,500 trees, 1,800 custom roofs and 2.4 million custom
vertices near the view, reserving 30,000 vertices for landmarks, with a distant
fade. Woodland uses a 32 m grid in projected map space; the varying crown shapes
and optional underside folds remain seeded per tree, without camera-dependent
shape changes. Ground canopy print carries forest texture into the distance.
Geometry is rebuilt in short chunks after movement or source changes,
never by querying every feature on every frame. Reuse the map's WebGL context,
use a local coordinate origin for precision and discard stale in-flight builds
after a new destination. Cache the lit canopy vertices in 192 seeded variants
so rebuilds only place them, without recalculating every fold and surface normal.
The material and facets stay attached to the ground.
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
weighted 880 m neighbourhood, a 1.1 km heading chord, a 14°/s turning limit and
9°/s² acceleration limit. Pitch changes by at most 3°/s. Playback brakes before
upcoming bends using an 11°/s curvature budget, then slows further when the view
needs to catch up. The normal clearance is 720 m above the highest sampled ground in the next kilometre,
with a 420 m floor during movement. Solve the complete camera transform from
the eye and a target at local ground height; changing pitch after solving zoom
and centre changes the eye position and can cause clipping. Update the reference
elevation with the ground at every frame. Retaining an old mountain reference
after descending can force a distant zoom and enlarge the draped roads and route.
`npm run check:trek:dom` covers actual terrain readiness, quiet controls,
steep viewpoints and sustained camera movement, photographs, original records,
continuous playback and heading changes, automatic-photo
timing, phone fit, resize, replay, reduced motion and graphics loss.

Run the site's fast gate before release. After Pages succeeds, compare the live
HTML and versioned runtime assets and inspect the desktop and phone landscape.
Include a sustained descent into a valley without changing days: resetting the
camera between viewpoints can hide the stale elevation and enlarged texture bug.
Compilation and DOM checks do not replace visual acceptance.

`scripts/check-trek-paper.mjs` covers geographic projection, woodland holes,
route clearance, deterministic placement across view changes, duplicate tiles,
geometry budgets, canopy bounds, roof-to-wall alignment and valid mapped layer styling. The browser journey checks
include the day-17 woodland and village, Alpine detail and photographs on phone.
On a Mac with a working GPU, `CHECK_TREK_HARDWARE_GPU=1` runs those browser
checks with hardware graphics. The default remains software rendering for
environments without a GPU. Measure playback separately with hardware graphics;
software rendering is not evidence of phone performance.

`scripts/check-trek-wayfinding.mjs` covers source provenance, actual recording
proximity, all model meshes, complete native building replacement and stable
settlement selection. The focused browser check uses
`CHECK_TREK_WAYFINDING_ONLY=1` to exercise the inset, place arrival, landmark
replacement, playback, photographs and 390/320px layouts.

The focused elevation/cache checks cover complete ground-height coverage, source
hashes, distinct mapped connections, persistent hits, expiry, cancelled requests, unavailable
storage and bounded prefetch. `CHECK_TREK_ELEVATION_ONLY=1` selects rendered
checks for preparation, cached return visits, sustained playback, responsive
profile fit, rapid seeks and original photographs. Measure frame times and
tile fetches in a fresh browser profile; browser storage and network conditions
can change the result.

`CHECK_TREK_FLOW_ONLY=1` exercises the faster default in the running landscape,
all seven country flags and ground heights, the automatic print and its original
gallery, connection profiles, the relocated day selector and 1440/390/320px fit.

`CHECK_TREK_LANDMARKS_ONLY=1` exercises the Reims and Nancy approaches at
1440/390/320px, continuous passage and the enlarged Munich model. Inspect the
rendered towers and silhouette; a model name in the status alone is insufficient.
