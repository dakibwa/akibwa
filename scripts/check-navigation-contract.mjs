import { readFileSync } from "node:fs";

/* Build-time contract for Akibwa's deliberately small interface. The public
   index has no site header, modal viewer, card buttons, or general motion
   system. It is one fixed sentence with a single identity cycle, seven plain
   filters, a square visual wall, and one quiet footer. This check makes that
   restraint harder to accidentally undo. */

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/site-shell.jsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../components/pages/home-page.jsx", import.meta.url), "utf8");
const heroCycle = readFileSync(new URL("../components/hero-word-cycle.jsx", import.meta.url), "utf8");
const footer = readFileSync(new URL("../components/page-footer.jsx", import.meta.url), "utf8");

const fail = (message) => {
  throw new Error(`Navigation contract failed: ${message}`);
};

const requireText = (source, text, message) => {
  if (!source.includes(text)) fail(message);
};

const forbidText = (source, text, message) => {
  if (source.includes(text)) fail(message);
};

const rule = (selector) => {
  const start = css.indexOf(selector);
  if (start === -1) fail(`missing CSS rule ${selector}`);
  const end = css.indexOf("}", start);
  if (end === -1) fail(`unterminated CSS rule ${selector}`);
  return css.slice(start, end + 1);
};

const requireRuleText = (selector, declarations) => {
  const cssRule = rule(selector);
  for (const declaration of declarations) {
    requireText(cssRule, declaration, `${selector} must include ${declaration}`);
  }
};

/* The identity and menu live in the index, never in a separate header. */
forbidText(shell, "site-header", "the retired site header must stay retired");
requireText(
  home,
  "<HeroFlipName /> — this is what I’ve made, done and loved.",
  "the homepage must keep its fixed first-principles sentence and identity cycle"
);
forbidText(home, "HeroCycleWord", "the proposition must not cycle");
const nameCycleStart = heroCycle.indexOf("export function HeroFlipName()");
const nameCycleEnd = heroCycle.indexOf("export function HeroCycleWord", nameCycleStart);
if (nameCycleStart === -1 || nameCycleEnd === -1) fail("the Daniel/Akibwa cycle must exist");
const nameCycle = heroCycle.slice(nameCycleStart, nameCycleEnd);
requireText(nameCycle, "NAME_INITIAL_DELAY", "the name cycle must advance automatically");
requireText(nameCycle, "if (reducedMotion) return undefined", "the name cycle must respect reduced motion");
requireText(nameCycle, 'className="hero-name"', "the current name needs its stable visual slot");
forbidText(nameCycle, "<button", "the cycling name must remain display-only");
forbidText(nameCycle, "onClick", "the cycling name must not pretend to be a link");
forbidText(rule(".hero-name {"), "cursor:", "the cycling name must not carry a click cursor");
requireRuleText(".hero-name-stack {", ["display: inline-grid", "white-space: nowrap"]);

/* Seven plain words are the complete filter model. Projects owns both the
   shipped work and the former Life pieces; Everything is the explicit reset. */
requireText(home, 'const PROJECTS_LENS = ["sites", "life"]', "Projects must include Life");
requireText(home, '{ id: "everything", label: "Everything", lens: null', "Everything must be explicit");
requireText(home, '{ id: "projects", label: "Projects", lens: PROJECTS_LENS', "Projects must be one merged filter");
requireText(home, 'aria-pressed={activeId === set.id}', "filters must expose their selected state");
requireText(home, 'onClick={() => selectFilter(set)}', "each word must select its filter");
forbidText(home, "aria-expanded=", "plain filters must not pretend to open panels");
requireRuleText(".akibwa-home .deck-legend .rail-word {", [
  "font-size",
  "text-decoration-line: none"
]);
requireText(
  css,
  ".akibwa-home .deck-legend .rail-word.is-active {\n  text-decoration-line: underline",
  "the selected word must use a plain underline"
);

/* Cards are visual objects unless they genuinely go somewhere. Linked cards
   are anchors, not buttons that first open another layer. */
requireText(home, "if (href) {", "Card must branch only when it has a destination");
requireText(home, "<a", "linked cards must render as anchors");
requireText(home, 'role="img" aria-label={label}', "passive cards must be labelled visual objects");
requireText(home, "href={site.href ?? undefined}", "project cards must keep their direct links");
requireText(home, "href={piece.href ?? undefined}", "Life Map and Trek cards must keep their direct links");
forbidText(home, "function Spotlight", "the modal viewer must stay removed");
forbidText(home, "card-back", "cards must not have backs");
forbidText(home, "card-sheen", "cards must not carry foil");
forbidText(home, "startViewTransition", "filtering must remain immediate");
forbidText(home, "translateZ", "cards must not tilt toward the visitor");
forbidText(home, 'size="grand"', "the wall must keep only standard and small cards");

/* The wall stays compact and square on every viewport. Link feedback is a
   quiet label reveal; touch keeps the label visible because hover is absent. */
requireRuleText(".akibwa-home .deck .card {", [
  "aspect-ratio: 1",
  "border-radius: 5px",
  "box-shadow: none",
  "transform: none"
]);
requireText(css, "--u: 44px", "the mobile wall must keep its compact unit");
requireRuleText(".akibwa-home .card-label {", [
  "opacity: 0",
  "transition: opacity 120ms ease"
]);
requireRuleText(".akibwa-home .card--link:hover .card-label,", ["opacity: 1"]);
requireRuleText(".akibwa-home .card--link .card-label {", ["opacity: 1"]);
requireText(
  css,
  ".akibwa-home .deck.is-lensed .card:not(.is-lit)",
  "filters must hide only non-matching cards"
);

/* The homepage is an object wall, not selectable prose. */
requireRuleText(".akibwa-home {", ["user-select: none", "-webkit-user-select: none"]);

/* The footer is one unadorned line: location plus the three real routes. */
requireText(footer, 'className="page-footer-line"', "the footer must be a single line");
requireText(footer, "<span>Manchester</span>", "the footer must keep the location");
requireText(footer, 'href="mailto:', "the footer must keep email");
requireText(footer, 'href="https://x.com/', "the footer must keep X");
requireText(footer, 'href="https://www.instagram.com/', "the footer must keep Instagram");
forbidText(footer, "lucide-react", "the footer must not bring back icon chrome");
forbidText(footer, "page-footer-signoff", "the footer must not bring back a signoff panel");
requireText(home, "<PageFooter", "the home page must render the footer");

console.log("Navigation contract passed.");
