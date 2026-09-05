// Music identity comes from the catalogue, never a potentially shared title.
export const tasteItemKey = (item) =>
  item.kind === "music" ? item.id : JSON.stringify([item.title, item.creator]);
export const tasteItemHash = (item) =>
  `#taste-item=${item.kind}:${encodeURIComponent(tasteItemKey(item))}`;
export function resolveTasteItem(hash, albumPreview, curation) {
  const match = hash.match(
    /^#taste-item=(music|films|games|tv|podcasts):(.+)$/,
  );
  if (!match) return null;
  let key;
  try {
    key = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  const kind = match[1];
  const items =
    kind === "music"
      ? albumPreview.map((album) => ({
          ...album,
          title: album.album,
          creator: album.artist,
          kind,
        }))
      : (curation[kind] || []).map((item) => ({ ...item, kind }));
  return items.find((item) => tasteItemKey(item) === key) || null;
}
