// Convert heavy public/ art to WebP for the static export, capping oversized
// dimensions. Originals are left in place; components reference the .webp files.
// Run after adding or replacing artwork: node scripts/optimize-images.mjs
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDir = new URL("../public/", import.meta.url).pathname;

const groups = [
  { dir: "project-art/personal", maxWidth: 1600, quality: 78 },
  { dir: "area-art", maxWidth: 1200, quality: 80 },
  { dir: "project-images/cover-collision", maxWidth: 720, quality: 78 },
  { dir: ".", files: ["about-portrait-smiling.jpg"], maxWidth: 1000, quality: 78 }
];

const convertible = /\.(jpe?g|png)$/i;

let totalBefore = 0;
let totalAfter = 0;

for (const group of groups) {
  const dir = path.join(publicDir, group.dir);
  const names = group.files ?? (await readdir(dir)).filter((name) => convertible.test(name));

  for (const name of names) {
    const source = path.join(dir, name);
    const target = source.replace(convertible, ".webp");
    const before = (await stat(source)).size;

    await sharp(source)
      .resize({ width: group.maxWidth, withoutEnlargement: true })
      .webp({ quality: group.quality, effort: 6 })
      .toFile(target);

    const after = (await stat(target)).size;
    totalBefore += before;
    totalAfter += after;
    console.log(
      `${path.relative(publicDir, source)}  ${(before / 1024).toFixed(0)}K -> ${(after / 1024).toFixed(0)}K`
    );
  }
}

console.log(`\nTotal ${(totalBefore / 1024).toFixed(0)}K -> ${(totalAfter / 1024).toFixed(0)}K`);
