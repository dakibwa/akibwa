import { readFileSync } from "node:fs";

/* Build-time contract for Akibwa's public editorial index. The homepage is a
   short introduction to current work and career, followed by the complete
   taste wall. Its navigation is three plain anchor links. */

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../app/page.jsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/site-shell.jsx", import.meta.url), "utf8");
const editorial = readFileSync(
  new URL("../components/pages/editorial-home-concept.jsx", import.meta.url),
  "utf8"
);
const deckData = readFileSync(new URL("../components/deck-data.js", import.meta.url), "utf8");
const home = readFileSync(new URL("../components/pages/home-page.jsx", import.meta.url), "utf8");
const heroCycle = readFileSync(new URL("../components/hero-word-cycle.jsx", import.meta.url), "utf8");
const footer = readFileSync(new URL("../components/page-footer.jsx", import.meta.url), "utf8");
const imageVariants = JSON.parse(
  readFileSync(new URL("../components/image-variants.json", import.meta.url), "utf8")
);
const albumArtManifest = JSON.parse(
  readFileSync(new URL("../data/album-art-manifest.json", import.meta.url), "utf8")
);

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

/* The approved editorial route is the public index, with no separate header. */
requireText(
  index,
  'import { EditorialHomeConcept } from "@/components/pages/editorial-home-concept"',
  "the public index must render the editorial homepage"
);
requireText(index, "return <EditorialHomeConcept />", "the editorial homepage must own the root route");
forbidText(index, "<HomePage", "the retired all-in-one wall must not return as the root route");
forbidText(shell, "site-header", "the retired site header must stay retired");

/* Identity stays brief but keeps the original Daniel/Akibwa flick; navigation
   remains static and directly useful. */
requireText(
  editorial,
  'import { HeroFlipName } from "@/components/hero-word-cycle"',
  "the editorial homepage must use the shared identity cycle"
);
requireText(editorial, "<HeroFlipName />", "the visible masthead must render the identity cycle");
requireText(heroCycle, '{ label: "Daniel"', "the identity cycle must include Daniel");
requireText(heroCycle, '{ label: "Akibwa"', "the identity cycle must include Akibwa");
forbidText(
  css,
  ".concept-identity .hero-name-value {\n  animation: none;",
  "the editorial masthead must not disable the identity flick"
);
requireText(editorial, "Building in the age of AI.", "the approved one-line proposition must remain");
requireText(editorial, '<div className="concept-hero-copy">', "the proposition and menu must share the right-hand hero column");
for (const [href, label] of [
  ["#projects", "Projects"],
  ["#career", "Career"],
  ["#taste", "Taste Library"]
]) {
  requireText(editorial, `<a href="${href}">${label}</a>`, `${label} must remain a plain anchor link`);
}
requireRuleText(".concept-nav {", ["display: flex", "flex-wrap: wrap", "justify-content: center"]);
requireRuleText(".concept-hero {", ["display: grid", "grid-template-columns", "align-items: center"]);
requireRuleText(".concept-hero-copy {", ["min-width: 0"]);
requireRuleText(".concept-page {", ["user-select: none", "-webkit-user-select: none"]);

/* The Projects lead is a deliberate pair: Dan's own game and the client project
   he is proud to feature. Butterfly Rose stays a small proof point in the
   freelance offer rather than taking equal visual billing. */
