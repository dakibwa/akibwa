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
const siteImage = readFileSync(new URL("../components/site-image.jsx", import.meta.url), "utf8");
const featuresPublished = readFileSync(new URL("../public/features/index.html", import.meta.url), "utf8");
const trekTemplate = readFileSync(new URL("./trek-page-template.html", import.meta.url), "utf8");
const trekPublished = readFileSync(new URL("../public/trek/index.html", import.meta.url), "utf8");
const electricalLogo = readFileSync(new URL("../public/brand-logos/electrical.svg", import.meta.url), "utf8");
const joineryLogo = readFileSync(new URL("../public/brand-logos/joinery.svg", import.meta.url), "utf8");
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
requireRuleText(".concept-nav {", ["display: flex", "flex-wrap: wrap", "justify-content: flex-start"]);
requireRuleText(".concept-hero {", ["display: grid", "grid-template-columns", "align-items: center"]);
requireRuleText(".concept-hero-copy {", ["min-width: 0"]);
requireText(
  css,
  "font-size: clamp(3rem, min(18vw, calc(147.5px - 16.62vw)), 4.75rem);",
  "the phone identity must use the available row"
);
requireRuleText(".concept-page {", ["user-select: none", "-webkit-user-select: none"]);
requireRuleText("img {", [
  "-webkit-touch-callout: none",
  "-webkit-user-drag: none",
  "-webkit-user-select: none",
  "user-select: none"
]);
requireText(
  css,
  "@media (hover: none), (max-width: 800px) {\n  picture,\n  img {\n    pointer-events: none;",
  "touch images must pass the hit target to their enclosing control"
);
requireText(
  siteImage,
  "draggable={draggable ?? false}",
  "shared images must opt out of native dragging by default"
);
requireText(
  siteImage,
  "versionedSrc(entry.variants[0].avif.src, entry.sourceHash)",
  "responsive artwork must use its source hash to invalidate stale browser caches"
);

/* Projects uses one card anatomy at every size: a wide three-card row, a
   two-row tablet composition, then one full-width phone stack. */
