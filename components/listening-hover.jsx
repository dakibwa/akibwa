import { listeningLabel } from "./listening-label.mjs";

export function listeningDescription(item) {
  const count = listeningLabel(item);
  return count ? `${count.value} ${count.label}. ${count.explanation}` : "";
}
