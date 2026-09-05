# Trek: Paris to Sofia

This is a friend's view of a long walk: first understand the shape of the
journey, then follow its places, photographs and music. The route is the main
surface; its controls and supporting facts should stay quiet and readable.

## Presentation

- Warm paper, sage terrain, country-coloured route lines and a restrained
  Fraunces title establish a small carved landscape. The orange marker locates
  the traveller. Avoid floating dashboard cards, dark game chrome and invented
  geographic detail.
- The opening fits the whole model on desktop and phone. Scroll or Begin moves
  through the actual numbered days and brings the landscape closer. Countries
  and town labels jump to their associated point in the journey.
- Horizontal dragging rotates the relief; the two turn buttons provide a
  keyboard alternative. Vertical touch movement continues scrolling the journey.
  Pause, Resume, Replay and Reset are explicit controls. Manual scrolling and
  Escape pause playback. Hidden pages pause, and a settled view stops rendering.
- The current note and photographic strip stay near the top. Collection lists
  occupy spare desktop space; a compact current-record button preserves access
  to music on narrower screens. The record dialog supports previous/next,
  keyboard navigation and closing without losing the journey position.
- Keep labels within the canvas, suppress collisions and preserve the country
  navigation's native horizontal scrolling on phones. Do not shrink desktop
  collection columns into the mobile route.

## Geography and source ownership

`data/trek-days.json`, `data/trek-journal.json`, the existing photo manifest and
cover assets own the published journey. Retain all 67 days, 52 recorded tracks,
394 photographs with their approved dates/times, and the factual journal
projection. No new private route, narrative or image source is introduced.
The existing journal checker owns the field allow-list and excluded subjects.
Trek stays standalone, `noindex` and `noimageindex`.

`data/trek-terrain.json` supplies the cached Open-Meteo grid: 56 by 34 samples
covering the journey. The relief builds 3,630 triangles from these 1,904 heights.
Country silhouettes are clipped to that coverage; never extrapolate mountains
into unsampled country regions. Route ribbons and labels use the same terrain
triangles so they meet the surface. This coarse, exaggerated model illustrates
the journey; it is not a navigation map or a survey of individual mountains.
The visible source caption must retain that distinction.

`scripts/build-trek.mjs` generates the approved public projection and
`public/trek/index.html` from `scripts/trek-page-template.html`.
`public/trek/relief-map.js` is the small WebGL renderer; it adds no framework,
remote map service or new dependency. The existing SVG Atlas is a selectable
alternative. Missing WebGL, initialization failure or graphics context loss
must select Atlas, disable unavailable controls and preserve the route position.

## Verification

Use `npm run trek:build` during iteration. `npm run check:trek-privacy` also
checks the generated geometry against source elevations, sampled coverage,
finite route projections and city/day targets. `npm run check:trek:dom` reuses
the isolated browser harness for actual rendered interaction: town and country
jumps, playback, keyboard Pause, reset, end/replay, mobile music/photos,
320/390px fit, idle rendering and unavailable/lost graphics contexts.

Run `npm run publish:ready` once at the publication boundary, then both rendered
checks against the export. After Pages succeeds, use `CHECK_NAV_URL=https://akibwa.com`
with the affected rendered check and inspect the live desktop and phone views.
Compilation and DOM checks alone do not establish visual acceptance.