requireText(
  editorial,
  'href="/features/?from=akibwa"',
  "Features must enter the real game through Akibwa project view"
);
requireText(
  editorial,
  'src="/features/home-card-bright-v4.png"',
  "Features must use its bright, image-led board artwork"
);
if (!imageVariants["conceptProject:/features/home-card-bright-v4.png"]) {
  fail("the bright Features project artwork must have responsive variants");
}
forbidText(
  editorial,
  'src="/project-art/personal/features-neural-threads.png"',
  "the generic neural-thread artwork must not return to the homepage"
);
requireText(
  editorial,
  'href="https://portuguesewithines.com/?from=akibwa"',
  "Português com a Inês must enter its real site through Akibwa project view"
);
requireText(
  editorial,
  'src="/project-art/personal/portuguese-with-ines-conversation.png"',
  "Português com a Inês must keep its representative conversation artwork"
);
requireText(editorial, "Português com a Inês</strong>", "the Portuguese project must be visibly named");
requireText(editorial, "European Portuguese lessons", "the Portuguese project must explain what it is");
requireText(
  editorial,
  'href="/trek/?from=akibwa"',
  "The Trek must enter the real journey through Akibwa project view"
);
requireText(
  editorial,
  'src="/project-art/personal/trek-paris-sofia-project.png"',
  "The Trek must use its route-led generated artwork"
);
requireText(editorial, "The Trek</strong>", "The Trek must be visibly named");
requireText(editorial, "Paris → Sofia · 1,982 km", "The Trek must explain the journey succinctly");
if (!imageVariants["conceptProject:/project-art/personal/trek-paris-sofia-project.png"]) {
  fail("The Trek project artwork must have responsive variants");
}
forbidText(editorial, "concept-freelance", "Freelance must not render as a separate Projects row");
forbidText(css, ".concept-freelance", "the retired standalone Freelance row must not keep dead styling");
requireText(
  deckData,
  '"statement": "Built client websites for Butterfly Rose and Português com a Inês to support their businesses."',
  "Butterfly Rose and Português com a Inês must stay inside the Freelance career detail"
);
forbidText(editorial, "<ClientSitePreviews", "the retired equal-billing client preview grid must stay off the homepage");
forbidText(editorial, "Hair salon + booking", "Butterfly Rose must not be described as a booking project");
forbidText(editorial, "tailored booking system", "Butterfly Rose must not claim a booking system");
forbidText(editorial, "Talk about a project", "the retired project CTA must stay removed");
forbidText(editorial, "Also making", "the retired making strip must stay removed");
requireRuleText(".concept-project-grid {", [
  "display: grid",
  "grid-template-columns: repeat(3, minmax(0, 1fr))",
  "align-items: stretch"
]);
requireRuleText(".concept-project-card {", [
  "display: grid",
  "grid-template-rows: auto auto",
  "overflow: clip",
  "border: 1px solid"
]);
requireRuleText(".concept-project-foot {", [
  "min-height: 50px",
  "background: var(--project-card-panel)",
  "box-shadow: inset 0 3px 0 var(--project-card-accent)",
  "transition: none"
]);
requireRuleText(".concept-project-label {", [
  "width: 100%",
  "grid-template-columns: minmax(0, max-content) minmax(0, 1fr)",
  "align-items: baseline"
]);
requireRuleText(".concept-project-label > span {", ["justify-self: end", "text-align: right"]);
requireRuleText(".concept-project-card:hover .concept-project-foot,", [
  "var(--project-card-accent) 18%",
  "var(--project-card-panel)"
]);
forbidText(
  rule(".concept-project-card:hover .concept-project-foot,"),
  "background: var(--project-card-accent)",
  "project hover must remain a subtle tint rather than a full colour flood"
);
requireText(
  css,
  ".concept-project-card:active .concept-project-foot",
  "touch press must colour the project caption rail"
);
forbidText(editorial, "concept-arrow", "project links must not show a separate arrow control");
forbidText(css, ".concept-arrow", "the retired project arrow styling must stay removed");
forbidText(editorial, "iframe", "project selection must not create a nested browsing frame");
for (const [source, label] of [
  [featuresPublished, "the published Features page"],
  [trekTemplate, "the Trek source template"],
  [trekPublished, "the generated Trek page"]
]) {
  requireText(source, "data-akibwa-project", `${label} must support conditional project view`);
  requireText(source, "akibwa-project-banner__name--daniel", `${label} must retain Daniel in the identity flick`);
  requireText(source, "akibwa-project-banner__name--akibwa", `${label} must retain Akibwa in the identity flick`);
  requireText(source, "@keyframes akibwa-name-daniel", `${label} must retain the homepage identity rhythm`);
  requireText(source, "Building in the age of AI.", `${label} must retain the exact Akibwa proposition`);
  requireText(source, "position:sticky;top:0", `${label} must keep the Akibwa banner pinned`);
  forbidText(source, ".akibwa-project-banner__lede{display:none}", `${label} must keep the proposition visible in short landscape layouts`);
  requireText(source, ".akibwa-project-banner::after", `${label} must keep the full-width boundary rule`);
  requireText(source, "height:4px", `${label} must keep the homepage rule weight`);
  for (const [href, text] of [
    ["https://akibwa.com/", "Home"],
    ["https://akibwa.com/#projects", "Projects"],
    ["https://akibwa.com/#career", "Career"],
    ["https://akibwa.com/#taste", "Taste Library"]
  ]) {
    requireText(source, `href="${href}">${text}</a>`, `${label} must provide the ${text} route`);
  }
  forbidText(source, "Back to projects", `${label} must use the real homepage navigation instead of a one-off back control`);
}
requireText(
  featuresPublished,
  "html[data-akibwa-project=\"true\"] .veil{\n    top:var(--akibwa-project-banner-height)",
  "Features overlays must begin below the Akibwa masthead"
);
requireText(
  featuresPublished,
  "max-height:calc(100dvh - var(--akibwa-project-banner-height)",
  "Features overlays must fit inside the remaining project viewport"
);
forbidText(editorial, "play today ↗", "the oversized Features CTA must stay removed");
forbidText(editorial, "visit site ↗", "the oversized Portuguese CTA must stay removed");
forbidText(editorial, "explore ↗", "the oversized Trek CTA must stay removed");
requireRuleText(".concept-feature {", [
  "--project-card-panel: #e2ece7",
  "--project-card-ink: #163e36",
  "--project-card-muted: #4d7067",
  "border-color: #205b4f"
]);
requireRuleText(".concept-trek {", ["--project-card-accent: #d96b32", "--project-card-panel: #f2efe7"]);
requireText(
  css,
  "@media (max-width: 1050px)",
  "the project cards must keep their tablet composition breakpoint"
);
requireText(
  css,
  ".concept-feature {\n    grid-column: 1 / -1;",
  "Features must take the full first tablet row"
);
forbidText(
  css,
  ".concept-project-grid {\n    grid-template-rows: repeat(2, minmax(0, 1fr))",
  "the fragile wide two-row project matrix must stay removed"
);
forbidText(css, "box-shadow: inset 3px 0 0 var(--project-card-accent)", "project captions must not return to narrow side rails");

