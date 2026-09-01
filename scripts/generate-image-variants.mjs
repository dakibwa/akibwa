/*
 * Responsive variants for the static export.
 *
 * `output: "export"` forces `images.unoptimized`, so `next/image` emits a plain
 * `<img>` with the original `src` and no `srcset` — every visitor downloads the
 * full-size original whatever their screen, and `object-fit: cover` then throws
 * away the pixels that do not fit. The home tiles were the worst case: a
 * 899x1198 portrait costing 437K to fill a 618x354 landscape slot, 57% of it
 * cropped off unseen.
 *
 * So each source is paired with the slot it actually renders into. Variants are
 * cropped to the slot's aspect ratio, laddered across the widths that slot takes
 * at real breakpoints, and capped at 1.5x DPR — the artwork is grain-heavy, and
 * grain hides the difference between 1.5x and 2x while costing 1.8x the bytes.
 * AVIF leads with WebP behind it; both are emitted for every rung.
 *
 * Variants are committed so the GitHub Pages build stays hermetic and needs no
 * image toolchain of its own.
 *
 *   node scripts/generate-image-variants.mjs           regenerate
 *   node scripts/generate-image-variants.mjs --check   verify against sources
 */
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { PRESS_VERSION, press } from "./press-curve.mjs";

const root = new URL("../", import.meta.url).pathname;
const publicDir = path.join(root, "public");
const variantDir = path.join(publicDir, "_img");
const manifestPath = path.join(root, "components", "image-variants.json");

const checkOnly = process.argv.includes("--check");

const DPR_CAP = 1.5;

/*
 * The card wall is a printed page, so its plates go through the press — see
 * press-curve.mjs for what that does and why. Nothing else here does: the area
 * tiles and hero panels are photographs sitting in a layout, not ink on the
 * wall's paper, and the same source serves both (the clouds and the meadow are
 * each a wall tile AND a page panel). Keying on the slot rather than the file
 * is what lets one source come out pressed in one place and untouched in the
 * other; the slot is already in the variant filename, so the two never collide.
 */
const PRESSED_SLOTS = new Set(["deckTile", "grandTile"]);

/*
 * Slots, measured against the live CSS rather than assumed. `css` is the widest
 * the slot ever gets at that breakpoint; the ladder is those widths times the
 * DPR cap, deduplicated.
 */
const SLOTS = {
  // .area-art — aspect-ratio: 1.74/1. Four-up inside a 1310px frame (286 CSS px
  // each, down to 211 where the frame is still fluid); two-up under 1060px
  // (471 at the top of that range); full-bleed under 760px, leaving ~690.
  areaTile: { ratio: 1.74, css: [211, 286, 471, 690] },

  // .project-card-art — aspect-ratio: 3/2. auto-fill minmax(190px), so six to a
  // row at ~202 CSS px on desktop and one full-bleed card at ~327 on mobile.
  projectCard: { ratio: 1.5, css: [202, 260, 327] },

  // Homepage projects share a 1200:630 frame: three equal cards on a wide
  // canvas, a full-row lead on tablet, then one full-width phone stack.
  conceptProject: { ratio: 1200 / 630, css: [358, 480, 632, 960] },

  // Client-site stills render as two small 16:9 previews in the homepage
  // column, then expand into a wide in-page dialog only when requested.
  clientSite: { ratio: 16 / 9, css: [156, 240, 350, 960] },

  // Client marks replace miniature browser screenshots in the homepage index.
  // They sit in quiet 4:3 brand plates; the full 16:9 site still is deferred
  // until someone asks to preview it.
  clientMark: { ratio: 4 / 3, css: [156, 240, 350] },

  // .deck .card — the square tile the whole card wall is built from. Roughly
  // 92 CSS px where the picture sets run dense, 133 where the text cards sit,
  // and 176 on the widest frames.
  deckTile: { ratio: 1, css: [92, 133, 176] },

  // Title-specific editorial art behind the original cover on the large,
  // wide and tall Taste quilt cards. The source is 3:2 and remains 3:2 here;
  // each card applies its final object-fit crop because one source serves all
  // three proportions.
  tasteArt: { ratio: 3 / 2, css: [180, 280, 420] },

  // .deck .card--grand — the three-unit card for the truly important.
  grandTile: { ratio: 1, css: [176, 250] },

  // .page-art-panel — 0.5fr of the hero grid, capped at 520px under 1060px.
  heroPanel16: { ratio: 16 / 9, css: [327, 425, 520] },
  heroPanel43: { ratio: 4 / 3, css: [327, 425, 520] },

  // .about-profile portrait — 411x328 on desktop, full-bleed when it stacks.
  portrait: { ratio: 411 / 328, css: [327, 411] },

  /*
   * CSS background art, so no srcset — these resolve to a single file through
   * resolveBackground() in site-image.jsx. Exactly one rung each, deliberately:
   * a background's URL is written in the stylesheet, so a multi-rung ladder
   * would let the CSS and resolveBackground pick different files and download
   * the artwork twice.
   *
   * The sources were wildly oversized for these slots: a 512x80 strip painted
   * into 215x45, a 50K splat borrowed from the Portuguese site for a nav row,
   * and a 415K meadow behind a 97%-white wash.
   */
  aboutIntro: { ratio: 768 / 297, css: [560] },
  navDropdown: { ratio: 215 / 45, css: [215] },
  navStrip: { ratio: 320 / 96, css: [112] }
};

