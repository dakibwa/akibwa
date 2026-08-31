# Homepage interaction contract

Akibwa is one editorial index rather than a conventional portfolio menu. Keep
these rules true, run `npm run check:navigation` (static, included in every
build) and `npm run check:navigation:dom` (rendered Chrome checks) before
publishing homepage changes.

## Public index

- `/` renders `EditorialHomeConcept` directly. `/concept/` remains a no-index
  comparison URL, but it is not a second implementation.
- There is no site header. The opening identity cycles between “I’m Daniel” and
  “I’m Akibwa”, beside the sentence “Building in the age of AI.” and three
  plain anchors: Projects, Career and Taste Library. The anchors share the
  proposition's left edge on wide screens and when the masthead stacks on
  mobile; the two headline rows use the phone measure rather than leaving an
  empty white tail.
- Projects is one stable card system: three equal cards form a single row on a
  wide screen, Features takes the first full tablet row above two equal cards,
  and phones use one full-width stack. Every card keeps its artwork above the
  same bottom caption rail; there are no narrow side captions. The Portuguese
  card uses a text-free conversation illustration; Trek uses a route-led
  topographic illustration drawn from the live atlas; and Features uses a
  bright, image-led version of the game's own board language: one compact
  wordmark, the colour rule, live thread palette, crossings, nodes and feature
  controls, with no explanatory copy in the art.
- Project captions are slim bottom rails with one accent edge. Features keeps
  its compact dark rail; the other two use the page's warm paper so their
  artwork keeps the colour. All three use the same title and subtitle
  typography, running from the left and right ends without clipping.
  There is no separate arrow or wordy call to action: the whole rail takes on
  a subtle project-colour tint on hover, keyboard focus and touch press.
- Freelance is not a separate pitch in this section.
- The page is not text-selectable. Links, buttons and keyboard focus retain
  their normal interaction semantics.
- Images disable native touch callouts and dragging. On touch devices and
  narrow screens, artwork passes pointer targeting to its enclosing card or
  link so taps still work without exposing the mobile Save Image menu.

## Career

- Career is the original horizontal eight-stop index with Freelance first.
  Its short combined sentence identifies Butterfly Rose and Português com a
  Inês as client work.
- At rest it shows compact, single-line year ranges and marks. Hover or
  keyboard focus reveals the full range, job title and one short
  action-to-purpose sentence, with tools and sector language selectively
  bolded. Each logo card keeps a darker border derived from its own timeline
  colour. These sentences are direct verb-led lines, not first-person copy.
- Focus is exclusive: after a role is clicked or reached by keyboard, hovering
  another mark cannot open a second detail over it. Moving focus switches the
  one open detail.
- The same compact interaction and horizontal rhythm remain on phones.

## Taste and footer

- Taste reuses `HomePage` in `tasteOnly` mode: Graceland first, then Music,
  Films, Games and TV in the compact square wall.
- Taste cards are labelled visual objects, not false links. The five plain
  filter words change the wall immediately and Escape returns to Everything.
- The shared footer remains visible after the wall, with “Fewer things done by
  hand.”, Manchester, X, Instagram and email in their established colours.

## Motion

- Motion is reserved for the identity cycle. Project links use an immediate,
  restrained caption-rail tint for feedback; they must not lift, tilt or add
  theatrical shadows to the project or taste wall.
- `prefers-reduced-motion: reduce` removes non-essential transitions while
  preserving the same information and focus states.

## Regression checks

- `scripts/check-navigation-contract.mjs` asserts that the editorial component
  owns `/`, that its copy and direct links remain intact, and that Career, Taste
  and the footer retain the approved structure.
- `scripts/check-navigation-dom.mjs` verifies the rendered hierarchy, project
  links and restrained feedback, focus-revealed career detail, Taste filters,
  compact mobile card density, footer containment, overflow and reduced motion.