requireText(editorial, 'href="/features/"', "Features must link directly to the game");
requireText(
  editorial,
  'src="/features/features-game-light-og-1200x630.png"',
  "Features must keep the approved light artwork"
);
requireText(editorial, 'href="/portugal/"', "Português com a Inês must be the second direct project link");
requireText(
  editorial,
  'src="/project-art/personal/portuguese-with-ines-conversation.png"',
  "Português com a Inês must keep its representative conversation artwork"
);
requireText(editorial, "Português com a Inês</strong>", "the Portuguese project must be visibly named");
requireText(editorial, "European Portuguese lessons", "the Portuguese project must explain what it is");
requireText(editorial, "{freelance.back}", "the current freelance offer must be visible in Projects");
requireText(editorial, "Client work includes", "client proof must stay explicit but secondary");
requireText(editorial, "Butterfly Rose</strong>", "Butterfly Rose must remain a small client proof point");
forbidText(editorial, "<ClientSitePreviews", "the retired equal-billing client preview grid must stay off the homepage");
forbidText(editorial, "Hair salon + booking", "Butterfly Rose must not be described as a booking project");
forbidText(editorial, "tailored booking system", "Butterfly Rose must not claim a booking system");
forbidText(editorial, "Talk about a project", "the retired project CTA must stay removed");
forbidText(editorial, "Also making", "the retired making strip must stay removed");
requireRuleText(".concept-project-grid {", ["display: grid", "repeat(2, minmax(0, 1fr))"]);
requireRuleText(".concept-project-card {", ["display: block", "overflow: clip", "border: 1px solid"]);
requireRuleText(".concept-freelance {", ["display: grid", "border-top: 1px solid"]);

/* Career is an eight-stop editorial timeline. Every stop keeps the role,
   Dan's contribution and the organisation's mission visible at rest. */
for (const name of [
  "Freelance",
  "National Wealth Fund",
  "Leeds Building Society",
  "Electrical Work",
  "Sky Betting & Gaming",
  "Joinery Work",
  "Vanquis Bank",
  "Lloyds Banking Group"
]) {
  requireText(editorial, `"${name}"`, `${name} must remain in the career sequence`);
}
requireText(editorial, 'className="concept-career-label">What I did', "each career stop must label Dan's contribution");
requireText(editorial, 'className="concept-career-label">Mission', "each career stop must label the organisation's mission");
requireText(editorial, "{job.role}", "each career stop must print the job title");
requireText(editorial, "{job.back}", "each career stop must print Dan's contribution");
requireText(editorial, "{job.mission}", "each career stop must print the organisation's mission");
requireText(deckData, '"logo": "/favicon.svg"', "Freelance must use the Akibwa favicon mark");
requireText(editorial, 'job.logo === "/favicon.svg" ? " is-akibwa"', "the Akibwa mark must keep its own full-frame treatment");
requireRuleText(".concept-career-logo.is-akibwa img {", ["width: 100%", "height: 100%"]);
requireRuleText(".concept-career-logo.is-akibwa {", ["border: 0"]);
requireText(editorial, 'job.logo === "/brand-logos/national-wealth-fund-icon.png" ? " is-nwf"', "the NWF mark must keep its optical-alignment treatment");
requireRuleText(".concept-career-logo.is-nwf img {", ["transform: translate(-5%, -14%)"]);
requireRuleText(".concept-career-logo picture {", ["display: grid", "place-items: center", "line-height: 0"]);
requireRuleText(".concept-career-logo picture source {", ["display: none"]);
requireText(editorial, 'job.logo === "/brand-logos/lloyds-horse-icon.png" ? " is-lloyds"', "the Lloyds horse must keep its optical-alignment treatment");
requireRuleText(".concept-career-logo.is-lloyds img {", ["transform: translate(6%, 2.5%)"]);
forbidText(editorial, "concept-career-freelance-mark", "the temporary Freelance lettermark must stay removed");
requireText(deckData, "electrical work with my brother", "Electrical Work must remain the period with Dan's brother");
requireText(deckData, "Joinery with my dad", "Joinery Work must remain the period with Dan's dad");
forbidText(deckData, "my dad and my brother", "the two family-work periods must not be conflated");
requireRuleText(".concept-career-stop {", ["grid-template-columns", "border-top"]);
requireRuleText(".concept-career-node {", ["width: 10px", "height: 10px"]);
requireRuleText(".concept-career-copy {", ["display: grid"]);
requireText(css, "grid-column: 3 / -1", "narrow career copy must stay aligned with the job identity");

