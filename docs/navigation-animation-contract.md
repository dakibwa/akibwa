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
  plain anchors: Projects, Career and Taste Library. The anchors are centred
  below the proposition on wide screens, then share its left edge when the
  masthead stacks on mobile; the two headline rows use the phone measure rather
  than leaving an empty white tail.
- Projects is a descending three-card edit: Features first and largest,
  Português com a Inês second, and The Trek third. The Portuguese card uses a
  text-free conversation illustration; Trek uses a route-led topographic
  illustration drawn from the visual language of the live atlas.
- Freelance is not a separate pitch in this section.
- The page is not text-selectable. Links, buttons and keyboard focus retain
  their normal interaction semantics.

## Career

- Career is the original horizontal eight-stop index with Freelance first.
  Its short combined sentence identifies Butterfly Rose as a client.
- At rest it shows only dates and marks. Hover or keyboard focus reveals the
  job title and one short action-to-purpose sentence, with tools and sector
  language selectively bolded.
- The same compact interaction and horizontal rhythm remain on phones.

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
  links and restrained feedback, focus-revealed career detail, Taste filters,
  compact mobile card density, footer containment, overflow and reduced motion.
