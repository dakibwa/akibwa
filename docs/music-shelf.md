# The music shelf

Dan asked for the listening hours on 24 September 2026 and made the shelf the whole
site on 16 November. His direction was “super minimalist and simple”. Use Alegreya
small capitals spaced wide, italic names, thin ink edges and flat paper. The sleeves
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
also keeps its album unless it has a published single cover. Open on albums. The ranking's `albums` are the top 150 by
plays, `sleeves` are the remaining albums and `singles` supplies the singles view.
The layout, merging and ordering code runs in the build checks against real records.
[Shelf implementation](../components/paper/music-shelf.mjs)

## Rows, ordering and search

- Keep covers square and uncropped. Each full row fills the width. Its sleeves share one size
  based on hours. Use a 4 px gap in both directions, a floor around 60 px on a laptop and
  44 px on a phone, and a cap around 200 px with four across on a phone.
- Hours, year, genre and A to Z work in either view. Year includes records played at least
  an hour that calendar year and sizes them by that year's hours. Genre is `kind` in code,
  one curated kind per artist. Selecting year or A to Z again reverses the order, to oldest
  first or Z to A. The chosen order appears in muted rust.
  [Year totals](../public/music-years.json) · [Artist genres](../public/music-kinds.json)
- Glide the whole shelf into order and use only the headings it needs. Search finds albums
  and singles together in one group, most listened first. Choosing an order clears search.
  The signature returns to hours, clears the search and scrolls to the top.
- Use one pinned, unruled bar at every width. Set the signature just inside the left edge.
  From 1,000 px up, grow the mark, words and search with the screen. Centre the row on the
  mark's dark square, lift the words on hover and set the search slightly smaller. On a
  phone, its mark opens the borderless search from the right over the orders. The cross
  clears and closes it.
- Set each menu word in plain Alegreya small caps. A–Z reads Z–A when reversed.

## The signature

Use Dan's drawing at the top left without a wordmark. The same SVG is the favicon.
Keep his warm colours, marker streaks, ink hatching and the thin gold border he chose on
19 November. The dark panel is a straight-edged square. Crop to the head, halo, rays and
handwritten page. The halo and rays rise above the panel. Its soft gold ring brightens
and breathes on hover. Leave out the small dots, flat blue ground and the bands and stars
from the reverted version. The page he holds has lines of handwriting across it.
[Signature artwork](../public/akibwa-mark.svg)

## Opening and inspecting a record

- Resting the pointer on a sleeve or focusing it shows its title, artist, year and
  hours in a small caption at the bottom left. A quick pass across the gaps keeps
  the previous selection until the pointer settles. Keep the sleeve the same size. Blend light into
  its artwork, sweeping one band at its own angle, speed and direction, with a soft corner
  gloss and slightly deeper colours.
- Hovering or focusing a sleeve leaves it and its related covers at full brightness.
  All other covers fade darker. Include other
  releases by the artist and their connected bands or collaborators. Pick up to four
  more sleeves by different artists, starting with those in view. Match their genre
  tags and use the shelf’s broader genres and release years to guide the choice.
  Clicking or tapping keeps the same contrast while the songs are open.
- Open the tracks directly under the selected sleeve’s row, most listened first.
  Set the album title in italic, then the artist and its total in words, such as
  “1,006 hours listened”. Spotify and Apple Music are small text links. Songs
  read across compact rows. Fit as many equal-width labels across as the shelf
  allows. Each background fills in proportion to the most-listened song on that
  record, with the listening time in bold Georgia beside the italic title. Above twelve rows, show ten rows and a button to reveal the rest.
  Omit a lone song only when the header already gives its title and time.
  Keep the page still on opening.
  Selecting another sleeve moves the list there. The same sleeve, the close
  button or Escape folds it away. [Listening links](../public/music-links.json)
- Reveal the page once its small capitals have loaded. Fade in the bar and mark, lift
  the first screen of sleeves in sequence, fade covers as they arrive, and lift later
  rows as they scroll into view. Use transform and opacity with `cubic-bezier(0.16, 1, 0.3, 1)`.
  Stop motion for reduced motion.

## Artwork and data refresh

Use reviewed covers from Apple Music, Deezer or the Cover Art Archive. A record without
its own cover can borrow one from another release on which its songs were played. Check
each cover against an independent image or by eye. `check:navigation` enforces this.
[Reviewed artwork](../data/listening-artwork.json) · [Cover checks](../data/music-sources.json)

The static export uses unoptimised images. Render album sleeves with `AlbumArtImage`
from `components/site-image.jsx`. It emits a 264 px `-wall` AVIF with a WebP fallback,
and a `-large` rung where needed. Pre-render once at final size from the best source.
Re-encoding lossy WebP preserves its artefacts and inflates the file.
[Image component](../components/site-image.jsx) · [Artwork builder](../scripts/build-music-art.mjs)

Use `npm run music:refresh -- --history-root <private-history-directory>` for the
catalogue, ranking, years, covers, genres and links. Keep that path private. Publish
only approved aggregates and whole-year listening totals. Playback estimates for later
Last.fm plays have been included since 18 November. Use the data guide for source
coverage, counting rules and validation. [Listening history](listening-history.md)

September's packed map, separate albums/songs view, hours written on every sleeve,
growing hover covers and line of years were superseded by this November shelf.
The earlier front-page and room designs were retired. Search, track lists and listening
links carried forward.
