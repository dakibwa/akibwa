# The music shelf

Dan asked for the listening hours on 24 September 2026 and made the shelf the whole
site on 16 November. His direction was “super minimalist and simple”. Use one family
for the whole page, the menu's Nunito Sans (Dan, 25 November: “the fonts all seems random
too can we be consistent across the entire page if we use the ones at the top lets
continue to do that”). Weight and size set a title apart from a fact: 800 for names,
totals and times, 500 to 700 for the rest. Fraunces, which set titles and times until
then, is gone with its files; do not bring a second face back. Keep warm paper under
the covers. The sleeves supply the colour. Keep the page free of explanatory text.

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
- The bar orders the shelf four ways, a word each on every screen: Hours, Genre,
  Released and Listened (Dan, 25 November: “can we use single words intead of Release
  Date Time lisstened etc”, after asking that morning for “Time Listened, Genre, Released
  Date? Listen Date?”). The chosen order appears in muted rust.
  - Hours is time listened, most first.
  - Genre is `kind` in code, one curated kind per artist. Each of the seven genres
    stands in sub-genres, 39 in all, one for each artist with a record on the shelf
    (Dan, 25 November: “can we break these further into sub genres too using astra?”).
    A genre keeps its kraft tab and its share of listening; its sub-genres follow, most
    listened first, each under a smaller heading on a hairline with its records and
    hours. A sub-genre has no jump of its own: the words on a genre's heading go to
    the other six genres.
    An artist is filed by the records on this shelf, not by a whole career. A new
    artist needs a sub-genre in the kinds file, or the build check fails.
  - A record that does not belong where its artist does is filed on its own, by its id,
    in the kinds file's `records` (Dan, 25 November, of the artists found in the wrong
    genre: “they are wrong for sure put split them based on your genre”). Arcade Fire's
    albums are indie and their score for *Her* is ambient; Brian Eno's ambient records
    stay in ambient and his four song albums of the 1970s stand with art rock. Where no
    genre of the seven fits, use the nearest one there is: jazz and classical go to
    classics, under jazz & classical, and the comedy acts have a sub-genre in indie.
  - Released groups records by the decade they came out, most listened first in each.
    Every record has a year (25 November: the last 23 were researched one by one with
    sources, and the hand-dated ones checked). A record that arrives without one waits
    at the end under Undated until it is dated. Date the version on the shelf, not the
    song: a live cut or a later orchestral version carries its own year. Years come
    from the catalogue, then MusicBrainz, then the reviewed list in the meta build script.
  - Listened is `year` in code. It holds each record played at least an hour in a
    calendar year, sized by that year's hours.
  - Selecting either date order again reverses it, to oldest first. A to Z was dropped
    with this menu; search finds a record by name.
  [Year totals](../public/music-years.json) · [Artist genres](../public/music-kinds.json) · [Release years](../scripts/build-music-meta.mjs)
- A new order turns the page (Dan, 25 November: “rather than stuff flashing in and stuff
  when you click the release date nd listen date can we make it more beautiful”). The
  chosen word answers at once. The shelf fades out over 150 ms, goes back to its top and
  takes the new order unseen. When the first screen's covers have arrived, or after
  360 ms if they are slow, the headings fade in and the sleeves lift in as they do when
  the page opens: each row from its left, one row after another down the screen. Sleeves
  do not fly from their old places to their new ones on a new order, and nothing pops in
  on its own; do not bring that back. Pressing the order already chosen changes nothing.
  Reduced motion gets the new order at once.
- A search and a change of width still glide the sleeves to their places. Use only the
  headings an order needs. Search finds albums and singles together in one group, most
  listened first. Choosing an order clears search. The signature returns to hours, clears
  the search and scrolls to the top.
- Keep one pinned row. Leave equal gaps between the signature, each sort option and
  search. A soft rust background marks the chosen sort. The signature's panel starts on
  the sleeves' left edge and search ends on their right (Dan, 25 November: “align the
  logo”). Search is 40 px tall and every chip 34 px. Search opens from the right below
  900 px. Pressing / focuses it, and Escape clears it. The row closes up in steps as
  the screen narrows, the last below 310 px for a folded phone's cover screen.
