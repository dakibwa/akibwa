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

const root = new URL("../", import.meta.url).pathname;
const publicDir = path.join(root, "public");
const variantDir = path.join(publicDir, "_img");
const manifestPath = path.join(root, "components", "image-variants.json");

const checkOnly = process.argv.includes("--check");

const DPR_CAP = 1.5;

/*
 * Slots, measured against the live CSS rather than assumed. `css` is the widest
 * the slot ever gets at that breakpoint; the ladder is those widths times the
 * DPR cap, deduplicated.
 */
const SLOTS = {
  // The Akibwa mark on the Freelance card in Career.
  identityMark: { ratio: 1, css: [40, 56] },

  // Homepage projects share a compact 5:2 frame: three equal desktop cards,
  // then a native swipe rail capped at 400 CSS px on phones and tablets.
  conceptProject: { ratio: 5 / 2, css: [240, 320, 418] },

  // Podcast covers sit in the Taste Library beside posters and game boxes, so
  // they share that ladder.
  podcastArt: { ratio: 1, css: [104, 136, 176] },

  // Real theatrical/TV posters and game boxes in the Taste Library.
  posterArt: { ratio: 2 / 3, css: [104, 136, 176] },
  gameArt: { ratio: 3 / 4, css: [104, 136, 176] }
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
function coverCrop(sourceWidth, sourceHeight, ratio, [xPct, yPct], zoom = 1) {
  const sourceRatio = sourceWidth / sourceHeight;
  let width = sourceWidth;
  let height = sourceHeight;

  if (sourceRatio > ratio) {
    width = Math.round(sourceHeight * ratio);
  } else {
    height = Math.round(sourceWidth / ratio);
  }
  width = Math.round(width / zoom);
  height = Math.round(height / zoom);

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
 * `position` mirrors the `object-position` the slot applies, defaulting to
 * centre. These are not decoration: they are framing decisions already made in
 * globals.css, and the crop has to honour them or the artwork silently reframes.
 */
const sources = [
  { file: "brand-logos/akibwa-a.png", slot: "identityMark" },
  { file: "project-art/personal/features-discoveries.svg", slot: "conceptProject" },
  { file: "project-art/personal/portuguese-with-ines-conversation.png", slot: "conceptProject", position: [0, 30], zoom: 1.3 },
  { file: "project-art/personal/trek-paper-landscape.png", slot: "conceptProject" },
  // Screenshots of the sites (scripts/capture-websites.mjs); cards show the top.
  { file: "project-art/websites/castle-bank.webp", slot: "conceptProject", position: [50, 0] },
  { file: "project-art/websites/butterfly-rose.webp", slot: "conceptProject", position: [50, 0] }
];

for (const file of (await readdir(path.join(publicDir, "podcast-covers"))).filter((file) => file.endsWith(".webp")).sort()) {
  sources.push({ file: `podcast-covers/${file}`, slot: "podcastArt" });
}

const curation = JSON.parse(await readFile(path.join(root, "data/taste-curation.json"), "utf8"));
for (const kind of ["films", "tv", "games"]) {
  for (const item of curation[kind]) {
    // The original square poster plates contain the full poster on a small
    // blurred surround. This crop removes that surround without losing type.
    sources.push({ file: item.art.slice(1), slot: kind === "games" ? "gameArt" : "posterArt", zoom: kind === "games" ? 1 : 1.09, ...(item.art.includes("hearthstone-key-art") ? { position: [85, 50] } : {}) });
  }
}

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

/*
 * The manifest ships inside every page's JavaScript, so it records only what
 * <SiteImage> cannot derive. Each file is `_img/<source>-<slot>-<width>.<fmt>`
 * (variantName above), so a binding needs its widths, formats and hash, not a
 * copy of every path and byte count. One binding per line keeps diffs legible.
 */
function compactManifest(manifest) {
  const lines = Object.entries(manifest).map(([key, entry]) => {
    const formats = ["avif", "webp"].filter((format) => entry.variants.every((variant) => variant[format]));
    const compact = {
      sourceWidth: entry.sourceWidth,
      sourceHeight: entry.sourceHeight,
      sourceHash: entry.sourceHash,
      widths: entry.variants.map((variant) => variant.width),
      ...(formats.length === 2 ? {} : { formats })
    };
    return `  ${JSON.stringify(key)}: ${JSON.stringify(compact)}`;
  });
  return `{\n${lines.join(",\n")}\n}\n`;
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
    const entries = [];

    for (const width of ladderFor(slot, meta.width)) {
      const height = Math.round(width / slot.ratio);
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
          const crop = coverCrop(meta.width, meta.height, slot.ratio, source.position ?? [50, 50], source.zoom);
          await sharp(absolute)
            .extract(crop)
            .resize(width, height, { fit: "fill" })
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
    for (const [key, entry] of Object.entries(manifest)) {
      if (previous[key]?.sourceHash !== entry.sourceHash) changed.add(entry.source);
    }
    for (const source of changed) {
      problems.push(`source changed since variants were generated: ${source}`);
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

  await writeFile(manifestPath, compactManifest(manifest));

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
