// Sorts the published albums into kinds of music, by hand, once.
// node world/build-kinds.mjs  →  world/kinds.json  (album id → kind)
//
// The letters follow the order of public/music-ranking.json on the day they
// were written; each is checked against its title so a reshuffled ranking
// cannot quietly move a letter onto another album.

import { readFileSync, writeFileSync } from "node:fs";

const NAMES = { a: "ambient", c: "classics", h: "hiphop", f: "folk", i: "indie", p: "psych", e: "electronic" };
const LETTERS = [
  "acahfipiep", "hiihhpifhp", "fihiipihif", "cfcicecipp", "pfiehhhcia",
  "hpiifcieic", "fphciiiica", "haifihaeif", "aheihhehaa", "chceciihic",
  "ehhipfcchh", "pihieifchf", "hpciiihahe", "ciciicepaf", "eichpehiaf"
].join("");
// A few titles down the list, to be sure the letters still line up.
const CHECK = { 0: "Music for Psychedelic Therapy", 1: "Graceland", 8: "Shout Out! To Freedom...", 30: "The Piper At The Gates Of Dawn", 76: "Eno/Wyatt/Davies: Music for Airports", 99: "Hunky Dory", 136: "Sirens", 149: "Pure Comedy" };

const ranking = JSON.parse(readFileSync("public/music-ranking.json", "utf8"));
const albums = ranking.albums;
if (albums.length !== LETTERS.length) throw new Error(`letters ${LETTERS.length} for ${albums.length} albums`);
for (const [index, title] of Object.entries(CHECK)) {
  if (albums[index][1] !== title) throw new Error(`album ${index} is "${albums[index][1]}", expected "${title}"`);
}
const kinds = {};
const tally = {};
albums.forEach((album, index) => {
  const kind = NAMES[LETTERS[index]];
  kinds[album[0]] = kind;
  tally[kind] = (tally[kind] ?? 0) + 1;
});
writeFileSync("world/kinds.json", `${JSON.stringify({ note: "Album id to kind of music. A first sorting by Claude, for Dan to correct.", kinds }, null, 1)}\n`);
console.log(tally);