- A group's heading is one line: its name on a kraft tab, its figures, then the other
  genres, decades or years as quiet words to go to, at the far end (Dan, 25 November:
  “is the genre bar placed somewhere better that fit's with the more minimalist
  theme?”). There is no row of jumps apart from the headings, and no pill behind a
  word: at the head of a phone's shelf the pill was cut off by the screen's edge (“the
  pill can go off screen”). The tab and its figures never move. Where the words do not
  all fit on some heading, every heading shortens its figures to the hours alone. Where
  they still do not fit, a hairline parts the figures from the words, and the words
  scroll sideways in the room that is left, fading at the edge they run past.
- Nothing runs past the screen's edge at any width from 280 px up (“fix any bugs in
  this regard”). Check a change to the bar or a heading at 280, 320, 390 and 720 px in
  every order.
- A search shows its query, number of matches and listening time.
- A jump to a group within a screen and a half scrolls there. A jump further turns the
  page as a new order does: the shelf fades out, is put at the group at once and lifts
  in there. Scrolling smoothly to a far group dragged every row between through the
  screen and loaded its covers on the way (Dan, 25 November, of the jump to Undated: “it
  lagged when i CLICK Undated and it went to the bottom fix this”); do not bring it back.

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

- Resting the pointer on a sleeve, or focusing it, opens its sheet in the shelf beside
  its row (Dan, 25 November: “rather than clicking when you hover it should show the stats
  below it? and the name etc”). The rows make room for it: they move down, and nothing is
  covered (Dan, 25 November: “rather than it appearing over can it push the albums below
  it down”). The sheet that floated over the rows beneath is gone; do not bring it back.
  The corner caption it replaced is gone too.
- The first sheet opens under its row, or over it when the screen has no room beneath.
  After that the sheet keeps to the gap the pointer has just crossed: over the row when
  the pointer came down to it, under it when the pointer came up. Moving to the next row
  then moves nothing; the sheet turns its notch to the new sleeve. The notch glides along
  a row.
- The sleeve in hand stays where it is. When a sheet's move would carry it, the page
  scrolls by as much instead.
- A sheet is exactly as tall as what it says. One that kept the height of a taller
  record, with blank paper under a short one, was a fault (Dan, 25 November: “this feels
  a bug”); do not hold a sheet's height.
- A sheet opens, changes and closes in one smooth move (Dan, 25 November: “can it feel
  much smoother too”, “it's a little janky now”). All at one pace, over about a third
  of a second: the rows and headings slide to their places; the sheet is uncovered edge
  by edge as the rows beside it draw back; and the sheet as it was fades out over the
  new one, or closes between its rows as they come together. Nothing blinks: a sheet
  never fades in from nothing, and what it says does not fade in either.
- A first glance waits about a tenth of a second for the pointer to settle, and a new
  row about as long. Passing over a sleeve or a gap keeps the sheet that is open; leaving the shelf
  closes it. The shelf answers only a pointer that moves: scrolling leaves the open sheet
  alone, and a sleeve that slides under a resting pointer waits for it to move.
- The open sheet can be used where it is: its long names glide and its fold opens.
  Pressing the sleeve keeps the sheet open when the pointer moves on, and shows its
  close button. Pressing the sleeve again, the close button or Escape lets it go. A tap
  or the Enter key opens it the same way. Keep the scroll position.
- Keep the sleeve fixed in place and at the same size. Blend light into its artwork,
  sweeping one band at its own angle, speed and direction, with a soft corner gloss and
  slightly deeper colours.
- Hovering or focusing a sleeve leaves it and its related covers at full brightness.
  All other covers fade darker. Include other
  releases by the artist and their connected bands or collaborators. Pick up to four
  more sleeves by different artists, starting with those in view. Match their genre
  tags and use the shelf’s broader genres and release years to guide the choice.
  Clicking or tapping keeps the same contrast while the songs are open.
- The sheet says the record's name in bold, then its artist, year, hours and plays. Its songs follow, most listened first, as a ledger (Dan, 25 November: “there
  must be a better clean way of showing this information”). Songs read down columns of
  one width: one on a phone, five at most. Each song stands on a ruled line with its time
  in bold at the line's end, and the line is drawn heavier for as far as its
  hours reach against the record's favourite. The chips that wrapped and stretched, each
  filled to its own width, are gone; do not bring them back.
- Every song name keeps to one line (Dan, 25 November, of names that took three: “allow
  it to scroll for these long ones”). A name longer than its line fades at the edge it
  runs past and scrolls sideways under a finger or a trackpad. Resting a mouse on a
  song carries its name to its end at a reading pace and leaving brings it back; a tap
  does the same. Names do not move on their own, and
  under reduced motion they move only by hand.
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
- Reveal the page once its font has loaded. Fade in the bar and mark, lift
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