/*
 * Reproduce `object-fit: cover` + `object-position` exactly, because that is
 * what the browser was doing before the crop moved to build time. Getting this
 * wrong is silent: the file is the right size and the art is simply framed
 * somewhere else. The Projects tile crops at 50% 10% to hold the face, and
 * centring it instead pushed the subject out of the tile.
 *
 * CSS scales the source to cover the box, then slides the overflow according to
 * the position percentage — 0% flush to the start edge, 100% flush to the end.
 */
function coverCrop(sourceWidth, sourceHeight, ratio, [xPct, yPct]) {
  const sourceRatio = sourceWidth / sourceHeight;
  let width = sourceWidth;
  let height = sourceHeight;

  if (sourceRatio > ratio) {
    width = Math.round(sourceHeight * ratio);
  } else {
    height = Math.round(sourceWidth / ratio);
  }

  return {
    left: Math.round((sourceWidth - width) * (xPct / 100)),
    top: Math.round((sourceHeight - height) * (yPct / 100)),
    width,
    height
  };
}

function ladderFor(slot, nativeWidth) {
  const wanted = [...new Set(slot.css.map((w) => Math.round(w * DPR_CAP)))].sort((a, b) => a - b);
  // Never upscale: clamp to the source, and drop rungs the source cannot reach.
  const capped = wanted.filter((w) => w < nativeWidth);
  if (capped.length !== wanted.length) capped.push(nativeWidth);
  return capped;
}

/*
 * `position` mirrors the `object-position` (or `background-position`) the slot
 * applies, defaulting to centre. These are not decoration: they are the framing
 * decisions already made in site-data.js and globals.css, and the crop has to
 * honour them or the artwork silently reframes.
 */
