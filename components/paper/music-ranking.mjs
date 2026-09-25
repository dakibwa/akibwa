// The compact public music file (public/music-ranking.json) as plain records:
// the top 1,000 songs and the top 100 albums, each album with the tracks Dan
// played from it, most played first. Minutes are Spotify playback time.
export function unpackRanking(packet) {
  const songs = packet.songs.map(([title, artist, plays, youtube, art, minutes], index) => ({
    rank: index + 1,
    title,
    artist: packet.names[artist],
    plays,
    youtube,
    art,
    minutes
  }));
  const albums = (packet.albums ?? []).map(([id, title, artist, year, plays, minutes, tracks], index) => ({
    rank: index + 1,
    id,
    title,
    artist: packet.names[artist],
    year,
    plays,
    minutes,
    tracks: tracks?.map(([name, trackPlays, trackMinutes]) => ({ title: name, plays: trackPlays, minutes: trackMinutes })) ?? null
  }));
  return { asOf: packet.asOf, counts: packet.counts, hours: packet.hours, songs, albums };
}

// Case- and accent-insensitive words, for search.
export const fold = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
