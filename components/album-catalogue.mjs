// The Music shelf lists the public catalogue by recorded plays, most first.
// Unknown counts sort last; ties fall back to artist, then album.
export function browseAlbums(catalogue) {
  return [...catalogue].sort(
    (a, b) =>
      (b.plays ?? -1) - (a.plays ?? -1) ||
      a.artist.localeCompare(b.artist, "en") ||
      a.album.localeCompare(b.album, "en"),
  );
}
