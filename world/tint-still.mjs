// A still of one view painted in one record's colours, to judge the idea.
// node world/tint-still.mjs --cover 144 --time 8.2 --fov 22 --aim 300,1950 --at 0.66 --out x.png
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { paintValley } from "./paint.mjs";
import { buildPalette, ditherTo } from "./dither.mjs";
import { encodePng } from "./png.mjs";
import { coverSteps, tintPalette } from "./tint.mjs";

const args = Object.fromEntries(process.argv.slice(2).join(" ").split("--").filter(Boolean).map((p) => p.trim().split(/\s+/)).map(([k, v = "1"]) => [k, v]));
const W = Number(args.w ?? 480);
const H = Number(args.h ?? 300);
const view = paintValley({
  W, H, seed: 7, time: Number(args.time ?? 19.3), fov: Number(args.fov ?? 60), horizon: Number(args.horizon ?? 0.4), eye: Number(args.eye ?? 54), yaw: Number(args.yaw ?? 0), clear: Number(args.clear ?? 1),
  aim: args.aim ? { x: Number(args.aim.split(",")[0]), z: Number(args.aim.split(",")[1]), at: Number(args.at ?? 0.6) } : null
});
const cover = await sharp(`public/album-art/${args.cover}-wall.webp`).resize(40, 40).removeAlpha().raw().toBuffer();
const steps = coverSteps(new Uint8Array(cover), Number(args.steps ?? 7));
const palette = tintPalette(buildPalette(view.img, W, H, Number(args.colours ?? 32)), steps, Number(args.keep ?? 0.28));
// Match each pixel to the land's own palette, then show the record's colour for it.
const plain = buildPalette(view.img, W, H, Number(args.colours ?? 32));
const { pick } = ditherTo(view.img, W, H, plain, 0.06);
const rgba = new Uint8ClampedArray(W * H * 4);
for (let p = 0; p < W * H; p += 1) {
  const c = palette[pick[p]].rgb;
  rgba[p * 4] = c[0] * 255;
  rgba[p * 4 + 1] = c[1] * 255;
  rgba[p * 4 + 2] = c[2] * 255;
  rgba[p * 4 + 3] = 255;
}
writeFileSync(args.out ?? "tint.png", encodePng(rgba, W, H, Number(args.scale ?? 2)));
console.log(args.out, steps.map((s) => s.map((v) => v.toFixed(2)).join("/")).join(" "));
