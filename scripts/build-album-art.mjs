/*
 * The album wall's artwork ladder.
 *
 * The 249 sleeves are print masters — Dan had them printed as cards — and they
 * live in Creative Assets at up to 4000x4000, 607MB in total. None of that
 * belongs in a public repo, so this script is the one place the two meet: it
 * reads the masters from outside the repo and writes only the small derived
 * rungs into `public/album-art/`, which are committed.
 *
 * That keeps the GitHub Pages build hermetic in the same way the slot system in
 * generate-image-variants.mjs does — the variants are committed, the toolchain
 * only ever runs here — but without dragging half a gigabyte of masters along
 * for the ride. It is deliberately NOT a slot in that script: every source
 * there is a committed file in `public/`, and these sources are not committed
 * and never should be.
 *
 * Output goes to `public/album-art/`, NOT `public/_img/`. The latter belongs to
 * generate-image-variants.mjs, which clears the whole directory on every run —
 * so anything else living there is silently destroyed the next time artwork is
 * regenerated. That already happened once.
 *
 * This script used to make the same mistake in its own directory. It shares
 * `public/album-art/` with fetch-lastfm-art.mjs, whose ~4,200 `lf-*` files are
 * the other five sixths of the album wall, and it opened by removing the
 * directory whole — so running it without an API key and a Last.fm refresh
 * deleted every one of them. Git had them, which is the only reason that was a
 * scare rather than a loss. It now clears only the files it writes.
 *
 * Filenames are the numeric id, not a slug of the artist. Ids are stable across
 * re-identification; slugs are not, and thirty of these sleeves are still
 * unidentified. A slug rename would silently orphan every committed rung.
 *
 *   node scripts/build-album-art.mjs           regenerate
 *   node scripts/build-album-art.mjs --check   verify the ladder matches the manifest
 */
