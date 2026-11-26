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
    has sub-genres, 40 in all, one for each artist with a record on the shelf
    (Dan, 25 November: “can we break these further into sub genres too using astra?”).
    A genre is one group under one heading: its kraft tab, its figures, and its
    sub-genres as the words at the heading's far end, most listened first. It stands
    whole, most listened first. Pressing a sub-genre cuts the genre to that sub-genre's
    records; pressing it again brings the whole genre back. Another order puts every
    genre back whole.
    The figures say the same three things of a genre and of a sub-genre: its records,
    its share of the shelf's listening and its hours (Dan, 26 November: “you can also
    have records here and also do % of listening for sub genres too”). A share under one
    in a hundred reads “<1%”.
    A cut turns as a new order does (Dan, 26 November: “do the same fade on the sub
    genre buttons as when swappnig menu buttons so it's all consistent”). The word
    answers at once. That genre's shelf and everything beneath it fade out over 150 ms,
    take their new places unseen and lift in; the heading that was pressed stays as it
    is. Sleeves that glided from their old places to their new ones on a cut were
    replaced by this the same day; do not bring them back.
    The chosen word takes the bar's rust, and the heading's rule turns rust beneath it.
    That mark is one piece. It slides along the rule from one word to the next (Dan,
    26 November: “can these not slide along rather than appear”), is drawn out from a
    word's start when a genre is first cut, and is drawn back when it is made whole.
    Where the words scroll, the chosen one is kept in sight.
    A sub-genre is named on its genre's heading and nowhere else. Until 26 November
    each stood over its own records under a smaller heading, and the genre's words went
    to the other six genres. Dan asked for the words to be the sub-genres (“can these
    not contain subgenres rather than the other genres?”), and naming them there as well
    as over their records was turned down (“having like drones and loops in the top
    right as well as the bottom left feels weird. Like can that not all just be the
    same interface”). Do not bring the second row of headings back.
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
- A search and a change of width still glide the sleeves to their places; a heading on
  the screen moves with the sleeves under it, and one from another screen fades in.
  Use only the headings an order needs. Search finds albums and
  singles together in one group, most listened first. Choosing an order clears search.
  The signature returns to hours, clears the search and scrolls to the top.
- Keep one pinned row. Leave equal gaps between the signature, each sort option and
  search. A soft rust background marks the chosen sort. The signature's panel starts on
  the sleeves' left edge and search ends on their right (Dan, 25 November: “align the
  logo”). Search is 40 px tall and every chip 34 px. Search opens from the right below
  900 px. Pressing / focuses it, and Escape clears it. The row closes up in steps as
  the screen narrows, the last below 310 px for a folded phone's cover screen.
- A group's heading is one line: its name on a kraft tab, its figures, then quiet words
  at the far end (Dan, 25 November: “is the genre bar placed somewhere better that fit's
  with the more minimalist theme?”). A decade's or a year's words are the other decades
  or years, to go to; a genre's are its sub-genres, to cut it by. There is no row of
  jumps apart from the headings, and no pill behind a word: at the head of a phone's
  shelf the pill was cut off by the screen's edge (“the pill can go off screen”). The
  tab and its figures never move. Where the words do not all fit on some heading, every
  heading shortens its figures to the hours alone. Where they still do not fit, a
  hairline parts the figures from the words, and the words scroll sideways in the room
  that is left, fading at the edge they run past.
- Nothing runs past the screen's edge at any width from 280 px up (“fix any bugs in
  this regard”). Check a change to the bar or a heading at 280, 320, 390 and 720 px in
  every order.
- A search shows its query, number of matches and listening time. - A jump to a decade
  or a year within a screen and a half scrolls there. A jump further turns the page as a
  new order does: the shelf fades out, is put at the group at once and lifts in there.
  Scrolling smoothly to a far group dragged every row between through the screen and
  loaded its covers on the way (Dan, 25 November, of the jump to Undated: “it lagged
  when i CLICK Undated and it went to the bottom fix this”); do not bring it back.

## The signature

Use Dan's drawing at the top left without a wordmark. The same SVG is the favicon.
Keep his warm colours, marker streaks, ink hatching and the thin gold border he chose on
19 November. The dark panel is a straight-edged square. Crop to the head, halo, rays and
the sheet he holds. The halo and rays rise above the panel. Leave out the small dots,
flat blue ground and the bands and stars from the reverted version. The sheet has the
globe on it, as he drew it and as the studio's cover shows it (Dan, 25 November: “this
isn't using the globe one”). From 19 to 25 November it was a page of handwriting; do not
bring that back. [Signature artwork](../public/akibwa-mark.svg)

It moves as the same drawing does on the studio's cover at ohlifestudios.com (Dan,
26 November: “match the beauty of the animation on ohlifestudios”):
- It waits for its picture, then dissolves in whole over a second, a slow start and a
  long settle. Only its opacity changes; a logo that turned and tilted as it arrived
  was turned down (Dan, 18 November: “the animation is super ugly”).
