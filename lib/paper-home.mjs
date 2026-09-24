/*
 * Build-time shaping for the paper homepage. app/page.jsx calls these during
 * the static export; only their small results reach the browser.
 */
import { unpackRanking } from "../components/paper/music-ranking.mjs";

// The Taste Library's seed from the song ranking: enough songs for the wall
// and the first screen of the Songs shelf, and all hundred artists. The full
// thousand load from public/music-ranking.json when a visitor asks for them.
export function musicSeed(packet, songs = 60) {
  const full = unpackRanking(packet);
  return { songs: full.songs.slice(0, songs), artists: full.artists };
}
