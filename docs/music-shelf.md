# The music shelf

Dan asked for the listening hours on 24 September 2026 and made the shelf the whole
site on 16 November. His direction was “super minimalist and simple”. Use Nunito Sans for controls and facts, soft Fraunces for titles and headings,
and warm paper under the covers. The sleeves
supply the colour. Keep the page free of explanatory text.

## Which records appear

The shelf holds the top 1,000 records by listening hours across albums and singles
(Dan, 18 November). Count each song on one record. Start with the release that supplied
most of its plays. If that release is a single or EP and the song appears on a fuller
album by the artist that Dan played, assign it to the album. *Bubblegum Dog* goes on
*Loss of Life*. Fold editions into one record, including the Everasking Edition of
*Desire, I Want to Turn Into You*. The folds file covers singles that Apple lists on a
played album. [Release folds](../data/music-folds.json)

A song accounting for over 90% of a record’s listening time becomes a single, using its
own cover where available. Verified releases and the top 150 albums by plays keep their
album identity, including *Discreet Music*. A piece averaging over ten minutes per play
also keeps its album unless it has a published single cover. Albums and singles stand on
one shelf together (Dan, 25 November: “I do think singles and albums should be combined”);
the switch between them, added on 18 November, is gone. The ranking's `albums` are the top
150 by plays, `sleeves` are the remaining albums and `singles` are the singles.
The layout, merging and ordering code runs in the build checks against real records.
[Shelf implementation](../components/paper/music-shelf.mjs)

## Rows, ordering and search

- Keep covers square and uncropped. Each full row fills the width. Its sleeves share one size
  based on hours. Use a 4 px gap in both directions, a floor around 60 px on a laptop and
  44 px on a phone, and a cap around 200 px with four across on a phone.
- The bar orders the shelf four ways, named as Dan asked on 25 November (“Time Listened,
  Genre, Released Date? Listen Date?”): Time listened, Genre, Release date and Listen date.
  A phone shows Hours, Genre, Released and Listened. The chosen order appears in muted rust.
  - Genre is `kind` in code, one curated kind per artist.
  - Release date groups records by the decade they came out, most listened first in each.
    A record with no known year waits at the end under Undated. Years come from the
    catalogue, then MusicBrainz, then the hand-checked list in the meta build script.
  - Listen date is `year` in code. It holds each record played at least an hour in a
    calendar year, sized by that year's hours.
  - Selecting either date order again reverses it, to oldest first. A to Z was dropped
    with this menu; search finds a record by name.
  [Year totals](../public/music-years.json) · [Artist genres](../public/music-kinds.json) · [Release years](../scripts/build-music-meta.mjs)
- Glide the whole shelf into order and use only the headings it needs. Search finds albums
  and singles together in one group, most listened first. Choosing an order clears search.
  The signature returns to hours, clears the search and scrolls to the top.
- Keep one pinned row. Leave equal gaps between the signature, each sort option and
  search. A soft rust background marks the chosen sort. The signature's panel starts on
  the sleeves' left edge and search ends on their right (Dan, 25 November: “align the
  logo”). Search is 40 px tall and every chip 34 px. Search opens from the right below
  900 px. Pressing / focuses it, and Escape clears it.
- Set group names on kraft tabs, with a row of jumps for genres, decades or years.
  A search shows its query, number of matches and listening time.

## The signature

