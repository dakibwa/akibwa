import { readFileSync } from "node:fs";

/* The site retired its navigation: no header, no wordmark, no menu. What
   replaced each piece is what this contract now guards — the name flip in the
   headline carries the brand strip, the hero index of set names is the menu,
   and the footer is the one fixed route to contact. A regression on any of
   these quietly strands a visitor, which is exactly the class of bug this
   check exists to stop at build time. */

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/site-shell.jsx", import.meta.url), "utf8");
const hero = readFileSync(new URL("../components/hero-word-cycle.jsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../components/pages/home-page.jsx", import.meta.url), "utf8");
const footer = readFileSync(new URL("../components/page-footer.jsx", import.meta.url), "utf8");

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

/* The shell is just the page. Any header creeping back in should be a
   deliberate decision, not a drive-by. */
forbidText(shell, "site-header", "the header was retired — the hero carries the identity");
forbidText(shell, "nav-", "the menu was retired into the hero index");
forbidText(shell, "brand__", "the wordmark was retired into the hero name flip");

/* The name flip carries its accent underline on the visible name itself. */
requireText(hero, 'className="hero-name-value"', "the hero name flip must render its value span");
requireRuleText(".hero-name-value::after {", [
  "position: absolute",
  "background: rgba(var(--name-accent-rgb)"
]);

/* The menu is three words inside the hero sentence, and every rail's name
   is an opener. */
requireText(home, "hero-index-word", "the hero sentence must carry its bucket words");
requireText(home, "onClick={() => openBucket(bucket)}", "each bucket word must open its bucket");
requireText(home, "onClick={() => focusSet(set.id)}", "each rail name must open its set");

/* The footer is the one fixed route to contact — the contact row is gone. */
requireText(footer, 'href="mailto:', "the footer must keep an email route");
requireText(footer, 'href="https://x.com/', "the footer must keep the X route");
requireText(footer, 'href="https://www.instagram.com/', "the footer must keep the Instagram route");
requireText(home, "<PageFooter", "the home page must render the footer");

console.log("Navigation contract passed.");
