// The compact public music file (public/music-ranking.json) as plain records:
// the top 1,000 songs, the top 150 albums, the other albums and the singles
// Dan played for three hours or more, each with the tracks he played from it,
// most played first. Minutes are Spotify playback time.
export function unpackRanking(packet) {
  // A successful HTTP response may still be incomplete or use another schema.
  // Reject it before replacing the usable album/song seed in the room.
  const text = (value) => typeof value === "string" && value.trim().length > 0;
  const count = (value) => Number.isFinite(value) && value >= 0;
  const artist = (value) => Number.isInteger(value) && text(packet.names[value]);
  const song = (row) => Array.isArray(row) && text(row[0]) && artist(row[1]) && count(row[2]) && count(row[3]) && (row[4] === null || text(row[4])) && count(row[5]);
  const track = (row) => Array.isArray(row) && text(row[0]) && count(row[1]) && count(row[2]);
  const album = (row) => Array.isArray(row) && text(row[0]) && text(row[1]) && artist(row[2]) && (row[3] === null || typeof row[3] === "string") && count(row[4]) && count(row[5]) && Array.isArray(row[6]) && row[6].every(track);
  // Other albums and singles add their cover's id, or null when none is published.
  const other = (row) => album(row) && (row.length === 7 || row[7] === null || text(row[7]));
  if (packet?.schemaVersion !== 2 || !Array.isArray(packet.names) || !packet.names.length || !packet.names.every(text)
    || !Array.isArray(packet.songs) || !packet.songs.length || !packet.songs.every(song)
    || !Array.isArray(packet.albums) || !packet.albums.length || !packet.albums.every(album)
    || !Array.isArray(packet.sleeves) || !packet.sleeves.every(other)
    || (packet.singles !== undefined && (!Array.isArray(packet.singles) || !packet.singles.every(other)))) {
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
  const record = ([id, title, artist, year, plays, minutes, tracks, art], index) => ({
    rank: index + 1,
    id,
    art: art === undefined ? id : art,
    title,
    artist: packet.names[artist],
    year,
    plays,
    minutes,
    tracks: tracks?.map(([name, trackPlays, trackMinutes]) => ({ title: name, plays: trackPlays, minutes: trackMinutes })) ?? null
  });
  const albums = packet.albums.map(record);
  // The other albums of three hours or more, and the singles: records that
  // are over 90% one song (18 November 2026).
  const sleeves = packet.sleeves.map(record);
  const singles = (packet.singles ?? []).map(record);
  return { asOf: packet.asOf, counts: packet.counts, hours: packet.hours, songs, albums, sleeves, singles };
}

// Case- and accent-insensitive words, for search.
export const fold = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