const sources = [
  // Home area tiles — positions from areaTiles in site-data.js.
  { file: "area-art/about-reflection.webp", slot: "areaTile", position: [50, 10] },
  { file: "area-art/professional-structure.webp", slot: "areaTile" },
  { file: "area-art/about-meadow-flowers.jpg", slot: "areaTile", position: [50, 42] },
  { file: "area-art/contact-blue-clouds.webp", slot: "areaTile" },

  // Offer page panels.
  { file: "area-art/professional-teardown.webp", slot: "heroPanel43" },
  { file: "area-art/professional-system.webp", slot: "heroPanel43" },
  { file: "area-art/professional-prototype.webp", slot: "heroPanel43" },

  // Hero panels: contact reuses the clouds, projects reuses the reflection.
  // Positions from the --page-art-position each panel sets.
  { file: "area-art/contact-blue-clouds.webp", slot: "heroPanel43" },
  { file: "area-art/about-reflection.webp", slot: "heroPanel16", position: [50, 16] },
  { file: "area-art/professional-structure.webp", slot: "heroPanel43", position: [68, 50] },

  // About page. The meadow does double duty as the About home tile, framed
  // differently in each: 50% 54% on the tile, center 12% behind the intro.
  { file: "about-mountain-meadow.webp", slot: "aboutIntro", position: [50, 12] },
  { file: "about-mountain-meadow.webp", slot: "areaTile", position: [50, 54] },
  { file: "about-portrait-smiling.webp", slot: "portrait" },

  // Nav artwork — CSS backgrounds, one rung each.
  { file: "brand-art/nav/personal.webp", slot: "navStrip" },
  { file: "brand-art/nav/professional.webp", slot: "navStrip" },
  { file: "brand-art/nav/about.webp", slot: "navStrip" },
  { file: "brand-art/nav/contact.webp", slot: "navStrip" },
  { file: "brand-art/nav/projects/albums.webp", slot: "navDropdown" },
  { file: "brand-art/nav/projects/cover-collision.webp", slot: "navDropdown" },
  // Probe has no separate nav strip: its card symbol is the dropdown art too,
  // so it is laddered for both slots rather than served full-size to a 215px box.
  { file: "project-art/personal/features-symbol.webp", slot: "navDropdown" },

  // Project cards.
  { file: "project-art/personal/albums-symbol.webp", slot: "projectCard" },
  { file: "project-art/personal/cover-collision-symbol.webp", slot: "projectCard" },
  { file: "project-art/personal/portuguese-with-ines-symbol.webp", slot: "projectCard" },
  { file: "project-art/personal/features-symbol.webp", slot: "projectCard" },
  { file: "features/home-card-bright-v4.png", slot: "conceptProject" },
  { file: "project-art/personal/portuguese-with-ines-conversation.png", slot: "conceptProject" },
  { file: "project-art/personal/trek-paris-sofia-project.png", slot: "conceptProject" },
  { file: "project-art/client-sites/butterfly-rose-redesign-home.jpg", slot: "clientSite" },
  { file: "project-art/client-sites/portuguese-with-ines-home.jpg", slot: "clientSite" },
  { file: "project-art/personal/butterfly-rose-card.webp", slot: "clientMark" },
  { file: "project-art/personal/ines-fan-splat.webp", slot: "clientMark" },
  { file: "area-art/contact-blue-clouds.webp", slot: "deckTile" },
  { file: "area-art/about-meadow-flowers.jpg", slot: "deckTile" },
  { file: "tv-posters/arrested-development.webp", slot: "deckTile" },
  { file: "tv-posters/atlanta.webp", slot: "deckTile" },
  { file: "tv-posters/better-call-saul.webp", slot: "deckTile" },
  { file: "tv-posters/better-things.webp", slot: "deckTile" },
  { file: "tv-posters/black-mirror.webp", slot: "deckTile" },
  { file: "tv-posters/breaking-bad.webp", slot: "deckTile" },
  { file: "tv-posters/community.webp", slot: "deckTile" },
  { file: "tv-posters/fargo.webp", slot: "deckTile" },
  { file: "tv-posters/fawlty-towers.webp", slot: "deckTile" },
  { file: "tv-posters/fleabag.webp", slot: "deckTile" },
  { file: "tv-posters/hannibal.webp", slot: "deckTile" },
  { file: "tv-posters/im-alan-partridge.webp", slot: "deckTile" },
  { file: "tv-posters/its-always-sunny.webp", slot: "deckTile" },
  { file: "tv-posters/louie.webp", slot: "deckTile" },
  { file: "tv-posters/normal-people.webp", slot: "deckTile" },
  { file: "tv-posters/parks-and-recreation.webp", slot: "deckTile" },
  { file: "tv-posters/peep-show.webp", slot: "deckTile" },
  { file: "tv-posters/phoenix-nights.webp", slot: "deckTile" },
  { file: "tv-posters/severance.webp", slot: "deckTile" },
  { file: "tv-posters/spaced.webp", slot: "deckTile" },
  { file: "tv-posters/succession.webp", slot: "deckTile" },
  { file: "tv-posters/the-leftovers.webp", slot: "deckTile" },
  { file: "tv-posters/the-office-uk.webp", slot: "deckTile" },
  { file: "tv-posters/the-thick-of-it.webp", slot: "deckTile" },
  { file: "tv-posters/the-trip.webp", slot: "deckTile" },
  { file: "tv-posters/true-detective.webp", slot: "deckTile" },
  { file: "tv-posters/twin-peaks-the-return.webp", slot: "deckTile" },
  { file: "tv-posters/watchmen.webp", slot: "deckTile" },
  { file: "game-covers/bioshock.webp", slot: "deckTile" },
  { file: "game-covers/bloodborne.webp", slot: "deckTile" },
  { file: "game-covers/call-of-duty-4.webp", slot: "deckTile" },
  { file: "game-covers/dark-souls-3.webp", slot: "deckTile" },
  { file: "game-covers/devil-may-cry.webp", slot: "deckTile" },
  { file: "game-covers/elder-scrolls.webp", slot: "deckTile" },
  { file: "game-covers/fallout.webp", slot: "deckTile" },
  { file: "game-covers/final-fantasy.webp", slot: "deckTile" },
  { file: "game-covers/god-of-war.webp", slot: "deckTile" },
  { file: "game-covers/half-life.webp", slot: "deckTile" },
  { file: "game-covers/halo-3.webp", slot: "deckTile" },
  { file: "game-covers/hearthstone.webp", slot: "deckTile" },
  { file: "game-covers/journey.webp", slot: "deckTile" },
  { file: "game-covers/last-of-us.webp", slot: "deckTile" },
  { file: "game-covers/league-of-legends.webp", slot: "deckTile" },
  { file: "game-covers/pyre.webp", slot: "deckTile" },
  { file: "game-covers/saints-row.webp", slot: "deckTile" },
  { file: "game-covers/slay-the-spire.webp", slot: "deckTile" },
  { file: "game-covers/terraria.webp", slot: "deckTile" },
  { file: "game-covers/warcraft-3.webp", slot: "deckTile" },
  { file: "project-art/personal/butterfly-rose-card.webp", slot: "deckTile" },
  { file: "project-art/personal/trek-card.webp", slot: "deckTile" },
  { file: "project-art/personal/life-map-card.webp", slot: "deckTile" },
  { file: "project-art/personal/ines-fan-splat.webp", slot: "deckTile" },
  { file: "project-art/personal/features-card.webp", slot: "deckTile" },
  { file: "project-art/personal/features-symbol.webp", slot: "deckTile" },
  { file: "music-art/graceland.jpg", slot: "deckTile" },
  { file: "podcast-covers/making-sense.webp", slot: "deckTile" },
  { file: "podcast-covers/huberman-lab.webp", slot: "deckTile" },
  { file: "podcast-covers/dwarkesh-podcast.webp", slot: "deckTile" },
  { file: "podcast-covers/lex-fridman-podcast.webp", slot: "deckTile" },
  { file: "podcast-covers/all-in-podcast.webp", slot: "deckTile" },
  { file: "podcast-covers/within-reason.webp", slot: "deckTile" },
  { file: "podcast-covers/moonshots.webp", slot: "deckTile" },
  { file: "project-art/tools/claude.webp", slot: "deckTile" },
  { file: "project-art/tools/cloudflare.webp", slot: "deckTile" },
  { file: "project-art/tools/excel.webp", slot: "deckTile" },
  { file: "project-art/tools/fabric.webp", slot: "deckTile" },
  { file: "project-art/tools/figma.webp", slot: "deckTile" },
  { file: "project-art/tools/github.webp", slot: "deckTile" },
  { file: "project-art/tools/grok-bot.webp", slot: "deckTile" },
  { file: "project-art/tools/openai.webp", slot: "deckTile" },
  { file: "project-art/tools/oracle.webp", slot: "deckTile" },
  { file: "project-art/tools/power-bi.webp", slot: "deckTile" },
  { file: "project-art/tools/powerpoint.webp", slot: "deckTile" },
  { file: "project-art/tools/sql.webp", slot: "deckTile" },
  { file: "film-posters/a-clockwork-orange.webp", slot: "deckTile" },
  { file: "film-posters/adaptation.webp", slot: "deckTile" },
  { file: "film-posters/american-beauty.webp", slot: "deckTile" },
  { file: "film-posters/anomalisa.webp", slot: "deckTile" },
  { file: "film-posters/before-trilogy.webp", slot: "deckTile" },
  { file: "film-posters/blue-valentine.webp", slot: "deckTile" },
  { file: "film-posters/boogie-nights.webp", slot: "deckTile" },
  { file: "film-posters/call-me-by-your-name.webp", slot: "deckTile" },
  { file: "film-posters/drive.webp", slot: "deckTile" },
  { file: "film-posters/eternal-sunshine-of-the-spotless-mind.webp", slot: "deckTile" },
  { file: "film-posters/everybody-wants-some.webp", slot: "deckTile" },
  { file: "film-posters/foxcatcher.webp", slot: "deckTile" },
  { file: "film-posters/frances-ha.webp", slot: "deckTile" },
  { file: "film-posters/good-will-hunting.webp", slot: "deckTile" },
  { file: "film-posters/her.webp", slot: "deckTile" },
  { file: "film-posters/licorice-pizza.webp", slot: "deckTile" },
  { file: "film-posters/lost-in-translation.webp", slot: "deckTile" },
  { file: "film-posters/love-actually.webp", slot: "deckTile" },
  { file: "film-posters/magnolia.webp", slot: "deckTile" },
  { file: "film-posters/moonrise-kingdom.webp", slot: "deckTile" },
  { file: "film-posters/mysterious-skin.webp", slot: "deckTile" },
  { file: "film-posters/one-more-time-with-feeling.webp", slot: "deckTile" },
  { file: "film-posters/paths-of-glory.webp", slot: "deckTile" },
  { file: "film-posters/rushmore.webp", slot: "deckTile" },
  { file: "film-posters/school-of-rock.webp", slot: "deckTile" },
  { file: "film-posters/submarine.webp", slot: "deckTile" },
  { file: "film-posters/superbad.webp", slot: "deckTile" },
  { file: "film-posters/the-big-lebowski.webp", slot: "deckTile" },
  { file: "film-posters/the-holdovers.webp", slot: "deckTile" },
  { file: "film-posters/the-king-s-speech.webp", slot: "deckTile" },
  { file: "film-posters/the-lord-of-the-rings.webp", slot: "deckTile" },
  { file: "film-posters/the-master.webp", slot: "deckTile" },
  { file: "film-posters/the-social-network.webp", slot: "deckTile" },
  { file: "film-posters/watchmen.webp", slot: "deckTile" },
  { file: "film-posters/you-were-never-really-here.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-01.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-02.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-03.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-04.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-05.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-06.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-07.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-08.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-09.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-10.webp", slot: "deckTile" },
  { file: "project-images/cover-collision/cover-collision-11.webp", slot: "deckTile" }
];