/* Career keeps the approved horizontal eight-stop index. The title and one
   action-to-purpose sentence remain available through hover and keyboard focus. */
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
requireText(editorial, "tabIndex={0}", "career stops must be keyboard focusable");
requireText(editorial, 'className="concept-career-popover" aria-hidden="true"', "career detail must stay hidden at rest");
requireText(editorial, "{job.role}", "each popover must print the job title");
requireText(editorial, 'className="concept-career-statement"', "each popover must hold one combined sentence");
requireText(editorial, "{job.role} · {job.span}", "the open detail must keep the full date range");
forbidText(editorial, "compactCareerSpan", "career dates must not return to the resting index");
forbidText(editorial, 'className="concept-career-time"', "career dates must remain inside the hover and focus synopsis");
requireText(
  editorial,
  "<CareerStatement statement={job.statement} emphasis={job.emphasis} />",
  "each combined sentence must render its selected emphasis"
);
forbidText(editorial, "concept-career-label", "the retired What I did and Mission labels must stay removed");
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
for (const statement of [
  "Built client websites for Butterfly Rose and Português com a Inês to support their businesses.",
  "Built the Microsoft Fabric data platform to support UK growth and clean energy.",
  "Led the BI team and improved its data tools to help more people own a home.",
  "Assisted with electrical testing and warehouse fit-outs to keep commercial sites safe and ready.",
  "Built Power BI reports to analyse safer gambling and make betting and gaming safer.",
  "Assisted with joinery to build and fit homes well.",
  "Built cost and NPV models in SQL to make banking more accessible.",
  "Built default and cure models to support credit-risk decisions."
]) {
  requireText(deckData, `"statement": "${statement}"`, `career statement must stay literal and short: ${statement}`);
}
for (const emphasis of [
  '["client websites", "Butterfly Rose", "Português com a Inês", "support their businesses"]',
  '["Microsoft Fabric", "UK growth and clean energy"]',
  '["BI team", "data tools", "own a home"]',
  '["electrical testing", "warehouse fit-outs"]',
  '["Power BI", "safer gambling", "betting and gaming safer"]',
  '["joinery", "build and fit homes well"]',
  '["cost and NPV models", "SQL", "banking more accessible"]',
  '["default and cure models", "credit-risk decisions"]'
]) {
  requireText(deckData, `"emphasis": ${emphasis}`, `career emphasis must stay deliberate: ${emphasis}`);
}
forbidText(deckData, '"back":', "career data must not keep a separate action field");
forbidText(deckData, '"mission":', "career data must not keep a separate mission field");
forbidText(deckData, '"statement": "I ', "career statements must stay direct and verb-led");
requireRuleText(".concept-career-statement strong {", ["font-weight: 700", "font-family: inherit"]);
requireRuleText(".concept-career-stop {", ["grid-template-rows: 36px 68px"]);
forbidText(css, ".concept-career-time {", "retired resting career-date styling must stay removed");
requireRuleText(".concept-career-node {", ["width: 10px", "height: 10px"]);
requireRuleText(
  ".concept-career-card {",
  [
    "border: 1px solid color-mix(in srgb, var(--company-accent) 68%, var(--ink))",
    "background: color-mix(in srgb, var(--company-accent) 11%, var(--career-card-paper))"
  ]
);
requireRuleText(
  ".concept-career-stop:hover .concept-career-card,",
  [
    "border-color: color-mix(in srgb, var(--company-accent) 82%, var(--ink))",
    "background: color-mix(in srgb, var(--company-accent) 17%, var(--career-card-paper))"
  ]
);
requireText(electricalLogo, 'viewBox="0 0 64 64"', "Electrical must use the refined full-size vector mark");
requireText(electricalLogo, "stroke-linecap=\"round\"", "Electrical must keep its rounded cable geometry");
requireText(electricalLogo, "M17 20h30v4", "Electrical must keep the custom plug-and-cable silhouette");
requireText(joineryLogo, 'viewBox="0 0 64 64"', "Joinery must use the refined full-size vector mark");
requireText(joineryLogo, "M5 13h32L24 32l13 19H5Z", "Joinery must keep the custom dovetail joint");
requireText(
  css,
  "0 0 0 7px color-mix(in srgb, var(--company-accent) 18%, transparent)",
  "career focus must keep the restrained dot halo"
);
requireText(
  css,
  ".concept-career-timeline:focus-within",
  "a focused career role must lock out competing hover detail"
);
requireText(css, "grid-template-rows: 36px 56px", "mobile career dots must keep their clearance lane");
requireRuleText(
  ".concept-hero::after,",
  ["left: 50%", "width: 100vw", "height: 4px", "transform: translateX(-50%)"],
  "the editorial chapter rules must span the full viewport"
);
requireRuleText(".concept-hero::after {", ["background: var(--concept-work)"]);
requireRuleText(".concept-career-section::before {", ["background: var(--concept-career)"]);
requireText(
  css,
  ".concept-archive::before {\n  top: 0;\n  background: var(--concept-archive)",
  "Taste must keep its blue full-width chapter rule"
);
forbidText(css, "border-top: 4px solid var(--concept-career)", "Career must not keep a shorter page-grid border");
forbidText(css, "border-top: 4px solid var(--black)", "Taste must not keep the retired black rule");

