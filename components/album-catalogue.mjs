// The public album packet owns identity. Never infer edition merges or add
// Spotify's separate listening summary to these Last.fm track scrobbles.
export const validCount = (value) =>
  Number.isSafeInteger(value) && value >= 0 ? value : null;
export function safeLastfmUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.hostname === "www.last.fm" &&
      url.pathname.startsWith("/music/")
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function albumCatalogue(data) {
  const seen = new Set();
  return [
    ...data.sleeves.map((row) => ({ ...row, printed: true })),
    ...(data.played || []).map((row) => ({ ...row, printed: false })),
  ]
    .filter((row) => !row.duplicateOf && !seen.has(row.id) && seen.add(row.id))
    .map((row) => ({
      id: row.id,
      artist: row.artist || "",
      album: row.album || "Unidentified sleeve",
      year: row.year || null,
      printed: row.printed,
      plays: validCount(row.plays),
      lastfmUrl: safeLastfmUrl(row.lastfmUrl),
    }));
}
export function overlayPlays(catalogue, packet) {
  const plays = packet?.plays;
  if (!plays || typeof plays !== "object" || Array.isArray(plays))
    return catalogue;
  return catalogue.map((album) =>
    Object.hasOwn(plays, album.id) && validCount(plays[album.id]) !== null
      ? { ...album, plays: validCount(plays[album.id]) }
      : album,
  );
}

// A successful HTTP response is not proof that every count was refreshed.
// Undated, future, stale and wholly unmatched packets cannot replace a known
// snapshot or poison the session cache. Zero is a valid measured count.
export function acceptsAlbumPacket(
  packet,
  catalogue,
  baselineAt,
  now = Date.now(),
) {
  const date =
    typeof packet?.refreshedAt === "string"
      ? Date.parse(packet.refreshedAt)
      : NaN;
  const baseline = Date.parse(baselineAt);
  return (
    Number.isFinite(date) &&
    date <= now + 300000 &&
    (!Number.isFinite(baseline) || date >= baseline) &&
    !!packet.plays &&
    typeof packet.plays === "object" &&
    !Array.isArray(packet.plays) &&
    catalogue.some(
      (album) =>
        Object.hasOwn(packet.plays, album.id) &&
        validCount(packet.plays[album.id]) !== null,
    )
  );
}
export function albumSnapshot(
  catalogue,
  baselineAt,
  snapshots = [],
  now = Date.now(),
) {
  let rows = catalogue.map((album) => ({
    ...album,
    countOrigin: "saved",
    countAsOf: baselineAt,
  }));
  for (const { data, origin } of snapshots) {
    if (
      !["session", "network"].includes(origin) ||
      !acceptsAlbumPacket(data, catalogue, baselineAt, now)
    )
      continue;
    rows = rows.map((album) =>
      Object.hasOwn(data.plays, album.id) &&
      validCount(data.plays[album.id]) !== null &&
      (!Number.isFinite(Date.parse(album.countAsOf)) ||
        Date.parse(data.refreshedAt) >= Date.parse(album.countAsOf))
        ? {
            ...album,
            plays: data.plays[album.id],
            countOrigin: origin,
            countAsOf: data.refreshedAt,
          }
        : album,
    );
  }
  return rows;
}
export function snapshotCoverage(catalogue) {
  const counts = { saved: 0, session: 0, network: 0 };
  for (const album of catalogue) counts[album.countOrigin || "saved"]++;
  return counts;
}
export function browseAlbums(
  catalogue,
  { query = "", filter = "all", sort = "plays" } = {},
) {
  const needle = query.trim().toLocaleLowerCase("en");
  return catalogue
    .filter(
      (album) =>
        (!needle ||
          `${album.artist} ${album.album} ${album.year || ""}`
            .toLocaleLowerCase("en")
            .includes(needle)) &&
        (filter !== "printed" || album.printed) &&
        (filter !== "recorded" || album.plays > 0),
    )
    .sort(
      (a, b) =>
        (sort === "plays"
          ? (b.plays ?? -1) - (a.plays ?? -1)
          : sort === "year"
            ? Number(b.year || 0) - Number(a.year || 0)
            : 0) ||
        a.artist.localeCompare(b.artist, "en") ||
        a.album.localeCompare(b.album, "en"),
    );
}