Use Dan's drawing at the top left without a wordmark. The same SVG is the favicon.
Keep his warm colours, marker streaks, ink hatching and the thin gold border he chose on
19 November. The dark panel is a straight-edged square. Crop to the head, halo, rays and
the sheet he holds. The halo and rays rise above the panel. Its soft gold ring brightens
and breathes on hover. Leave out the small dots, flat blue ground and the bands and stars
from the reverted version. The sheet has the globe on it, as he drew it and as the studio's
cover shows it (Dan, 25 November: “this isn't using the globe one”). From 19 to 25 November
it was a page of handwriting; do not bring that back.
[Signature artwork](../public/akibwa-mark.svg)

## Opening and inspecting a record

- Resting the pointer on a sleeve, or focusing it, shows its sheet under its own row
  (Dan, 25 November: “rather than clicking when you hover it should show the stats below
  it? and the name etc”). The sheet floats over the rows beneath and moves nothing. The
  pointer passes through it to the sleeves it covers. Near the foot of the screen it
  stands above the row instead. Its notch points at its sleeve and glides along the row.
  The corner caption this replaced is gone.
- A first glance waits about a tenth of a second for the pointer to settle. A quick pass
  across the gaps keeps the previous sleeve. The shelf answers only a pointer that moves:
  scrolling puts a floating sheet away, and a sleeve that slides under a resting pointer
  waits for it to move.
- Pressing a sleeve sets the same sheet into the shelf, where the rows make room and it
  can be folded out and closed. Pressing the sleeve again, the close button or Escape
  lets it go. A tap or the Enter key opens it the same way. Keep the scroll position.
- Keep the sleeve fixed in place and at the same size. Blend light into its artwork,
  sweeping one band at its own angle, speed and direction, with a soft corner gloss and
  slightly deeper colours.
- Hovering or focusing a sleeve leaves it and its related covers at full brightness.
  All other covers fade darker. Include other
  releases by the artist and their connected bands or collaborators. Pick up to four
  more sleeves by different artists, starting with those in view. Match their genre
  tags and use the shelf’s broader genres and release years to guide the choice.
  Clicking or tapping keeps the same contrast while the songs are open.
- The sheet says the record's name in soft italic Fraunces, then its artist, year, hours
  and plays. Its songs follow, most listened first, as a ledger (Dan, 25 November: “there
  must be a better clean way of showing this information”). Songs read down columns of
  one width: one on a phone, five at most. Each song stands on a ruled line with its time
  in bold Fraunces at the line's end, and the line is drawn heavier for as far as its
  hours reach against the record's favourite. A long name takes a second line in its own
  column only. The chips that wrapped and stretched, each filled to its own width, are
  gone; do not bring them back.
- Fold a long record: one column shows ten songs above twelve, wider sheets six rows,
  with a button for the rest. Shorten song names by dropping guest credits, remaster notes
  and composition attributions. Keep subtitles, and set a version note (demo, live, take)
  quietly after the name. Omit a lone song when the header already gives its title and time.
- Show the shelf as soon as the HTML arrives (Dan, 25 November: “load times
  immediate”). A small script in the page sizes every sleeve with the shelf's own
  row rules, loads the first screen's covers and lifts that screen in, before the
  shelf's code has loaded. The shelf then takes over the same rows, so nothing
  moves. Both read one file, so they cannot disagree, and both lay out for the
  whole pixels the shelf really has: a width of 780.6 px is 780.
  [Row rules](../components/paper/shelf-rows.mjs) · [Early script](../app/page.jsx)
- Reveal the page once its menu and title fonts have loaded. Fade in the bar and mark, lift
  the first screen of sleeves in sequence, fade covers as they arrive, and lift later
  rows together as they scroll into view. Reserve each row’s height so the browser can
  skip offscreen artwork. Use transform and opacity with `cubic-bezier(0.16, 1, 0.3, 1)`.
  Stop motion for reduced motion.

## Artwork and data refresh

Use reviewed covers from Apple Music, Deezer or the Cover Art Archive. A record without
its own cover can borrow one from another release on which its songs were played. Check
each cover against an independent image or by eye. `check:navigation` enforces this.
[Reviewed artwork](../data/listening-artwork.json) · [Cover checks](../data/music-sources.json)

The build compiles track lists, artist connections, search facts and listening years
from the public aggregates into one cacheable catalogue. Opening a record, searching
and changing order all work with the data already in the page. Every record has a
labelled button. Sorting moves those buttons and reuses their artwork. On a long shelf,
art loads ahead of the viewport. The full set of covers is also in the HTML for visitors
with scripting disabled.

Each cover uses the original 264 px wall AVIF with a WebP fallback and the large rung
where available. The export fingerprints those files so an unchanged cover can come
straight from cache and replacement artwork gets a fresh URL.
[Tile rendering](../components/paper/music-tiles.mjs) · [Catalogue build](../scripts/build-shelf.mjs)

Use `npm run music:refresh -- --history-root <private-history-directory>` for the
catalogue, ranking, years, covers, genres. Keep that path private. Publish
only approved aggregates and whole-year listening totals. Playback estimates for later
Last.fm plays have been included since 18 November. Use the data guide for source
coverage, counting rules and validation. [Listening history](listening-history.md)

September's packed map, separate albums/songs view, hours written on every sleeve,
growing hover covers and line of years were superseded by this November shelf.
The earlier front-page and room designs were retired. Search and track lists carried forward.
