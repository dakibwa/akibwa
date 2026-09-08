# Trek: Paris to Sofia

A moving view of the walk, looking along the traveller's path. The landscape
does the storytelling; original photographs appear as small paper keepsakes. Dan selected
one Paths view, then requested continuous joins, smoother motion, a traveller's
perspective and much less text and interface on 5 September 2026.

## Presentation

- Give the 3D landscape the whole viewport across all seven countries. Follow
  the direction of travel from above the route, with a long look ahead and a
  gently turning camera. This is a terrain view, not street-level imagery.
- Use muted sage terrain, warm paper, a deep red path and Fraunces for the opening.
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
- Following Dan's 7 September feedback, keep the travelled line prominent in
  dense towns as well as countryside: a deep red 5.5px stroke with a fully opaque
  9.5px warm-paper outline separates it from terracotta roofs, blue streams and
  green canopy. Use the same red for the minimap's completed route and direction
  marker. Estimated walking paths have a paler red 4.5px stroke with an 8px
  paper edge. The two train connections stay narrower, warm brown and dashed.
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
- Keep the small trek / 2019 mark in the same Fraunces typeface, play control, speed button,
  combined day/elevation timeline and date on the landscape. Photographs appear automatically;
  the separate photograph button is removed. The country name and flag sit inside the minimap’s upper-right corner; omit its elevation and footer row. Above the timeline, two larger, dark Fraunces
  counters show kilometres covered and metres climbed, with readable Plex labels
  on a soft paper wash. One elevation ribbon combines the former day blocks,
  terrain graph and scrubber. All 67 days have equal width, coloured by country;
  the terrain is drawn within each day, with darker completed portions and pale
  future portions. One red playhead sits on the current height. The horizontal
  scale represents days, not kilometres. The zero-distance arrival day remains
  visible without adding distance or ascent. The whole profile is a drag target,
  at least 44px high. Keep the date beneath it as the menu button, with a 44px hit target. Remove the visible day count, current height and maximum-height legend. Day and elevation context remains in the accessible slider value and menu. Dragging pauses and
  previews the date and counters immediately, then prepares the final
  landscape on release. Arrow keys move within a day, Shift+arrows and Page keys
  move by a day, and Home/End reach Paris/Sofia. Seeking backwards clears the
  later fill, and the left arrow can leave the final arrival segment.
  The opening reads like the first page of a walking journal: the actual
  September–November 2019 dates, a left-aligned Fraunces title and the approximate
  walking distance. A ruled paper strip with the route's red marker and arrow
  says “Start in Paris”; avoid a large filled capsule or generic invitation copy.
  Keep the mapped landscape visible behind it. “Choose a day” stays a quiet
  secondary action with a full touch target, available while terrain loads or
  fails; Sofia has one replay action. Map
  credits use a quiet text disclosure above the landscape wash, retaining the
  native provider links and keyboard operation.
- The upper-right corner holds a small paper minimap of the full journey, with
  the completed route, remaining route, dashed connections and a moving direction
  marker. A small flag sits beside the country name inside the upper-right corner, with no separate footer, flagpole or elevation readout. Use the existing country outlines and a
  2D canvas, with no second terrain renderer. Flags are local SVGs from
  flag-icons with its MIT licence alongside them, loaded only as needed.
  Following Dan’s later 7 September feedback, keep the country fills static,
  using one shared country fill and no current-country highlight. Keep only the small red direction arrow, with no moving halo. Paint the base atlas once. Do not spread
  flags across the atlas: the single flag stays beside the country name.
  Following Dan’s 7 September feedback, remove the top-right menu button and
  place the compact atlas there; the date below the ribbon opens journey options.
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
  sideways camera adjustment. The pitch can ease down to 34 degrees for a close
  landmark, keeping its base above the controls. Keep the route framed and use
  the same turn limits. The independent route heading controls speed and the minimap,
  so looking at a landmark does not brake playback. Use short cathedral captions;
  keep full names in the sources and hide the duplicate town arrival while the
  landmark name is on screen.
- The menu owns all 67 days, six chapters, pace, the automatic-photo toggle,
  original notes and day metrics, actual record artwork and journey context.
  Do not bring back a permanent journal card, top statistics, chapter strip,
  record dock or a collection of reset, resume, zoom and follow buttons.
