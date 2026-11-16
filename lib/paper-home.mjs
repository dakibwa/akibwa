/*
 * Build-time shaping for the paper homepage. app/page.jsx calls these during
 * the static export; only their small results reach the browser.
 */
import { unpackRanking } from "../components/paper/music-ranking.mjs";

// The shelf's seed: every album without its tracks and every song, so the
// merged shelf draws whole at once. Track lists load from
// public/music-ranking.json once the page opens.
export function musicSeed(packet, songs = 1000) {
  const full = unpackRanking(packet);
  return {
    asOf: full.asOf,
    // The songs with the most hours, which the room draws first.
    songs: [...full.songs].sort((a, b) => b.minutes - a.minutes || a.rank - b.rank).slice(0, songs),
    albums: full.albums.map(({ tracks, ...album }) => ({ ...album, tracks: null }))
  };
}
