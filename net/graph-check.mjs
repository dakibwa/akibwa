// Counts of what the net holds. node net/graph-check.mjs
import { readFileSync } from "node:fs";
import { albumWeights } from "../components/paper/music-map.mjs";
import { makeGraph } from "./graph.mjs";

export function loadGraph() {
  const ranking = JSON.parse(readFileSync("public/music-ranking.json", "utf8"));
  const yearly = JSON.parse(readFileSync("public/music-years.json", "utf8"));
  const kindOf = JSON.parse(readFileSync("world/kinds.json", "utf8")).kinds;
  const artistKinds = JSON.parse(readFileSync("net/artist-kinds.json", "utf8")).kinds;
  const weights = albumWeights(ranking.albums.map((a) => ({ title: a[1], artist: ranking.names[a[2]], minutes: a[5] })));
  return makeGraph({ ranking, yearly, kindOf, weights, artistKinds });
}

if (process.argv[1].endsWith("graph-check.mjs")) {
  const G = loadGraph();
  const count = (f) => G.nodes.filter(f).length;
  console.log(`artists ${count((n) => n.t === "artist")}, albums ${count((n) => n.t === "album")}, songs ${count((n) => n.t === "song")}`);
  for (const g of G.groups) console.log(` ${g.label}: ${count((n) => n.t === "artist" && n.g === g.id)} artists, ${count((n) => n.t === "album" && n.g === g.id)} albums, ${count((n) => n.t === "song" && n.g === g.id)} songs`);
  const kinds = {};
  for (const l of G.links) kinds[l.t] = (kinds[l.t] ?? 0) + 1;
  console.log(kinds);
  console.log("unsorted:", G.nodes.filter((n) => n.t === "artist" && n.g === "singles").map((n) => n.n).join(" | ") || "none");
  const w = G.nodes.filter((n) => n.t === "album").map((n) => n.w).sort((a, b) => b - a);
  console.log("album weights", w.slice(0, 5).map(Math.round), "median", Math.round(w[75]), "least", Math.round(w.at(-1)));
  const s = G.nodes.filter((n) => n.t === "song");
  console.log("songs on albums", s.filter((n) => G.nodes[n.p].t === "album").length, "plays max", Math.max(...s.map((n) => n.w)), "median", s.map((n) => n.w).sort((a, b) => a - b)[500]);
}
