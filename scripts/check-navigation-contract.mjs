import { existsSync, readFileSync } from "node:fs";

/* Build-time contract for Akibwa's public boundary. The brand and its current
   projects are discoverable; personal identity, history and archives are not. */

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const css = read("app/globals.css");
const index = read("app/page.jsx");
const layout = read("app/layout.jsx");
const sitemap = read("app/sitemap.js");
const albums = read("app/albums/page.jsx");
const projectDetail = read("app/projects/[slug]/page.jsx");
const editorial = read("components/pages/editorial-home-concept.jsx");
const hero = read("components/hero-brand-name.jsx");
const footer = read("components/page-footer.jsx");
const features = read("public/features/index.html");
const trekTemplate = read("scripts/trek-page-template.html");
const trekPublished = read("public/trek/index.html");

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

requireText(
  index,
  'import { EditorialHomeConcept } from "@/components/pages/editorial-home-concept"',
  "the public index must render the editorial homepage"
);
requireText(index, "return <EditorialHomeConcept />", "the editorial homepage must own the root route");
requireText(index, "noimageindex: true", "the public index must opt out of image indexing");
requireText(index, '"max-snippet": 120', "the public index must limit search snippets");
requireText(layout, 'applicationName: "Akibwa"', "site metadata must be brand-led");

requireText(editorial, "<HeroBrandName />", "the visible masthead must use the shared Akibwa identity");
requireText(hero, ">Akibwa</span>", "the masthead must identify Akibwa");
forbidText(editorial, 'from "@/components/deck-data"', "the indexed homepage must not load the personal archive");
forbidText(editorial, 'from "@/components/pages/home-page"', "the indexed homepage must not load the retired personal wall");
requireText(editorial, "Building in the age of AI.", "the public proposition must remain concise");

requireText(editorial, '<h2 id="projects-title">Projects</h2>', "the public projects chapter must remain");
for (const title of ["features", "Português com a Inês", "The Trek"]) {
  requireText(editorial, `title: "${title}"`, `${title} must remain on the project index`);
}
requireText(editorial, 'href: "/trek/"', "the Trek card must open the privacy-reduced atlas");
requireText(editorial, 'id="capabilities"', "the public capability chapter must remain");
for (const label of ["Data", "Systems", "Delivery"]) {
  requireText(editorial, `label: "${label}"`, `${label} must remain in the capability chapter`);
}
forbidText(editorial, "concept-career", "the indexed homepage must not expose a career timeline");
forbidText(editorial, "Taste Library", "the indexed homepage must not expose the personal taste archive");

requireText(footer, 'aria-label="Email Akibwa"', "the homepage must retain a private-by-default contact action");
const personalEmail = ["da", "kibwa", "@", "gmail", ".com"].join("");
forbidText(footer, personalEmail, "the contact address must not be present in static HTML");
forbidText(footer, "instagram.com", "the indexed homepage must not link a personal Instagram account");
forbidText(footer, "x.com", "the indexed homepage must not link a personal X account");

for (const source of [albums, projectDetail]) {
  requireText(source, "index: false", "personal archive routes must be noindex");
  requireText(source, "follow: false", "personal archive routes must be nofollow");
  requireText(source, "noimageindex: true", "personal archive routes must opt out of image indexing");
}
requireText(sitemap, 'const routes = [{ path: "/", priority: 1 }]', "only the Akibwa index belongs in the sitemap");

requireRuleText(".concept-hero {", ["display: grid", "grid-template-columns"]);
requireRuleText(".concept-project-grid {", ["grid-template-columns: repeat(3, minmax(0, 1fr))"]);
requireRuleText(".concept-capabilities {", ["position: relative", "padding:"]);
requireRuleText(".concept-capability-list {", ["display: grid", "grid-template-columns: repeat(3, minmax(0, 1fr))"]);
requireRuleText(".concept-capability-list li {", ["border-top: 4px solid var(--capability-accent)", "min-height:"]);

if (existsSync(new URL("../public/life-map/index.html", import.meta.url))) {
  fail("the detailed Life in Maps page must not ship");
}

for (const [source, label] of [
  [trekTemplate, "the Trek source template"],
  [trekPublished, "the generated Trek page"]
]) {
  requireText(source, "noindex", `${label} must be excluded from search indexing`);
  requireText(source, "noimageindex", `${label} must opt out of image indexing`);
  forbidText(source, "data-akibwa-project", `${label} must remain standalone`);
  forbidText(source, "akibwa-project-banner", `${label} must not expose the portfolio identity`);
  requireText(source, "24 September to 28 November 2019", `${label} must retain the exact journey date range`);
}

requireText(features, '<p class="akibwa-project-banner__identity">Akibwa</p>', "Features project view must use only the Akibwa brand");
const retiredPersonalClass = ["name--", String.fromCharCode(100, 97, 110, 105, 101, 108)].join("");
forbidText(features, retiredPersonalClass, "Features project view must not carry a personal identity state");
requireText(features, "Building in the age of AI.", "Features must retain the Akibwa proposition");

console.log("Akibwa public-boundary contract passed.");
