import { readFileSync } from "node:fs";

/* The site retired its navigation: no header, no wordmark, no menu bar. What
   replaced each piece is what this contract now guards — the name flip in the
   headline carries the brand strip, the legend under the sentence is the menu,
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

const forbidRuleText = (selector, declarations) => {
  const cssRule = rule(selector);

  for (const declaration of declarations) {
    forbidText(cssRule, declaration, `${selector} must not include ${declaration}`);
  }
};

/* The shell is just the page. Any header creeping back in should be a
   deliberate decision, not a drive-by. */
forbidText(shell, "site-header", "the header was retired — the hero carries the identity");
forbidText(shell, "nav-", "the menu was retired into the legend");
forbidText(shell, "brand__", "the wordmark was retired into the hero name flip");

/* The name flip carries its accent underline on the visible name itself. */
requireText(hero, 'className="hero-name-value"', "the hero name flip must render its value span");
requireRuleText(".hero-name-value::after {", [
  "position: absolute",
  "background: rgba(var(--name-accent-rgb)"
]);

/* The legend under the sentence is the menu: six collection words, each
   opening its lens. The sentence keeps one cycling noun as a shortcut into
   three buckets — a door, not a flip. */
requireText(home, "deck-legend", "the homepage must keep the collection legend");
requireText(home, "rail-word", "legend words must use the rail-word control");
requireText(home, 'id: "projects", label: "Projects", lens: PROJECTS_LENS', "projects must own the merged projects and life lens");
requireText(home, 'const PROJECTS_LENS = ["sites", "life"]', "projects must include both project and life cards");
requireText(home, "onClick={() => focusSet(set)}", "each legend word must open its lens");
requireRuleText(".deck-hero {", ["display: flex", "flex-direction: column"]);
requireRuleText(".deck-legend {", ["display: flex", "flex-wrap: wrap", "gap: 0.28em 0.78em"]);
forbidRuleText(".deck-legend {", ["border:", "background:", "padding:", "box-shadow:"]);
requireRuleText(".deck-legend .rail-word {", ["display: block", "padding: 0", "line-height: 1.2"]);
forbidText(css, ".deck-legend .rail-word::after {", "the collection menu must remain plain words without decorative rules");
forbidText(css, '.deck-legend .rail-word[aria-expanded="true"] {', "the selected collection must not turn into a tab");
requireText(hero, "export function HeroCycleWord", "the hero sentence must cycle a single bucket word");
requireText(hero, "onClick={() => onActivate(current)}", "the cycling word must open a bucket rather than advance");
requireText(hero, "const visibleIndex = heldIndex >= 0 ? heldIndex : index", "the cycling word must hold the selected bucket");
requireText(home, "heldBucket={bucketIdForLens(lens)}", "the sentence must follow the selected menu lens");

/* Cards keep their small-object hover on a pointer, while opening one stays
   deliberately quieter: the whole spotlight dissolves in together rather
   than flying, blurring or pulling the wall backwards. On phones the wall
   uses smaller square units so more of the collection remains visible. */
requireText(home, 'el.style.setProperty("--art-x"', "card artwork must keep its pointer parallax");
requireText(home, 'el.style.setProperty("--art-y"', "card artwork must keep its pointer parallax");
requireText(css, "translate(var(--art-x, 0), var(--art-y, 0))", "card faces must render their pointer parallax");
requireText(css, "transform 440ms var(--ease-out)", "card faces must settle rather than snap");
requireText(css, "translateZ(18px) scale(1.012)", "hovered cards must lift toward the visitor");
requireRuleText(".spotlight-scrim {", ["background: rgba(250, 248, 243, 0.94)", "transition: opacity 160ms ease-out"]);
requireRuleText(".spotlight-figure {", ["opacity: 0", "transition: opacity 170ms ease-out"]);
forbidRuleText(".spotlight-caption {", ["filter:", "transform:", "transition:"]);
forbidText(css, ".deck.is-receded", "opening a card must not pull the wall backwards");
forbidText(home, "from: { x:", "the spotlight must not measure a flight path from the wall");
requireText(css, "--u: 44px", "the mobile wall must keep its smaller unit");
requireText(css, "aspect-ratio: 1", "mobile cards must preserve square artwork");

/* The homepage behaves as a wall of controls, not selectable prose. Only
   actual buttons and links should answer the pointer. */
requireRuleText(".akibwa-home {", ["user-select: none", "-webkit-user-select: none"]);
requireRuleText(".spotlight-caption,", ["user-select: none", "-webkit-touch-callout: none"]);
forbidText(footer, "signoffPointer", "non-clickable footer copy must not imitate a link");
forbidText(footer, "locationPointer", "the non-clickable location must not imitate a link");
requireText(css, ".hero-name:hover .hero-name-value", "the clickable headline name must answer hover");
requireText(css, ".page-footer a.is-hovering::after", "footer links must draw their hover register");

/* The footer is the one fixed route to contact — the contact row is gone. */
requireText(footer, 'href="mailto:', "the footer must keep an email route");
requireText(footer, 'href="https://x.com/', "the footer must keep the X route");
requireText(footer, 'href="https://www.instagram.com/', "the footer must keep the Instagram route");
requireText(home, "<PageFooter", "the home page must render the footer");

console.log("Navigation contract passed.");
