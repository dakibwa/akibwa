# Navigation animation contract

This is the source of truth for the shared Akibwa header. If the component is
changed, preserve these rules and run `npm run check:navigation` before visual
QA.

## Desktop

- The AKIBWA wordmark owns one permanent 6px artwork bar. Its clipping box is
  exactly the width of the wordmark.
- Every navigation label owns one 6px artwork bar. The bar's clipping box is
  exactly the width of that label's link; it must never use the width of the
  nav, header, viewport, or page.
- The artwork stays full-size inside that clipping box. A canvas-coloured
  curtain slides away to reveal it from left to right; the image itself must
  never squash or stretch during the animation.
- The curtain reveals in 190ms with a fast decelerating ease and covers again
  in 140ms. The label glow responds in 150ms and clears in 110ms. Do not route
  these timings back through the slower site-wide hover variables.
- The current route keeps its bar visible. Hover, press, keyboard focus, and an
  open Personal dropdown reveal the relevant bar. Leaving or resetting the
  interaction hides an inactive bar again.
- Do not animate these bars with `clip-path`, and do not position the artwork
  itself against the link. Those were the fragile parts of the retired build.

## Mobile

- Desktop overline elements are hidden.
- Mobile rows have a separate artwork element. It is allowed to bleed slightly
  around its own row for the masked background treatment, but it is never used
  as a desktop overline.
- The active row and keyboard focus may reveal the mobile artwork. A tap uses
  the row press colour; it must not replay the desktop ribbon animation.
- Mobile artwork transitions complete within 220ms.
- Menu close animation completes before route navigation, unless reduced motion
  is requested.

## Interaction lifecycle

- Pointer-only classes (`is-hovering`, `is-pressing`, `is-pointer-focus`) are
  cleared after a click, route change, menu close, window blur, pointer cancel,
  or visibility loss.
- The same link must animate correctly after repeated hover-click-back cycles.
- Reduced-motion mode removes transitions without changing which bars are
  visible.

## Visual acceptance checks

At a 1440px desktop viewport:

1. The header is 69px high (including its 1px border).
2. Each desktop bar is 6px high and its left/right edges match its own link to
   within 1px.
3. No artwork appears as a continuous strip across multiple labels or at the
   top edge of the viewport.
4. On `/personal`, only Personal is persistently visible; hovering each sibling
   reveals only that sibling's bar.
5. Repeat route navigation and hover checks at least twice.

At 760px and below:

1. Desktop navigation and desktop overlines are absent.
2. Opening and closing the menu is smooth, including when a row is tapped.
3. No shared footer is rendered on the mobile surface.
