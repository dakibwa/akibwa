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
  centred plain anchors: Projects, Career and Taste Library.
- Projects leads with two equal direct cards: Features and Português com a
  Inês. The Portuguese card uses a text-free conversation illustration so the
  service reads before its label does.
- A compact Freelance row follows the cards. It states the current offer, with
  Butterfly Rose retained only as a small client proof point.
- The page is not text-selectable. Links, buttons and keyboard focus retain
  their normal interaction semantics.

## Career

- Career is an eight-stop annotated timeline with Freelance first.
- Every stop visibly names the title, Dan's contribution and the firm's
  mission; no essential career context depends on hover or focus.
- At narrower widths, the copy stacks beneath the job identity while remaining
  aligned to the timeline track.

## Taste and footer

- Taste reuses `HomePage` in `tasteOnly` mode: Graceland first, then Music,
  Films, Games and TV in the compact square wall.
- Taste cards are labelled visual objects, not false links. The five plain
  filter words change the wall immediately and Escape returns to Everything.
- The shared footer remains visible after the wall, with “Fewer things done by
  hand.”, Manchester, X, Instagram and email in their established colours.

## Motion

- Motion is limited to short link feedback and the identity cycle. It must not
  lift, tilt or add theatrical shadows to the project or taste wall.
- `prefers-reduced-motion: reduce` removes non-essential transitions while
  preserving the same information and focus states.

## Regression checks

- `scripts/check-navigation-contract.mjs` asserts that the editorial component
  owns `/`, that its copy and direct links remain intact, and that Career, Taste
  and the footer retain the approved structure.
- `scripts/check-navigation-dom.mjs` verifies the rendered hierarchy, project
  links and restrained feedback, visible career detail, Taste filters, compact
  mobile card density, footer containment, overflow and reduced motion.
