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
- Projects is one compact editorial block on wide screens: Features spans the
  left column while Português com a Inês and The Trek share its height as two
  horizontal panels on the right. Narrow screens return to one full-width
  stack. The Portuguese card uses a text-free conversation illustration; Trek
  uses a route-led topographic illustration drawn from the live atlas.
- Project captions are slim editorial rails with one accent edge. Features is
  anchored by a compact dark rail; the two narrow side captions use the page's
  warm paper so their artwork keeps the colour. Each card uses a static,
  unframed arrow mark rather than a button-like control, wordy call to action
  or moving-arrow effect.
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
  bolded. These sentences are direct verb-led lines, not first-person copy.
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

- Motion is reserved for the identity cycle. Project links use a static colour
  change for feedback; they must not move their arrows, lift, tilt or add
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
