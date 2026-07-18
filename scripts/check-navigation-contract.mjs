import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/site-shell.jsx", import.meta.url), "utf8");

const fail = (message) => {
  throw new Error(`Navigation contract failed: ${message}`);
};

const requireText = (source, text, message) => {
  if (!source.includes(text)) {
    fail(message);
  }
};

const forbidText = (source, text, message) => {
  if (source.includes(text)) {
    fail(message);
  }
};

const rule = (selector) => {
  const start = css.indexOf(selector);

  if (start === -1) {
    fail(`missing CSS rule ${selector}`);
  }

  const end = css.indexOf("}", start);

  if (end === -1) {
    fail(`unterminated CSS rule ${selector}`);
  }

  return css.slice(start, end + 1);
};

const requireRuleText = (selector, declarations) => {
  const cssRule = rule(selector);

  for (const declaration of declarations) {
    requireText(cssRule, declaration, `${selector} must include ${declaration}`);
  }
};

for (const className of [
  "brand__bar",
  "brand__bar-art",
  "brand__label",
  "nav-link__bar",
  "nav-link__bar-art",
  "nav-link__mobile-art",
  "nav-link__label"
]) {
  requireText(shell, `className="${className}"`, `site shell must render .${className}`);
}

forbidText(css, ".nav-link span {", "generic span rules can hide or detach navigation artwork");
forbidText(css, ".nav-link__art", "desktop and mobile artwork must not share the retired element");
forbidText(css, ".nav-link__bar::after", "the retired canvas-curtain overlay leaks artwork at the clipped corners");
forbidText(css, "clip-path: inset(0 100%", "desktop bars must not animate clip-path");

/* Bars reveal through native hover/focus and route state only. The JS pointer
   classes must never gate bar visibility, or a fast sweep can strand a bar. */
forbidText(css, ".is-hovering .nav-link__bar", "bar visibility must not depend on JS pointer classes");
forbidText(css, ".is-pressing .nav-link__bar", "bar visibility must not depend on JS pointer classes");

/* The mobile menu must close synchronously with navigation, not on a timer. */
forbidText(shell, "setTimeout", "mobile menu navigation must not be deferred by timers");

requireRuleText(".brand__bar {", [
  "position: absolute",
  "right: 0",
  "left: 0",
  "height: 6px",
  "overflow: hidden",
  "contain: paint"
]);

/* Hidden bars paint nothing at all: opacity 0 on the clipping box itself,
   with the artwork a plain static child. Anything that instead covers or
   partially fades the artwork will leak antialiased pixels at the corners. */
requireRuleText(".nav-link__bar {", [
  "position: absolute",
  "right: 0",
  "left: 0",
  "height: 6px",
  "overflow: hidden",
  "contain: paint",
  "opacity: 0",
  "var(--nav-ribbon-out)"
]);

requireRuleText(".nav-link__bar-art {", [
  "width: 100%",
  "height: 100%",
  "background-size: cover"
]);

requireRuleText(".nav-desktop .nav-link:focus-visible:not(.is-pointer-focus) .nav-link__bar,", [
  ".nav-desktop .nav-item.is-dropdown-open > .nav-link .nav-link__bar",
  ".nav-desktop .nav-link.active .nav-link__bar",
  "opacity: 1",
  "transition-duration: var(--nav-ribbon-in)"
]);

requireRuleText(".nav-desktop .nav-link:hover .nav-link__bar {", [
  "opacity: 1",
  "transition-duration: var(--nav-ribbon-in)"
]);
requireText(css, "@media (hover: hover)", "hover reveal must be scoped to hover-capable devices");

for (const timing of [
  "--nav-label-in: 150ms",
  "--nav-label-out: 110ms",
  "--nav-ribbon-in: 180ms",
  "--nav-ribbon-out: 140ms"
]) {
  requireText(css, timing, `navigation motion must retain ${timing}`);
}

/* Reduced motion zeroes the duration variables, which beats every reveal
   state on value rather than specificity. */
requireRuleText("  .nav-link {\n    --nav-label-in: 0ms", [
  "--nav-label-out: 0ms",
  "--nav-ribbon-in: 0ms",
  "--nav-ribbon-out: 0ms"
]);

requireRuleText(".nav-mobile .nav-link__bar {", ["display: none"]);
requireRuleText(".nav-mobile .nav-link__mobile-art {", [
  "position: absolute",
  "display: block"
]);

console.log("Navigation animation contract passed.");
