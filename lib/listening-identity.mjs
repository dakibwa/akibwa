import { stripEdition } from "./album-key.mjs";

export const normalizeListeningText = (value) => String(value || "")
  .normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en")
  .replace(/&/g, " and ").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export const albumIdentity = (artist, album) =>
  `${normalizeListeningText(artist)}::${normalizeListeningText(stripEdition(album))}`;
export const songIdentity = (artist, track) =>
  `${normalizeListeningText(artist)}::${normalizeListeningText(track)}`;
