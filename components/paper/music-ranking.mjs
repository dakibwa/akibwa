// The compact public ranking (public/music-ranking.json) as plain records.
export function unpackRanking(packet) {
  const songs = packet.songs.map(([title, artist, plays, youtube, art], index) => ({
    rank: index + 1,
    title,
    artist: packet.names[artist],
    plays,
    youtube,
    art
  }));
  const artists = packet.artists.map(([name, plays, youtube, top, art], index) => ({
    rank: index + 1,
    name: packet.names[name],
    plays,
    youtube,
    top,
    art
  }));
  return { asOf: packet.asOf, counts: packet.counts, songs, artists };
}

// Case- and accent-insensitive words, for search.
export const fold = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
