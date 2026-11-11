// Paint one still of the valley to a PNG, for looking at while it is made.
// node world/still.mjs --w 480 --h 300 --time 19.3 --seed 7 --scale 3 --albums 6 --out valley.png

import { readFileSync, writeFileSync } from "node:fs";
import { paintValley } from "./paint.mjs";
import { buildPalette, ditherTo, plain } from "./dither.mjs";
import { encodePng } from "./png.mjs";
import { layoutThings, drawThings } from "./things.mjs";
import { loadSleeves } from "./sleeves.mjs";
import { albumWeights } from "../components/paper/music-map.mjs";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(" ")
    .split("--")
    .filter(Boolean)
    .map((pair) => pair.trim().split(/\s+/))
    .map(([key, value = "1"]) => [key, value])
);
const W = Number(args.w ?? 480);
const H = Number(args.h ?? 300);
const scale = Number(args.scale ?? 3);
const started = performance.now();
const view = paintValley({
  W,
  H,
  seed: Number(args.seed ?? 7),
  time: Number(args.time ?? 19.3),
  fov: Number(args.fov ?? 60),
  horizon: Number(args.horizon ?? 0.42),
  eye: Number(args.eye ?? 30),
  yaw: Number(args.yaw ?? 0),
  clear: Number(args.clear ?? 1),
  aim: args.aim ? { x: Number(args.aim.split(",")[0]), z: Number(args.aim.split(",")[1]), at: Number(args.at ?? 0.6), lift: Number(args.lift ?? 0) } : null
});
const painted = performance.now();
let rgba;
if (args.raw) {
  rgba = plain(view.img, W, H);
} else {
  const palette = buildPalette(view.img, W, H, Number(args.colours ?? 32));
  rgba = ditherTo(view.img, W, H, palette, Number(args.spread ?? 0.06)).rgba;
}

let layout = null;
if (args.albums) {
  const ranking = JSON.parse(readFileSync("public/music-ranking.json", "utf8"));
  const kinds = JSON.parse(readFileSync("world/kinds.json", "utf8")).kinds;
  const list = ranking.albums.map((a, rank) => ({ id: a[0], title: a[1], artist: ranking.names[a[2]], minutes: a[5], rank }));
  const weights = albumWeights(list);
  const albums = list.map((album, index) => ({ ...album, weight: weights[index], kind: kinds[album.id] })).sort((a, b) => b.weight - a.weight);
  layout = layoutThings(view, albums, {
    perKind: Number(args.albums),
    smallest: Number(args.smallest ?? 9),
    largest: Number(args.largest ?? 22)
  });
  const sleeve = await loadSleeves(layout.items.map((item) => ({ id: item.id, s: item.s })));
  drawThings(rgba, W, H, layout, sleeve, { night: view.A.night });
  if (args.layout) writeFileSync(args.layout, JSON.stringify({ W, H, scale, anchors: layout.anchors, items: layout.items }, null, 1));
}

const out = args.out ?? "valley.png";
writeFileSync(out, encodePng(rgba, W, H, scale));
console.log(`${out}: ${W}x${H} x${scale}, painted in ${Math.round(painted - started)} ms${layout ? `, ${layout.items.length} sleeves on ${layout.anchors.length} strings` : ""}`);
