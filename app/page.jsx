import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MusicRoom } from "@/components/paper/music-room";
import { pageTitle, pageDescription } from "@/lib/site-metadata.mjs";

/*
 * The shelf shows itself as soon as the HTML arrives (Dan, 25 November 2026:
 * "load times immediate"). This runs straight after the shelf's markup, long
 * before the shelf's own code has loaded: it sizes every sleeve with the same
 * rows the shelf will use (shelf-rows.mjs, carried here as text), brings in
 * the artwork of the first screen, and lifts that screen in once the type has
 * arrived. The shelf then takes over the same rows without anything moving,
 * and leaves the opening to this (window.__shelfOpening). If any of it fails
 * the shelf waits for its own code, as it used to.
 */
const rowsSource = readFileSync(join(process.cwd(), "components/paper/shelf-rows.mjs"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/^export /gm, "")
  .replace(/\n\s*\n/g, "\n");

const early = `(function(){
try {
${rowsSource}
  var page = document.documentElement;
  var frame = document.querySelector(".music-map-frame");
  var map = frame && frame.querySelector('.music-map[data-measured="false"]');
  var width = frame ? Math.floor(frame.getBoundingClientRect().width) : 0;
  if (!map || !(width > 0) || !Element.prototype.animate) return;
  var tiles = map.querySelectorAll(".music-tile");
  var shares = [];
  for (var i = 0; i < tiles.length; i += 1) shares.push(parseFloat(tiles[i].style.getPropertyValue("--share")) || 0);
  var rows = packRows(shares, width);
  // The rows start under the shelf's heading.
  var top = (map.querySelector(".music-shelf") || frame).getBoundingClientRect().top;
  var first = [];
  var at = 0;
  for (var r = 0; r < rows.length; r += 1) {
    var side = rows[r][1];
    // One row past the screen has its artwork ready for the first scroll.
    var near = top + side > 0 && top < innerHeight + side + GAP;
    var shown = top + side > 0 && top < innerHeight;
    for (var end = at + rows[r][0]; at < end; at += 1) {
      var tile = tiles[at];
      tile.style.setProperty("--early", side);
      if (!near) continue;
      var face = tile.firstElementChild;
      var held = face.firstElementChild;
      if (held && held.tagName === "NOSCRIPT") face.innerHTML = held.textContent;
      var sized = face.querySelectorAll("[sizes]");
      for (var s = 0; s < sized.length; s += 1) sized[s].sizes = Math.ceil(side) + "px";
      if (shown) first.push(face);
    }
    top += side + GAP;
  }
  window.__shelfOpening = true;
  page.classList.add("laid");
  var open = function () {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (var n = 0; n < first.length; n += 1) {
      first[n].animate(
        [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
        { duration: 620, delay: Math.min(n * 16, 520), easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }
      );
    }
  };
  if (page.classList.contains("ready")) open();
  else addEventListener("paperready", open, { once: true });
} catch (error) {}
})()`;

export const metadata = {
  title: { absolute: pageTitle },
  alternates: { canonical: "/" },
  description: pageDescription,
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
      "max-video-preview": 0,
      "max-image-preview": "none",
      "max-snippet": 120,
    },
  },
};

// What a search engine calls the site: its short name, over the page's own
// title, as a link preview has them (Dan, 26 November 2026: "and also unify
// how it appears on google search too").
const site = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Akibwa",
  alternateName: pageTitle,
  url: "https://akibwa.com/"
};

// Akibwa is one page: the music shelf (Dan, 16 November 2026). Everything
// here runs once, during the static export.
export default function IndexPage() {
  return (
    <div className="music-page">
      <h1 className="visually-hidden">{pageTitle}</h1>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(site) }} />
      <MusicRoom active />
      <script dangerouslySetInnerHTML={{ __html: early }} />
    </div>
  );
}