/* Taste opens on a balanced edit, then exposes the complete archive one
   medium at a time. */
requireText(editorial, "<HomePage tasteOnly />", "Taste must render the categorised compact archive");
requireText(home, "if (tasteOnly)", "the wall must keep its taste-only mode");
requireText(home, "{gracelandCard}", "Graceland must lead the taste wall");
requireText(
  home,
  '["everything", "music", "films", "games", "tv"].includes(item.id)',
  "Taste must expose only Highlights, Music, Films, Games and TV"
);
requireText(home, 'label: "Highlights"', "Taste must open on a concise Highlights edit");
requireText(home, "const TASTE_HIGHLIGHTS_PER_SECTION = 10", "each medium must contribute ten opening highlights");
requireRuleText(".akibwa-home .deck .card {", [
  "aspect-ratio: 1",
  "border-radius: 5px",
  "box-shadow: none",
  "transform: none"
]);
requireRuleText(".akibwa-home--taste .deck .c-art {", ["saturate(1.08)", "contrast(1.02)"]);

for (const source of [
  "/features/features-game-light-og-1200x630.png",
  "/project-art/personal/portuguese-with-ines-conversation.png"
]) {
  if (!imageVariants[`conceptProject:${source}`]) fail(`${source} must have a conceptProject image ladder`);
}

/* Taste artwork must resolve to real Retina-sized files rather than stretching
   the old 198px album rung or falling back to the full Graceland source. */
const wallRung = albumArtManifest.rungs.find((entry) => entry.name === "wall")?.width;
const cardRung = albumArtManifest.rungs.find((entry) => entry.name === "card")?.width;
if (wallRung < 264) fail("album wall artwork must keep its 264px Retina rung");
if (cardRung < 760) fail("opened album artwork must keep its 760px Retina rung");

const gracelandVariant = imageVariants["deckTile:/music-art/graceland.jpg"];
if (!gracelandVariant) fail("Graceland must use the clean digital cover through the deck tile ladder");
if (gracelandVariant.sourceWidth < 3000 || gracelandVariant.sourceHeight < 3000) {
  fail("Graceland must keep its 3000px digital master");
}
if (Math.max(...gracelandVariant.variants.map((entry) => entry.width)) < 264) {
  fail("Graceland must keep a 264px Taste tile");
}

for (const prefix of [
  "deckTile:/film-posters/",
  "deckTile:/game-covers/",
  "deckTile:/tv-posters/"
]) {
  const entries = Object.entries(imageVariants).filter(([key]) => key.startsWith(prefix));
  if (!entries.length) fail(`${prefix} must remain bound to the responsive artwork ladder`);
  if (entries.some(([, value]) => Math.max(...value.variants.map((entry) => entry.width)) < 264)) {
    fail(`${prefix} artwork must keep a 264px Retina tile`);
  }
}

/* The shared footer keeps the original sign-off and colour-coded routes. */
requireText(footer, 'className="page-footer-panel"', "the footer must keep its panel");
requireText(footer, "Fewer things done by hand.", "the footer must keep its original wording");
requireText(footer, "<span>Manchester</span>", "the footer must keep the location");
requireText(footer, 'href="mailto:', "the footer must keep email");
requireText(footer, 'href="https://x.com/', "the footer must keep X");
requireText(footer, 'href="https://www.instagram.com/', "the footer must keep Instagram");
requireText(footer, '"--handle-accent": "#c05212"', "Manchester must keep its orange accent");
requireText(footer, '"--handle-accent": "#d63a7a"', "Instagram must keep its pink accent");
requireText(footer, '"--handle-accent": "#2f88ff"', "email must keep its blue accent");
requireText(home, "<PageFooter", "the taste wall must finish with the shared footer");

console.log("Navigation contract passed.");