- Following Dan’s latest request, **Auto** is the default pace. Move quickly across
  long open stretches, then slow for settlements, large mountains, woodland,
  rivers/lakes and the mapped landmarks. Use the existing terrain profile and
  map features; these are presentation heuristics, not a claim to know which
  view the traveller personally found beautiful. Anticipate the approaching
  scenery and ease speed changes. Retain the camera’s bend and alignment limits.
  Keep a quiet “Auto” label on the existing speed button, without changing
  numbers or extra on-screen explanations. The fixed ¼×, 1×, 2×, 4× and 8×
  settings remain in the same menu and button cycle; manual choices hold their
  requested pace subject to the existing camera limits. Changing modes preserves
  playback and position. These are presentation speeds, not walking measurements.
- Original photographs appear as lightly angled paper prints beside the moving
  landscape, for 9.5 seconds of elapsed time. Preserve the full composition with
  `contain`; do not interrupt playback or hide the route, atlas or elevation.
  Let each print size naturally to the original image ratio, bounded by the viewport. Use a balanced cream border, a fine inset edge, quiet paper grain and a soft lifted shadow; avoid blank side bands on portraits. Fade each print in with a small rising, rotating motion,
  easing into its resting angle. Show only the image, with no visible caption.
  Automatic prints are passive figures with no links, hover action or pointer interception. Open the original day gallery from the menu. Select from the actual day; retain its provenance in
  the accessible name and gallery because exact photo positions are unknown. Show at most one print per day in
  continuous walking playback, and on preparing a directly selected walking day. Leave the landscape clear during train transfers. The option
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
  Frame dense bends from higher up so their shape remains readable. Use the
  stable mapped elevation profile to plan movement; streamed terrain tile
  changes must not make the camera jump or change scale. Fit the nearby path
  within the usable viewport above the timeline, including its mapped heights.
  Widen the route window and gradually look down to 36° over tight bends,
  then return to the closer forward view as the path straightens. Widen the vertical
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
- The landscape fills the frame, with the deep red route leading naturally through
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

Dan explicitly approved publishing the 2019 GPS route on 5 September 2026 and reaffirmed that approval on 7 September.
`public/trek/route-detail.json` is the reviewed coordinate-only projection of
52 recordings: 14,338 points across 57 separate lines. The source conversion
split discontinuities over 1 km before simplification to about 8 m and five
coordinate decimals. No sample times, biometrics, private identifiers or raw
exports belong in this public repository. The approval covers this journey only.

On 7 September 2026 Dan confirmed walking the missing sections apart from
two train transfers, after the overnight German walk (probably into Stuttgart)
and in Croatia. Keep the reviewed recordings unchanged. `route-links.json`
contains 54 estimated walking links and two mapped railway connections;
`scripts/build-trek-links.mjs` regenerates them explicitly from the public
recording endpoints using Valhalla pedestrian routing on current OpenStreetMap, plus the committed railway alignment.
The train boundaries are inferred as the gaps after days 16–17 and before day 42.
Neither exact 2019 paths nor train endpoints are verified. Short joins under
35 m connect the endpoints directly. Preserve the router provenance and source
route hash. The maintenance script caches requests and respects FOSSGIS’s
one-request-per-second limit; visitors never call the routing service.
Round displayed walking corners within 18 m, including walking estimates. Keep railway points unrounded so coaches stay on the mapped track. Measure estimated distance from the unrounded reconstructed geometry so presentation smoothing does not change the walking totals.

