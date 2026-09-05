const safeCount = (value) => value === null || Number.isSafeInteger(value) && value >= 0;
const albumFields = new Set(["id", "artist", "album", "year", "printed", "artwork", "plays", "atLeast", "sources"]);
export function acceptsListeningCatalogue(packet, baselineAt, knownCatalogue = []) {
  const ids = new Set(Array.isArray(packet?.albums) ? packet.albums.map((album) => album?.id) : []);
  return packet?.schemaVersion === 1 && typeof packet.asOf === "string" &&
    Number.isFinite(Date.parse(packet.asOf)) && Date.parse(packet.asOf) >= Date.parse(baselineAt) &&
    Date.parse(packet.asOf) <= Date.now() + 300000 &&
    Array.isArray(packet.albums) && packet.albums.length > 0 &&
    ids.size === packet.albums.length &&
    knownCatalogue.every((known) => ids.has(known.id)) &&
    packet.albums.every((album) =>
      album && Object.keys(album).every((key) => albumFields.has(key)) &&
      typeof album.id === "string" && /^[\w-]+$/.test(album.id) &&
      typeof album.artist === "string" && typeof album.album === "string" &&
      typeof album.artwork === "boolean" && typeof album.printed === "boolean" &&
      typeof album.atLeast === "boolean" && safeCount(album.plays) &&
      album.sources && Object.keys(album.sources).length === 3 &&
      ["spotify", "youtube", "lastfm"].every((source) => Number.isSafeInteger(album.sources[source]) && album.sources[source] >= 0),
    );
}

// Render the opening shelf and printed curation immediately. Fetch the whole
// available catalogue separately, rather than serializing 13,000 albums into
// the homepage before a visitor opens Music.
export function listeningSeed(packet, curatedIds) {
  const wanted = new Set([...curatedIds, ...packet.albums.slice(0, 72).map((album) => album.id)]);
  return packet.albums.filter((album) => wanted.has(album.id));
}
