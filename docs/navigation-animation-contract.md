# Navigation animation contract

This describes the shared Akibwa header as built. If the header changes, keep
these rules true, run `npm run check:navigation` (static, runs inside every
build) and `npm run check:navigation:dom` (drives the built `out/` export in
headless Chrome with real input) before visual QA.

## Desktop state model

- The AKIBWA wordmark owns one permanent 6px artwork bar clipped to the
  wordmark's own width.
- Every navigation label owns one 6px artwork bar (`.nav-link__bar`), an
  absolutely positioned overline inside its own link. It can never escape the
  link's width; it must never be sized against the nav, header, viewport, or
  page.
- Visibility lives on the bar element itself: hidden is `opacity: 0` (plus a
  2px downward offset), visible is `opacity: 1`. A hidden bar paints nothing,
  so nothing can leak. The retired approach — full-size artwork behind a
  canvas-coloured curtain — could never hide cleanly: every antialiased edge
  pixel blends curtain over artwork at partial coverage, which left permanent
  artwork specks at the rounded corners of "hidden" bars.
- A bar is visible if and only if its link is the active route, natively
  hovered (`:hover`, scoped to `@media (hover: hover)`), keyboard-focused
  (`:focus-visible`), or its dropdown is open (`.is-dropdown-open`). The JS
  pointer classes (`is-hovering`, `is-pressing`) drive the label glow only and
  must never gate bar visibility — native hover cannot be stranded by fast
  sweeps, interrupted transitions, or missed pointer events.
- The artwork child is a static, full-size `background-size: cover` layer. It
  is never scaled, translated, or faded independently, so it cannot squash or
  stretch.
- Motion: reveal 180ms with a decelerating ease (`--nav-ribbon-in`), hide
  140ms ease-out (`--nav-ribbon-out`). Label glow: 150ms in, 110ms out. Do not
  route these through the slower site-wide hover variables.

## Mobile (760px and below)

- `.nav-desktop` is `display: none`; the desktop bars are additionally
  `display: none` inside the mobile menu. No desktop overline may ever render
  at mobile widths.
- Mobile rows use a separate masked artwork element (`.nav-link__mobile-art`)
  that may bleed around its own row. Active route and keyboard focus reveal
  it; taps use the row press colour.
- Tapping a row closes the menu and navigates in the same interaction — no
  deferred `setTimeout` navigation. The menu's collapse animates alongside the
  route change.
- The shared page footer is hidden at mobile widths.

## Reduced motion

- `prefers-reduced-motion: reduce` zeroes the four navigation duration
  variables (`--nav-label-in/out`, `--nav-ribbon-in/out`) on `.nav-link`.
  Because that wins on value rather than specificity, every reveal state
  becomes instant while the same bars stay visible.

## Regression checks

- `scripts/check-navigation-contract.mjs` (static): asserts the CSS/JSX shape
  above, and forbids the known-fragile patterns — the `::after` curtain,
  clip-path animation, pointer-class-gated bars, timer-deferred mobile
  navigation.
- `scripts/check-navigation-dom.mjs` (browser): builds nothing itself; against
  `out/` (or `CHECK_NAV_URL=<origin>` for a deployed site) it asserts, with
  real mouse/keyboard input: per-link bar containment (±1.5px) on every route
  at 1440px and 1024px, exactly-one-active state, hover reveal/hide including
  interrupted hovers, six rapid sweeps leaving no ghost bars or stranded
  classes, keyboard-focus reveal, click transitions with no gap, no bar boxes
  and no footer at 390px, immediate mobile-menu navigation, and zeroed
  durations under reduced motion.
