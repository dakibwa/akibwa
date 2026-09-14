// Artwork has its own reviewed overlay: extending the listening history must
// not discard verified covers or recalculate counts while repairing a sleeve.
export function applyListeningArtwork(albums, manifest) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.entries))
    throw Error("Invalid listening artwork manifest");
  const rows = new Map(albums.map((row) => [row.id, row]));
  const verified = new Set();
  for (const entry of manifest.entries) {
    const row = rows.get(entry.id);
    if (!row || row.artist !== entry.artist || row.album !== entry.album)
      throw Error(`Artwork identity changed: ${entry.id}`);
    if (verified.has(entry.id)) throw Error(`Duplicate artwork: ${entry.id}`);
    verified.add(entry.id);
  }
  return albums.map((row) => verified.has(row.id) ? { ...row, artwork: true } : row);
}
