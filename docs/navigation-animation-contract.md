# Homepage interaction contract

Akibwa is one editorial index rather than a conventional portfolio menu. Keep
these rules true, run `npm run check:navigation` (static, included in every
build) and `npm run check:navigation:dom` (rendered Chrome checks) before
publishing homepage changes.

## Public index

- `/` renders `EditorialHomeConcept` directly. `/concept/` remains a no-index
  comparison URL, but it is not a second implementation.
- There is no site header. The opening is the static identity “I’m Akibwa”, the
  sentence “Building in the age of AI.” and four plain anchors: Now, Work,
  Career and Taste.
- Features and both client projects are direct links. Nothing opens an
  intermediate card, drawer or modal.
- The page is not text-selectable. Links, buttons and keyboard focus retain
  their normal interaction semantics.

## Career

- Career is a seven-stop horizontal timeline wherever a supported viewport has
  room. Only the dates and company marks show at rest.
- Each stop is keyboard focusable. Hover or focus reveals the role and concise
  description in a popover; the same information remains in the stop's
  accessible label.
- The dot's largest halo is 24px across. Its dedicated middle lane must leave
  at least 6px between that halo and both the date above and logo card below,
  at desktop and phone widths.
- At 300px and below only, the timeline may use its vertical fallback.

## Taste and footer

- Taste reuses `HomePage` in `tasteOnly` mode: Graceland first, then Music,
  Films, Games and TV in the compact square wall.
- Taste cards are labelled visual objects, not false links. The five plain
  filter words change the wall immediately and Escape returns to Everything.
- The shared footer remains visible after the wall, with “Fewer things done by
  hand.”, Manchester, X, Instagram and email in their established colours.

## Motion

- Motion is limited to short link feedback and the career reveal. It must not
  lift, tilt or add theatrical shadows to the feature or taste wall.
- `prefers-reduced-motion: reduce` removes the client, link and career
  transitions while preserving the same information and focus states.

## Regression checks

- `scripts/check-navigation-contract.mjs` asserts that the editorial component
  owns `/`, that its copy and direct links remain intact, and that Career, Taste
  and the footer retain the approved structure.
- `scripts/check-navigation-dom.mjs` verifies the rendered hierarchy, direct
  link feedback, career focus/popovers and 6px halo clearances, Taste filters,
  compact mobile card density, footer containment, overflow and reduced motion.
