# Homepage interaction contract

Akibwa is one editorial index rather than a conventional portfolio menu. Keep
these rules true, run `npm run check:navigation` (static, included in every
build) and `npm run check:navigation:dom` (rendered Chrome checks) before
publishing homepage changes.

## Public index

- `/` renders `EditorialHomeConcept` directly. `/concept/` remains a no-index
  comparison URL, but it is not a second implementation.
- There is no site header. The opening identity cycles between “I’m Daniel” and
  “I’m Akibwa”, beside the sentence “Building in the age of AI.” The X,
  Instagram and email handles sit directly beneath that sentence; the hero no
  longer repeats Projects, Career and Taste Library as a menu. The identity and
  proposition use the phone measure rather than leaving an empty white tail.
- Projects has its own serif chapter heading, matching Career and Taste
  Library. Its stable card system keeps three equal cards in a single row on a
  wide screen, Features takes the first full tablet row above two equal cards,
  and phones use one full-width stack. Every card keeps its artwork above the
  same bottom caption rail; there are no narrow side captions. The Portuguese
  card uses a text-free conversation illustration; Trek uses a route-led
  topographic illustration drawn from the live atlas; and Features uses a
  bright, image-led version of the game's board language: one compact wordmark,
  the colour rule, an energetic five-colour weave, crossings, neurons and
  feature controls, with no explanatory copy in the art. The five feature
  stamps form a slim vertical rail against the right edge, balancing the
  wordmark without taking space from the puzzle.
- Project captions are slim bottom rails with one accent edge. Features uses
  a pale sea-glass rail with deep green type and frame; the other two use the
  page's warm paper so their artwork keeps the colour. All three use the same
  title and subtitle typography, running from the left and right ends without
  clipping.
  There is no separate arrow or wordy call to action: the whole rail takes on
  a subtle project-colour tint on hover, keyboard focus and touch press.
- Selecting a project replaces the portfolio rather than opening a card,
  overlay or nested scrolling frame. The destination is the real Features,
  Português com a Inês or Trek page with `?from=akibwa`; only that entry mode
  adds a compact version of the real homepage masthead: the Daniel/Akibwa
  identity keeps flicking, “Building in the age of AI.” keeps its serif face,
  and Home, Projects, Career and Taste Library remain available in their
  original type and colours. Its green rule spans the complete viewport.
  Everything below that rule belongs to the selected project and is sized to
  the viewport left beneath the masthead; fixed project menus must not slip
  behind it. Direct visits to any project remain standalone. Português com a
  Inês owns its banner in its own repository; Features owns its banner in the
  source game and republishes it here; Trek owns it in
  `scripts/trek-page-template.html` and regenerates the public page.
- Freelance is not a separate pitch in this section.
- The page is not text-selectable. Links, buttons and keyboard focus retain
  their normal interaction semantics.
- Images disable native touch callouts and dragging. On touch devices and
  narrow screens, artwork passes pointer targeting to its enclosing card or
  link so taps still work without exposing the mobile Save Image menu.
- The green rule below the opening, the rose Career rule and the blue Taste
  Library rule are the same 4px, full-viewport chapter divider. Their headings
  and content remain on the shared `page-grid`; only the rules bleed to the
  screen edges.

## Career

- Career is the original horizontal eight-stop index with Freelance first.
  Its short combined sentence identifies Butterfly Rose and Português com a
  Inês as client work.
- At rest it shows the eight company marks and their coloured timeline only;
  job dates do not compete with the marks. Hover or keyboard focus reveals the
  full range, job title and one short
  action-to-purpose sentence, with tools and sector language selectively
  bolded. Each logo card keeps a darker border and a quiet tinted-paper surface
  derived from its own timeline colour. Electrical uses a rounded plug-and-cable
  mark; Joinery uses an interlocking dovetail mark. These sentences are direct
  verb-led lines, not first-person copy.
- Focus is exclusive: after a role is clicked or reached by keyboard, hovering
  another mark cannot open a second detail over it. Moving focus switches the
  one open detail.
- The section closes shortly after the resting logo cards instead of reserving
  a permanently open synopsis row. It temporarily makes room for the one open
  detail so the next chapter stays unobscured. The same compact interaction
  and horizontal rhythm remain on phones.

## Taste and handles

- Taste reuses `HomePage` in `tasteOnly` mode: Graceland first, then Music,
  Films, Games, TV and Podcasts in one compact horizontal list.
- The list is a single row of small square covers with native horizontal
  overflow, scroll snapping and touch momentum. It swipes left and right on
  touch screens and keeps a subtle coloured scrollbar as its desktop cue. A
  category change returns the new list to its first item.
- Cards remain labelled visual objects, not false links. Hover or keyboard
  focus reveals title then creator; music adds Last.fm plays when available.
- The short filter row sizes itself to its words and sits directly above the
  rail; it must not inherit a card-height grid row or leave a blank shelf.
- Film, game and television tiles use their title-specific editorial scenes
  edge-to-edge at every scale. The consistent hover label carries title and
  creator, so commercial poster boxes, grey margins and text-heavy cover insets
  do not interrupt the wall. They must not regress to generic symbols or an
  undifferentiated wall of plain covers.
  The six plain filter words change the rail immediately and Escape returns to
  Highlights.
- The three shared handles live beneath “Building in the age of AI.” and are
  not repeated after Taste. They retain their established colours.

## Motion

- Motion is reserved for the identity cycle. Project links use an immediate,
  restrained caption-rail tint for feedback; they must not lift, tilt or add
  theatrical shadows to the project or taste wall.
- `prefers-reduced-motion: reduce` removes non-essential transitions while
  preserving the same information and focus states.

## Regression checks

- `scripts/check-navigation-contract.mjs` asserts that the editorial component
  owns `/`, that its hero copy and handles remain intact, and that Projects,
  Career and Taste retain the approved structure.
- `scripts/check-navigation-dom.mjs` verifies the rendered hierarchy, project
  links and restrained feedback, focus-revealed career detail, Taste filters,
  horizontal swipe/scroll behaviour, hero-handle containment, overflow and
  reduced motion.
