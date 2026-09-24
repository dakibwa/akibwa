// Music identity comes from the catalogue, never a potentially shared title;
// songs and artists are keyed by their place in the ranking.
export const tasteItemKey = (item) =>
  ["music", "songs", "artists"].includes(item.kind) ? item.id : JSON.stringify([item.title, item.creator]);