`data/trek-rail-routes.json` contains the two connected railway paths: Pforzheim–Mühlacker–Vaihingen (Enz)–Bietigheim-Bissingen–Ludwigsburg–Stuttgart, and Pitomača–Virovitica–Slatina–Čačinci–Đurđenovac–Našice–Koška. Their regional corridors are supported by [Baden-Württemberg’s June 2019 service announcement](https://vm.baden-wuerttemberg.de/de/service/presse/pressemitteilung/pid/ab-juni-2019-deutlich-besseres-regionalzug-angebot-durch-stuttgart) and [HŽ Infrastructure’s 2019 network statement](https://www.hzinfra.hr/wp-content/uploads/2018/12/Izvjesce-o-mrezi-2019-procisceni-tekst-II.izmjene-i-dopune.pdf). Geometry follows the stated current OpenStreetMap snapshots; it does not establish the exact train taken in 2019. The station choices are inferred from adjacent recording endpoints. Keep those qualifications and source attribution in the menu.

`scripts/build-trek-rails.py` is an explicit maintenance step. It caches two bounded public railway queries in `TREK_RAIL_CACHE` (default `/tmp/trek-rail-osm`), then finds connected track paths through the regional stations, penalising sidings and rejecting loops. The committed derivative retains OSM way IDs, snapshot times, bridge/tunnel spans and only the selected railway coordinates. Regenerate links, terrain and HTML after changing it: `python3 scripts/build-trek-rails.py`, `node scripts/build-trek-links.mjs`, `node scripts/build-trek-elevation.mjs`, then `npm run trek:build`. Ordinary builds and visitors never query a router.

`journey-train.js` draws three cream and red paper coaches in the existing 3D scene. Their enlarged scale is illustrative. Each coach follows its own distance along the sourced railway, turns with the track and remains visible across mapped tunnel spans. The paper colours soften at tunnel entrances and return on exit; the illustrative model follows the map surface there so the traveller can still follow its position. Bridge heights interpolate between their approaches. The train fades at the inferred stations and never drives across the short access joins to walking recordings. It uses the same reversible distance clock as the journey, settles on pause and clears when seeking back to walking. Keep it visible above the controls in phone and desktop views; it must not add distance or ascent to walking totals.

The Wörthersee recording gap remains estimated walking. Dan initially tentatively agreed with a suggested boat crossing, then stated that he could not remember one. Reviewing the original recordings, day photographs and captions found no evidence establishing a sailing. A recording ending beside a landing and a current ferry route do not establish attendance. Do not animate a boat or deduct this section from the estimated walk on that basis. The exact path is still unknown; retain that uncertainty in the menu and link provenance. The original pedestrian router allowed ferries in three walking estimates (gaps 22, 31 and 51). Those now follow overland routes. The maintenance script explicitly excludes ferries and rejects results unless both trip and leg summaries confirm no ferry; an older cached result is reusable only with that same confirmation. A pedestrian travel-mode label alone is insufficient.

Playback traverses one continuous distance including estimated walking paths and train connections.
Every numbered day's end meets the next day's start. Missing days share the
connection to the next recording; days 16–17 divide their shared record
approximately. The menu preserves that qualification and the combined metrics.

The 6 September 2026 audit of the saved 29 July 2026 Strava export matched all
52 numbered walk recordings to the public route. Day 13 has two recordings:
its distance, moving time and ascent must aggregate both halves (42.9 km,
372 minutes and 856 m at the public rounding), rather than keep the last row.
The shared days 16–17 recording remains counted only once. The source has a
20.5 km straight-line gap between the end of day 33 and the start of day 34;
Dan now reports walking it; the reconstructed path remains an estimate.

On 7 September 2026 Dan requested that missing-walk estimates contribute to distance and ascent. `journey-metrics.js` combines the original 1,982 km and 50,339 m ascent with 254.92 km of reconstructed walking and approximately 1,695 m of mapped ascent. The current combined estimate is approximately 2,237 km and 52,030 m climbed. Keep the recorded and estimated portions explicit in the menu, with an `est.` qualification on counters containing estimates. Daily details show both sources, including estimates for days without recordings. The opening, metadata and finish use the combined total.

The source archive audit found that its five internal GPS gaps were omitted from the activity distances: the FIT distance counter stays flat at the large day-8 and day-26 jumps, and the GPX totals align with geometry excluding the day-53 and day-57 jumps. Add the reconstructed walks, retain original source totals, and exclude both train transfers. Estimate ascent by summing positive changes in each walking link's existing 200 m terrain samples; descents and train terrain add no climb. These coarse terrain estimates are not a resurvey of the 2019 walk.

Within-day recorded counters interpolate over recorded portions. Estimated distance advances along its corresponding walking link, and estimated ascent advances only over uphill parts of that link. Both remain continuous across day boundaries and reversible when seeking. The approximate division of missing days must not imply known daily measurements. "Metres climbed" is accumulated ascent, separate from the traveller's current ground height or camera altitude.

`data/trek-moments.json` owns six chapters and nine photo/note-backed moments.
Photographs belong to a day, not a verified coordinate. Retain the location
qualifications in the original-day details; do not invent landmark or summit
identifications from the images.

## Elevation and loading

On 6 September 2026 Dan requested an elevation profile for the whole journey,
preparation before playback and caching to keep the landscape smooth. Put the
profile as the scrubber, with one moving playhead and no visible numeric height labels.
Keep the larger day, distance and ascent figures, and keep the scene dominant
on desktop and narrow phones. Hide the profile during full-screen photographs.

`public/trek/elevation-profile.json` is generated by
`scripts/build-trek-elevation.mjs` from the already-public route and Mapzen's
Terrarium terrain tiles at zoom 11. It contains 12,028 mapped ground heights at
roughly 200 m intervals. These are approximate terrain elevations, not private
GPS altitude samples. Include every recorded section and presentation connection
across all seven countries. Connection heights describe the mapped ground beneath
the estimated path or train connection; use a dashed, quieter profile and
retain that distinction in the height label.
These samples do not imply a recorded walking route. The horizontal axis follows the continuous journey. Only reconstructed walking links contribute their uphill changes to the estimated ascent; the original recorded totals remain identifiable. Keep its
source route hash, estimated-link hash and generation method with the data. Regeneration uses a temporary
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
512 KiB. Prioritise the next 4 km and nearby terrain, then look ahead 12–40 km according to playback speed, with at most 192 planned tiles and three speculative requests at a
time; do not download every zoom level of Europe or promise the entire journey
works offline. Use the actual fractional camera zoom to select the vector and 256 px terrain levels. Reuse overlapping requests when the route advances; abort abandoned speculative requests after a seek without cancelling a foreground consumer. Prepare nearby tiles while the initial ground view loads, then prepare and settle the paper scenery at the final camera before enabling Play. These bounds reduce pop-in but do not promise that slow networks can never reveal a new tile.

Version the local recorded route, estimated links, moments, style and elevation JSON by
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
`journey-pace.js` owns automatic viewing pace. It samples the existing 200 m ground profile for height and local relief, and reads nearby settlement, residential, woodland and water geometry from already loaded map tiles. It looks ahead along the actual route, slows around the ten mapped landmarks, and bounds acceleration and braking. Map queries are throttled, geometry is prepared outside the animation loop, and sampled scene/terrain caches are bounded. Pending scenery tiles limit acceleration. It adds no provider requests or public route data. `scripts/check-trek-pace.mjs` checks geographic triggers, clearings, departure, whole-route bounds and smooth speed changes.

`journey-traveller.css` owns the presentation. `journey-wayfinding.js` owns the
inset and settlement selection; `data/trek-landmarks.json` owns reviewed landmark
positions and public source links, and `journey-landmarks.js` makes their meshes.
Earlier map, journal and clock
files are inactive.

`journey-paper.js` owns the paper palette, mapped field and rock fills, printed
ground material, slope facets, tree shadows and the custom WebGL scenery layer.
It uses the map's existing vector tiles and elevation; no additional account,
imagery service or credentials are required. Cultivated fields, pasture and mapped orchards have separate material: directional crop rows, loose meadow fibres, small orchard crowns and narrow cut-paper boundaries. Read both the landcover class and subclass so mapped meadow and orchard polygons receive their treatment. Keep the global fibre wash light enough for the land detail to stay crisp. Individual trees illustrate mapped
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

Mapped orchard/nursery polygons may contain up to 500 smaller broadleaf trees in fixed geographic rows, clipped to their boundaries and holes. These share the 6,500-tree budget and keep roads, waterways and the route open; never put them on unclassified land.

Scenery is limited to 6,500 trees, 1,800 custom roofs and 2.4 million custom
vertices near the view, reserving 30,000 vertices for landmarks, with a distant
fade. Woodland uses a 32 m grid in projected map space; the varying crown shapes
and optional underside folds remain seeded per tree, without camera-dependent
shape changes. Ground canopy print carries forest texture into the distance.
New scenery objects ease in over 700 ms while existing objects retain their reveal times across rebuilds. Build loaded foreground geometry even while future tiles are still loading. A distant seek invalidates an unfinished old scene, and explicit preparation includes the reveal before Play.
Geometry is rebuilt in short chunks after movement or source changes,
never by querying every feature on every frame. Reuse the map's WebGL context,
use a local coordinate origin for precision and discard stale in-flight builds
after a new destination. Upload the lit canopy vertices in 192 seeded variants
once, then retain their WebGL buffers for the visit. WebGL 2 instancing draws the
same full meshes using twenty bytes of position, terrain height, scale and reveal
time per tree on each rebuild. Do not expand all the canopy vertices into a new
JavaScript array or upload them again as the camera moves. Keep roofs and
landmarks in their existing geometry buffer. Clear unused instance counts after
a seek and release both kinds of buffers when removing the layer. The debug
status reports total drawn vertices and actual uploaded bytes separately.
The material and facets stay attached to the ground.
Retry pending scenery when the map becomes idle: source events can arrive before
the destination camera finishes loading, and a paused first visit must populate
without needing Play or a day change. Do not let that retry become an idle loop.
If the extra scenery cannot initialise, retain the terrain, days and photographs.
Keep dynamic GeoJSON sources at zoom 18, above the view cap of 17. Lower source
caps exposed a MapLibre 5.6.2 child-tile retention error when resizing between
phone and desktop while terrain was active. Include those resizes in browser QA.

MapLibre 5.6.2 and its licence are vendored. One scoped local fix in
`_updateRetainedTiles` uses each tile’s `overscaledZ` to choose between a single
overzoomed child and four normal children, matching `OverscaledTileID.children`.
Terrain can supply a tile above the view’s covering zoom during a resize; the
original covering-zoom test could read the key of a nonexistent second child.
The upstream definitions are in
[`source_cache.ts`](https://github.com/maplibre/maplibre-gl-js/blob/v5.6.2/src/source/source_cache.ts)
and [`tile_id.ts`](https://github.com/maplibre/maplibre-gl-js/blob/v5.6.2/src/source/tile_id.ts).
`check-trek-maplibre.mjs` reproduces the original crash with mixed zooms and
checks both child counts. The vendored script has a content hash in the loader;
retain the fix or verify it is resolved when upgrading the library. `journey-style.json` derives from
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
weighted 880 m neighbourhood for its reference point and a broader 4.5 km heading chord
(1,125 m behind to 3,375 m ahead), following the valley through short zigzags
and loops without circling with the local path.
A damped turn settles without swinging back, bounded by 12°/s rotation and
6°/s² acceleration. Pitch changes by at most 3°/s, with a 36° target over dense
bends and a 34° floor for combined landmark framing. Playback brakes before
upcoming bends using a 9°/s curvature budget, then slows further when the view
needs to catch up. Height planning uses continuous interpolation of the cached
200 m elevation profile, with a 200 m neighbourhood for the ground reference
and an envelope from 2.2 km behind to 3.2 km ahead for rising terrain. Aim
850 m above that envelope, adding
up to 1,100 m where the route folds back on itself, with additional height where
the viewport needs it to fit the nearby path. Fit 13 points along 1.4 km on
straight sections, widening smoothly to 2.7 km around loops. Offset the eye
behind that frame, with room above the controls in portrait and short landscape
layouts. Ease vertical acceleration
within 65 m/s² and movement within 180 m/s upward and 110 m/s downward; retain a
420 m defensive floor. Continuous Alpine checks must clear the ground without
needing that clamp. These are presentation camera speeds, not walking speeds.
Solve the complete camera transform from the eye and a target at mapped ground
height; changing pitch after solving zoom and centre moves the eye and can cause
clipping. Rebase the reference elevation every frame from the stable profile.
Do not drive it directly from the currently rendered DEM: day 31 exposed brief
600-to-1,234 m lookup changes across a few metres of travel, causing sharp lifts
and zoom changes. Keep rendered terrain queries as a separate clearance check.
Retaining an old mountain reference after descending also forces a distant zoom
and enlarges the draped roads and route.
`npm run check:trek:dom` covers actual terrain readiness, quiet controls,
steep viewpoints and sustained camera movement, photographs, original records,
continuous playback and heading changes, automatic-photo
timing, phone fit, resize, replay, reduced motion and graphics loss.
`CHECK_TREK_ZIGZAGS_ONLY=1` focuses the browser check on repeated Alpine bends,
the day-17 loop, static country fills and the inset at phone widths.
`CHECK_TREK_TERRAIN_CAMERA_ONLY=1` covers continuous day-31 playback through the
reported tile seams, the Alpine descent, extra height around the tight loop,
bounded height and scale changes, rendered terrain clearance and phone framing.

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

`check-trek-metrics.mjs` verifies recorded and estimated totals, partial uphill progress, descents, both train exclusions, all day boundaries and backward seeks. `CHECK_TREK_PROGRESS_ONLY=1` checks these counters in the running landscape, the source breakdown and readable totals at 1440, 390, 320 and short landscape sizes.

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

`CHECK_TREK_TIMELINE_ONLY=1` (also selected by `CHECK_TREK_CONTROLS_ONLY=1`)
checks the combined elevation/day axis, visible country colours, mouse and touch
dragging, release preparation, keyboard endpoints and the visible speed cycle and menu sync,
paused and playing speed changes, ribbon fill through backward seeks and replay,
estimated walking progress on missing days, automatic photos, native map credits, and
readable controls at desktop, 390px, 320px and short landscape sizes.

`CHECK_TREK_WALKING_ONLY=1` checks reconstructed walking paths and their estimated progress, the caption-free print and original photo, shared mark type,
and continuously visible route samples through bends at 8× on desktop, narrow
phones and short landscape viewports. The mark samples the small rendered patch
beneath it at most every 280 ms and eases its shared colour between dark green
and warm white. A small hysteresis band keeps it readable at middle brightness
without flickering between the two inks. `CHECK_TREK_FINISHES_ONLY=1` exercises
all seven static country fills and dark, light and middle-brightness contrast
samples. No screenshot, second renderer or persistent image is retained.

`CHECK_TREK_VEHICLES_ONLY=1` exercises the two long German tunnels on desktop and phones: visible train pixels, continuous playback, source alignment, stable walking totals and return to walking.