/* The art-directed Taste set mirrors the stable poster filenames. Discovering
   the three committed folders keeps the source list exact without repeating
   83 slugs beside the already-canonical deck data. */
for (const directory of ["taste-art/films", "taste-art/games", "taste-art/tv"]) {
  const files = (await readdir(path.join(publicDir, directory)))
    .filter((file) => file.endsWith(".webp"))
    .sort();
  for (const file of files) sources.push({ file: `${directory}/${file}`, slot: "tasteArt" });
}

/*
 * Deliberately absent: albion-rose-card and albion-sunburst-hero. They survive
 * in site-data.js as `image`/`shot` fields,
 * but nothing reads those fields — the cards render the `-symbol` art through
 * personal-project-art.jsx instead. They appear in the bundle only as data
 * strings, never as an <img src>, so they are ~560K of files that ship in the
 * export and are never requested. Left in place rather than deleted; worth a
 * decision separately from this pipeline.
 */

/*
 * Brand logos are a different shape of problem: they render at 24-28px with
 * `object-fit: contain` and carry transparency, so they are scaled to fit
 * rather than cropped, and they keep their alpha. The sources are PNG exports
 * at full logo resolution — 81K of sky-betting-gaming for a 28px mark.
 * One rung at 56px covers 2x, since nothing here is ever larger.
 */