/* Taste opens on a mixed-scale quilt, then exposes the complete archive one
   medium at a time. */
requireText(editorial, "<HomePage tasteOnly />", "Taste must render the categorised compact archive");
requireText(home, "if (tasteOnly)", "the wall must keep its taste-only mode");
requireText(home, "? gracelandCard : null", "Graceland must lead the taste wall");
requireText(
  home,
  '["everything", "music", "films", "games", "tv"].includes(item.id)',
  "Taste must keep Highlights, Music, Films, Games and TV"
);
requireText(home, 'id: "podcasts", label: "Podcasts"', "Taste must expose the podcast shelf");
requireText(home, 'label: "Highlights"', "Taste must open on a concise Highlights edit");
requireText(home, "const TASTE_HIGHLIGHTS_PER_SECTION = 10", "each medium must contribute ten opening highlights");
requireText(home, "function ResponsiveTasteQuilt", "Taste must rebuild its quilt with the available width");
requireText(home, "quiltBlockCounts(cards.length", "Taste must pack every card into complete two-by-two blocks");
requireText(home, "cloneElement(card, { quiltScale:", "Taste must assign card scale from its packed position");
requireText(home, "function TasteVisual", "film, game and TV cards must keep an art-directed visual treatment");
requireText(home, 'slot="tasteArt"', "film, game and TV cards must use responsive editorial artwork at every scale");
forbidText(home, "taste-visual__original", "Taste cards must not put inset poster covers over the artwork");
requireText(home, 'className="card-info"', "Taste cards must expose title and creator detail");
requireText(home, "plays on Last.fm", "music detail must include a Last.fm count when one exists");
requireRuleText(".akibwa-home .deck .card {", [
  "aspect-ratio: 1",
  "border-radius: 5px",
  "box-shadow: none",
  "transform: none"
]);
requireRuleText(".akibwa-home--taste .deck .c-art {", ["saturate(1.08)", "contrast(1.02)"]);
requireRuleText(".akibwa-home--taste .taste-quilt-band {", [
  "repeat(var(--taste-block-count), minmax(0, 1fr))",
  "width: 100%"
]);
requireRuleText(".akibwa-home--taste .taste-quilt-block {", [
  "repeat(2, minmax(0, 1fr))",
  "aspect-ratio: 1"
]);
requireRuleText(".akibwa-home--taste .taste-quilt-block--hero .card {", ["grid-area: 1 / 1 / 3 / 3"]);
requireRuleText(".akibwa-home--taste .taste-visual__scene,", [
  "position: absolute",
  "inset: 0",
  "width: 100%",
  "height: 100%"
]);
requireRuleText(".akibwa-home--taste .taste-visual .c-art {", ["position: absolute", "inset: 0", "object-fit: cover"]);

