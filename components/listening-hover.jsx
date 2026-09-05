import { listeningLabel } from "./listening-label.mjs";

export function listeningDescription(item) {
  const count = listeningLabel(item);
  return count ? `${count.value} ${count.label}. ${count.explanation}` : "";
}

export function ListeningHover({ item }) {
  const count = listeningLabel(item);
  if (!count) return null;
  return (
    <span className="listening-hover" aria-hidden="true">
      <strong>{count.value}</strong>
      <span>{count.label}</span>
    </span>
  );
}
