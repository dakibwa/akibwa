const number = (value) => value.toLocaleString("en-GB");
export function listeningLabel(item) {
  if (!["music", "podcasts"].includes(item.kind)) return null;
  const known = Number.isSafeInteger(item.plays) && item.plays >= 0;
  return {
    value: known ? `${number(item.plays)}${item.atLeast ? "+" : ""}` : "—",
    label: !known ? "No recorded count" : item.kind === "music" ? `track play${item.plays === 1 ? "" : "s"}` : item.sources?.youtube > 0 ? "plays & views" : `recorded play${item.plays === 1 ? "" : "s"}`,
    explanation: `${item.atLeast ? "At least this many recorded plays; some records cannot be reconciled exactly. " : ""}${item.kind === "music" ? "Track records, not complete album listens." : "Recorded starts and show views, including clips, not completed episodes."}`,
  };
}

export const rankPodcasts = (items) => [...items].sort((a, b) =>
  (b.plays ?? -1) - (a.plays ?? -1) || a.title.localeCompare(b.title, "en"),
);