for (const title of [
  "Making Sense",
  "Huberman Lab",
  "Dwarkesh Podcast",
  "Lex Fridman Podcast",
  "All-In Podcast",
  "Within Reason",
  "Moonshots"
]) {
  requireText(deckData, `title: "${title}"`, `${title} must remain in the podcast shelf`);
}

for (const source of [
  "/features/home-card-bright-v4.png",
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
  "deckTile:/tv-posters/",
  "deckTile:/podcast-covers/"
]) {
  const entries = Object.entries(imageVariants).filter(([key]) => key.startsWith(prefix));
  if (!entries.length) fail(`${prefix} must remain bound to the responsive artwork ladder`);
  if (entries.some(([, value]) => Math.max(...value.variants.map((entry) => entry.width)) < 264)) {
    fail(`${prefix} artwork must keep a 264px Retina tile`);
  }
}

const tasteArtEntries = Object.entries(imageVariants).filter(([key]) => key.startsWith("tasteArt:/taste-art/"));
if (tasteArtEntries.length !== 83) fail(`Taste must keep all 83 art-directed film, game and TV scenes [${tasteArtEntries.length}]`);
if (tasteArtEntries.some(([, value]) => Math.max(...value.variants.map((entry) => entry.width)) < 600)) {
  fail("art-directed Taste scenes must keep a 600px-or-larger responsive rung");
}

/* The shared footer is only the three colour-coded handles. */
requireText(footer, 'className="page-footer-panel"', "the footer must keep its panel");
forbidText(footer, "Fewer things done by hand.", "the retired footer sign-off must stay removed");
forbidText(footer, "Manchester", "the footer must not add location copy back beside the handles");
requireText(footer, 'href="mailto:', "the footer must keep email");
requireText(footer, 'href="https://x.com/', "the footer must keep X");
requireText(footer, 'href="https://www.instagram.com/', "the footer must keep Instagram");
requireText(footer, '"--handle-accent": "#0f1114"', "X must keep its dark accent");
requireText(footer, '"--handle-accent": "#d63a7a"', "Instagram must keep its pink accent");
requireText(footer, '"--handle-accent": "#2f88ff"', "email must keep its blue accent");
requireText(home, "<PageFooter", "the taste wall must finish with the shared footer");

console.log("Navigation contract passed.");