- A warm light swells in the halo's gold and settles again every six seconds, fullest a
  little before the middle. A soft radiance spills past the rim and fades before his
  shoulders. The five rays reach out and draw back with it, the middle one first.
- The strengths are the studio's, set for this size and for paper: the radiance is a
  deeper gold, because the cover's pale one does not show on paper, and the rays reach
  half as far again, because here they are half as long. Keep the glow quiet (Dan,
  25 November, of the cover: “the glow be more subtle”).
- Under the pointer or the keyboard the light and the radiance come up and stay, and
  the rays reach a little further (Dan, 19 November: “can the emblem have a hover too
  like the halo glows”). The breath goes on over it.
- With reduced motion the drawing stands still as Dan drew it, and still glows under
  the pointer.

The picture itself never moves. The page draws only the light and the rays over it,
from shapes read out of the drawing when the shelf is built, so a redrawn mark needs
nothing copied by hand; while they move, the page hides the picture's own rays. Do not
animate the picture's file instead: drawing the whole picture again every frame took
21 ms of the page's main thread every second in Chrome, for as long as the page was
open, against half a millisecond this way (measured 26 November 2026).
[Light's shapes](../lib/signature-light.mjs) · [Light's motion](../app/globals.css)

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
  Pressing the sleeve keeps the sheet open when the pointer moves on. Pressing the
  sleeve again, pressing anywhere else or Escape lets it go. A tap or the Enter key
  opens it the same way. Keep the scroll position. The sheet has no close button of
  its own (Dan, 26 November: “get rid of the X the X is just clicking anywhere else”);
  do not bring one back.
- Keep the sleeve fixed in place and at the same size. Blend light into its artwork,
  sweeping one band at its own angle, speed and direction, with a soft corner gloss and
  slightly deeper colours.
- Hovering or focusing a sleeve leaves it and its related covers at full brightness.
  All other covers fade darker. Include other
  releases by the artist and their connected bands or collaborators. Two joint credits
  that share a name are connected: Carnage, by Nick Cave & Warren Ellis, lights Nick
  Cave & The Bad Seeds (Dan, 26 November: “hovering over carnage doesnt show the other
  nick cave records highlighted”). Pick up to four
  more sleeves by different artists, starting with those in view. Match their genre
  tags and use the shelf’s broader genres and release years to guide the choice.
  Clicking or tapping keeps the same contrast while the songs are open.
- The sheet's heading runs its whole width (Dan, 26 November, of the name with every
  fact set close after it: “it's kind of bunked up”, “not so dominant to the left”). The
  record's name in bold, then its artist and year, stand at one end. How often and how
  long it has been played stand at the other, over the songs' own times and set as they
  are, a size larger: each number bold, its unit quiet beside it, a point between the
  two. Both figures weigh the same. The plays quiet beside a large number of hours was
  not plain enough (“it doesn't feel obvious enough to me the plays and time”), and both
  numbers as large as the name were too loud (“way more garish”); do not bring either
  back. On a laptop that is one line. A sheet narrower than 900 px gives the name a line
  of its own, with who and the figures on the next, still end to end.
- Nothing in the heading wraps, so it is the same shape for every record (Dan, 26
  November: “can we have stuff faded and rolling / animated if it doesnt fit across etc
  so everything is consistent”). A record's name or an artist too long for its room
  fades at the edge it runs past and rolls under the pointer or a tap, as a song's name
  does. The artist gives way before the name, and the figures never.
- Its songs follow, most listened first, as a ledger (Dan, 25 November: “there must be
  a better clean way of showing this information”). Songs read down columns of equal
  width across the full sheet. Divide the songs evenly, with the longer columns first.
  The chips that wrapped and stretched, each filled to its own width, are gone; do not
  bring them back.
- The songs always fill the sheet's width; the shelf chooses how many columns (Dan,
  26 November: “can it not dynamically fill the bar so it utilises space the best”). It
  measures each name and time against the room. Every name stands in full where it
  can: one name in eight may run past its line and fade, never more. Of the ways that
  leaves, it takes the fewest rows; then, for a folded record, the most songs shown;
  then the widest columns. A column is never narrower than 132 px, and a name counts as
  full only with 8 px to spare. A name too long for the whole sheet fades wherever it
  stands, so it has no say. On a phone that keeps most records to one column; two
  columns there cut a third of a record's names short. The layout adjusts when the
  sheet changes width.
- A record whose songs all fit on one line stands on one line, however many columns that
  takes (Dan, 25 November, of seven short names on two lines: “can't this fit on one line
  comfortably?”). On one line every name stands in full.
- Each song stands on a ruled line with its time in bold at the line's end. The line is
  drawn heavier, 3 px on a hairline, for as far as the song's hours reach against the
  record's favourite, and sits close under the words. One thin even line, 2 px and set
  further from the words, was tried on 25 November and turned down (Dan: “I actually
  liked the thicker and tighter”); do not bring it back.
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