const LOGO_BOX = 56;
const logos = [
  "brand-logos/sky-betting-gaming-logo.png",
  "brand-logos/national-wealth-fund-icon.png",
  "brand-logos/openai-codex-app.png",
  "brand-logos/lloyds-horse-icon.png"
];

/* Grain-heavy photographic art takes AVIF q50 without visible loss at display
   size. Flat symbol art needs more headroom to keep edges clean. */
const FLAT = /symbol|logo|icon/;
const codecOptions = (file, format) => {
  const flat = FLAT.test(file);
  return format === "avif"
    ? { quality: flat ? 62 : 50, effort: 5 }
    : { quality: flat ? 82 : 72, effort: 6 };
};

function variantName(file, slot, width, ext) {
  const parsed = path.parse(file);
  return path.posix.join(parsed.dir, `${parsed.name}-${slot}-${width}.${ext}`);
}

async function hashFile(absolute) {
  return createHash("sha256").update(await readFile(absolute)).digest("hex").slice(0, 16);
}

async function build() {
  if (!checkOnly) {
    await rm(variantDir, { recursive: true, force: true });
    await mkdir(variantDir, { recursive: true });
  }

  const manifest = {};
  const problems = [];
  let sourceBytes = 0;
  const seenSources = new Set();

  for (const source of sources) {
    const absolute = path.join(publicDir, source.file);
    const slot = SLOTS[source.slot];
    let meta;
    try {
      meta = await sharp(absolute).metadata();
    } catch {
      problems.push(`missing source: ${source.file}`);
      continue;
    }

    if (!seenSources.has(source.file)) {
      seenSources.add(source.file);
      sourceBytes += (await stat(absolute)).size;
    }

    const key = `${source.slot}:/${source.file}`;
    const pressed = PRESSED_SLOTS.has(source.slot);
    const entries = [];

    for (const width of ladderFor(slot, meta.width)) {
      const height = Math.round(width / slot.ratio);
      /* Pressed once per rung and cloned into both codecs, rather than once
         per file: the ramp is the same either side and AVIF and WebP are two
         encodings of one plate, not two plates. */
      let plate = null;

      for (const format of ["avif", "webp"]) {
        const rel = variantName(source.file, source.slot, width, format);
        const target = path.join(variantDir, rel);

        if (checkOnly) {
          try {
            await stat(target);
          } catch {
            problems.push(`missing variant: _img/${rel}`);
          }
        } else {
          await mkdir(path.dirname(target), { recursive: true });
          const crop = coverCrop(meta.width, meta.height, slot.ratio, source.position ?? [50, 50]);
          const cut = () =>
            sharp(absolute).extract(crop).resize(width, height, { fit: "fill" });
          if (pressed && !plate) plate = await press(sharp, cut());
          await (plate ? plate.clone() : cut())
            [format](codecOptions(source.file, format))
            .toFile(target);
        }

        let bytes = 0;
        try {
          bytes = (await stat(target)).size;
        } catch {
          /* reported above in --check mode */
        }

        const entry = entries.find((e) => e.width === width) ?? { width, height };
        entry[format] = { src: `/_img/${rel}`, bytes };
        if (!entries.includes(entry)) entries.push(entry);
      }
    }

    manifest[key] = {
      source: `/${source.file}`,
      slot: source.slot,
      ratio: +slot.ratio.toFixed(4),
      sourceWidth: meta.width,
      sourceHeight: meta.height,
      sourceHash: await hashFile(absolute),
      /* Recorded per entry, not once at the top of the file: the checks below
         hash SOURCES, so a change to the press would otherwise leave every
         committed plate stale while `--check` reported everything current —
         a green build serving a generation-old wall. */
      press: pressed ? PRESS_VERSION : undefined,
      variants: entries
    };
  }

  for (const file of logos) {
    const absolute = path.join(publicDir, file);
    let meta;
    try {
      meta = await sharp(absolute).metadata();
    } catch {
      problems.push(`missing logo: ${file}`);
      continue;
    }

    if (!seenSources.has(file)) {
      seenSources.add(file);
      sourceBytes += (await stat(absolute)).size;
    }

    const parsed = path.parse(file);
    const rel = path.posix.join(parsed.dir, `${parsed.name}-logo-${LOGO_BOX}.webp`);
    const target = path.join(variantDir, rel);

    if (checkOnly) {
      try {
        await stat(target);
      } catch {
        problems.push(`missing variant: _img/${rel}`);
      }
    } else {
      await mkdir(path.dirname(target), { recursive: true });
      await sharp(absolute)
        .resize(LOGO_BOX, LOGO_BOX, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88, effort: 6, alphaQuality: 100 })
        .toFile(target);
    }

    let bytes = 0;
    try {
      bytes = (await stat(target)).size;
    } catch {
      /* reported above in --check mode */
    }

    manifest[`logo:/${file}`] = {
      source: `/${file}`,
      slot: "logo",
      sourceWidth: meta.width,
      sourceHeight: meta.height,
      sourceHash: await hashFile(absolute),
      variants: [{ width: LOGO_BOX, webp: { src: `/_img/${rel}`, bytes } }]
    };
  }

  if (checkOnly) {
    let previous;
    try {
      previous = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch {
      problems.push("components/image-variants.json is missing");
      previous = {};
    }
    // One source can back several slots, so report each changed file once.
    const changed = new Set();
    const repressed = new Set();
    for (const [key, entry] of Object.entries(manifest)) {
      if (previous[key]?.sourceHash !== entry.sourceHash) changed.add(entry.source);
      if ((previous[key]?.press ?? null) !== (entry.press ?? null)) repressed.add(entry.source);
    }
    for (const source of changed) {
      problems.push(`source changed since variants were generated: ${source}`);
    }
    for (const source of repressed) {
      problems.push(`press curve changed since variants were generated: ${source}`);
    }
    for (const key of Object.keys(previous)) {
      if (!manifest[key]) problems.push(`stale manifest entry (source no longer listed): ${key}`);
    }
    if (problems.length) {
      console.error("Image variants are out of date:\n  " + problems.join("\n  "));
      console.error("\nRun: node scripts/generate-image-variants.mjs");
      process.exit(1);
    }
    console.log(`Image variants current (${Object.keys(manifest).length} slot bindings).`);
    return;
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  // Report the number that matters: what one visitor pays, not the ladder total.
  const k = (bytes) => `${(bytes / 1024).toFixed(0)}K`;
  const topRung = (entry) => entry.variants[entry.variants.length - 1];
  // Logos are WebP-only, so fall back to the WebP figure for those.
  const widest = Object.values(manifest).reduce((sum, entry) => {
    const rung = topRung(entry);
    return sum + (rung.avif?.bytes ?? rung.webp?.bytes ?? 0);
  }, 0);

  console.log(`Sources           ${k(sourceBytes)} across ${seenSources.size} files`);
  console.log(`Widest rung each  ${k(widest)} across ${Object.keys(manifest).length} bindings`);
  if (problems.length) {
    console.error("\nProblems:\n  " + problems.join("\n  "));
    process.exit(1);
  }
}

await build();
