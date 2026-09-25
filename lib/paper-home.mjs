/*
 * Build-time shaping for the paper homepage. app/page.jsx calls these during
 * the static export; only their small results reach the browser.
 */
import { unpackRanking } from "../components/paper/music-ranking.mjs";

// The Music room's seed: every album without its tracks and the first hundred
// songs, so both mosaics draw at once. Track lists and the other 900 songs
// load from public/music-ranking.json when a visitor opens the room.
export function musicSeed(packet, songs = 100) {
  const full = unpackRanking(packet);
  return {
    asOf: full.asOf,
    // The songs with the most hours, which the room draws first.
    songs: [...full.songs].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank).slice(0, songs),
    albums: full.albums.map(({ tracks, ...album }) => ({ ...album, tracks: null }))
  };
}
