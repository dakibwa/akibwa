// The compact public music file (public/music-ranking.json) as plain records:
// the top 1,000 songs and the top 100 albums, each album with the tracks Dan
// played from it, most played first. Minutes are Spotify playback time.
export function unpackRanking(packet) {
  // A successful HTTP response may still be incomplete or use another schema.
  // Reject it before replacing the usable album/song seed in the room.
  const text = (value) => typeof value === "string" && value.trim().length > 0;
  const count = (value) => Number.isFinite(value) && value >= 0;
  const artist = (value) => Number.isInteger(value) && text(packet.names[value]);
  const song = (row) => Array.isArray(row) && text(row[0]) && artist(row[1]) && count(row[2]) && count(row[3]) && (row[4] === null || text(row[4])) && count(row[5]);
  const track = (row) => Array.isArray(row) && text(row[0]) && count(row[1]) && count(row[2]);
  const album = (row) => Array.isArray(row) && text(row[0]) && text(row[1]) && artist(row[2]) && (row[3] === null || typeof row[3] === "string") && count(row[4]) && count(row[5]) && Array.isArray(row[6]) && row[6].every(track);
  if (packet?.schemaVersion !== 2 || !Array.isArray(packet.names) || !packet.names.length || !packet.names.every(text)
    || !Array.isArray(packet.songs) || !packet.songs.length || !packet.songs.every(song)
    || !Array.isArray(packet.albums) || !packet.albums.length || !packet.albums.every(album)) {
    throw new Error("The music ranking is incomplete or unsupported.");
  }
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
