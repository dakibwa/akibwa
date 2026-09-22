// Music identity comes from the catalogue, never a potentially shared title.
export const tasteItemKey = (item) =>
  item.kind === "music" ? item.id : JSON.stringify([item.title, item.creator]);
