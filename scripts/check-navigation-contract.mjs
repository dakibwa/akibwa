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
forbidText(css, "clip-path: inset(0 100%", "desktop bars must use contained transforms, not clip-path");

requireRuleText(".brand__bar {", [
  "position: absolute",
  "right: 0",
  "left: 0",
  "height: 6px",
  "overflow: hidden",
  "contain: paint"
]);

requireRuleText(".nav-link__bar {", [
  "position: absolute",
  "right: 0",
  "left: 0",
  "height: 6px",
  "overflow: hidden",
  "contain: paint"
]);

requireRuleText(".nav-link__bar-art {", [
  "width: 100%",
  "height: 100%",
  "opacity: 1",
  "transition: filter var(--nav-label-out) ease-out"
]);

requireRuleText(".nav-link__bar::after {", [
  "content: \"\"",
  "inset: -1px",
  "background: var(--canvas)",
  "transform: translateX(0)",
  "var(--nav-ribbon-out)",
  "var(--nav-ribbon-ease-out)"
]);

requireRuleText(".nav-desktop .nav-link.active .nav-link__bar-art {", [
  "opacity: 1"
]);

requireRuleText(".nav-desktop .nav-link.active .nav-link__bar::after {", [
  "transform: translateX(102%)"
]);

for (const timing of [
  "--nav-label-in: 150ms",
  "--nav-label-out: 110ms",
  "--nav-ribbon-in: 190ms",
  "--nav-ribbon-out: 140ms"
]) {
  requireText(css, timing, `navigation motion must retain ${timing}`);
}

requireRuleText(".nav-mobile .nav-link__bar {", ["display: none"]);
requireRuleText(".nav-mobile .nav-link__mobile-art {", [
  "position: absolute",
  "display: block"
]);

console.log("Navigation animation contract passed.");