import { mkdir, readFile, readdir, rm, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { homedir } from "node:os";
import sharp from "sharp";
import { PRESS_VERSION, press } from "./press-curve.mjs";

const root = new URL("../", import.meta.url).pathname;
const MASTERS = path.join(homedir(), "Documents", "Creative Assets", "Library", "Album Art");
const outDir = path.join(root, "public", "album-art");
const manifestPath = path.join(root, "data", "album-art-manifest.json");

const checkOnly = process.argv.includes("--check");

/*
 * Two rungs, because the wall and the opened card are the only two sizes that
 * ever render and they are far apart.
 *
 * `wall` — the live Taste wall reaches ~130 CSS px, and the dedicated album
 * wall reaches ~132. 264 covers both at 2x DPR, keeping sleeve typography and
 * fine edges crisp instead of asking a 198px file to fill a Retina tile.
 *
 * `card` — the opened detail view is capped at 380 CSS px. 760 = 380 x 2.
 * It is fetched only when a card is opened, so it costs nothing on load.
 */
const RUNGS = [
  { name: "wall", width: 264 },
  { name: "card", width: 760 }
];

/* Both rungs go through the press — see press-curve.mjs. Both, not just the
   wall: the spotlight lays the opened card over the tile it grew from and
   flies one into the other, so a pressed tile arriving at an unpressed card
   would show the artwork changing colour mid-flight. */
const AVIF = { quality: 52, effort: 6 };
const WEBP = { quality: 74 };

const sha = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 16);

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function listMasters() {
  const files = (await readdir(MASTERS)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  return files.map((file, i) => ({ id: String(i + 1).padStart(3, "0"), file }));
}

async function main() {
  if (!(await exists(MASTERS))) {
    if (checkOnly) {
      console.log("album-art: masters not present, skipping check (this is expected in CI)");
      return;
    }
    throw new Error(`Album art masters not found at ${MASTERS}`);
  }

  const masters = await listMasters();
  const previous = (await exists(manifestPath))
    ? JSON.parse(await readFile(manifestPath, "utf8"))
    : { entries: [] };
  const previousById = new Map(previous.entries.map((e) => [e.id, e]));

  if (checkOnly) {
    const problems = [];
    /* The check below hashes the MASTERS, which do not change when the press
       does — so without this line a new curve would leave all 249 sleeves
       stale and still report "all current". */
    if (previous.pressVersion !== PRESS_VERSION) {
      problems.push(
        `built with press "${previous.pressVersion ?? "none"}" but the curve is now "${PRESS_VERSION}"`
      );
    }
    if (masters.length !== previous.entries.length) {
      problems.push(`${masters.length} masters on disk but ${previous.entries.length} in the manifest`);
    }
    for (const { id, file } of masters) {
      const prior = previousById.get(id);
      if (!prior) {
        problems.push(`${id} (${file}) has no manifest entry`);
        continue;
      }
      if (prior.file !== file) {
        problems.push(`${id} is "${file}" on disk but "${prior.file}" in the manifest`);
      }
      const digest = sha(await readFile(path.join(MASTERS, file)));
      if (prior.sourceHash !== digest) {
        problems.push(`${id} (${file}) has changed since its variants were generated`);
      }
      for (const rung of RUNGS) {
        for (const ext of ["avif", "webp"]) {
          if (ext === "webp" && rung.name !== "wall") continue;
          if (!(await exists(path.join(outDir, `${id}-${rung.name}.${ext}`)))) {
            problems.push(`${id} is missing ${rung.name}.${ext}`);
          }
        }
      }
    }
    if (problems.length) {
      console.error("album-art check failed:");
      for (const p of problems.slice(0, 40)) console.error(`  - ${p}`);
      if (problems.length > 40) console.error(`  ...and ${problems.length - 40} more`);
      process.exit(1);
    }
    console.log(`album-art: ${masters.length} sleeves, ${masters.length * (RUNGS.length + 1)} variants, all current`);
    return;
  }

  /* Only this script's own output — `NNN-wall.*` and `NNN-card.*`. The `lf-*`
     sleeves in the same directory belong to fetch-lastfm-art.mjs and are not
     ours to remove. */
  await mkdir(outDir, { recursive: true });
  const OWNED = /^\d{3}-(wall|card)\.(avif|webp)$/;
  for (const name of await readdir(outDir)) {
    if (OWNED.test(name)) await rm(path.join(outDir, name));
  }

  const entries = [];
  let bytes = 0;

  for (const { id, file } of masters) {
    const source = await readFile(path.join(MASTERS, file));
    const meta = await sharp(source).metadata();

    for (const rung of RUNGS) {
      // Never upscale: a couple of masters are only 1000px, and the card rung
      // would otherwise interpolate them into mush.
      const width = Math.min(rung.width, Math.min(meta.width, meta.height));
      const base = await press(
        sharp,
        sharp(source).resize(width, width, { fit: "cover", position: "centre" })
      );
      const avif = await base.clone().avif(AVIF).toBuffer();
      await writeFile(path.join(outDir, `${id}-${rung.name}.avif`), avif);
      bytes += avif.length;

      // Only the wall rung gets a WebP twin. The card rung is AVIF-only — see
      // AlbumArtImage in components/site-image.jsx for why.
      if (rung.name === "wall") {
        const webp = await base.clone().webp(WEBP).toBuffer();
        await writeFile(path.join(outDir, `${id}-${rung.name}.webp`), webp);
        bytes += webp.length;
      }
    }

    entries.push({
      id,
      file,
      sourceHash: sha(source),
      sourceWidth: meta.width,
      sourceHeight: meta.height
    });

    if (entries.length % 25 === 0) process.stderr.write(`  ${entries.length}/${masters.length}\n`);
  }

  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        note: "Generated by scripts/build-album-art.mjs. Masters live outside the repo in Creative Assets.",
        pressVersion: PRESS_VERSION,
        rungs: RUNGS,
        entries
      },
      null,
      2
    )}\n`
  );

  console.log(
    `album-art: ${entries.length} sleeves -> ${entries.length * (RUNGS.length + 1)} variants, ${(bytes / 1048576).toFixed(1)}MB`
  );
}

await main();
