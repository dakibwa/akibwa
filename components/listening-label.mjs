const number = (value) => value.toLocaleString("en-GB");
const explanations = {
  music: "Track records, not complete album listens.",
  podcasts: "Recorded starts and show views, including clips, not completed episodes.",
  songs: "Spotify plays of at least 30 seconds plus identified YouTube watches.",
  artists: "Every one of their songs, Spotify plays of at least 30 seconds plus identified YouTube watches.",
};
export function listeningLabel(item) {
  if (!["music", "podcasts", "songs", "artists"].includes(item.kind)) return null;
  const known = Number.isSafeInteger(item.plays) && item.plays >= 0;
  return {
    value: known ? `${number(item.plays)}${item.atLeast ? "+" : ""}` : "—",
    label: known ? "plays" : "No recorded count",
    explanation: `${item.atLeast ? "At least this many recorded plays; some records cannot be reconciled exactly. " : ""}${explanations[item.kind]}`,
  };
}

export const rankPodcasts = (items) => [...items].sort((a, b) =>
  (b.plays ?? -1) - (a.plays ?? -1) || a.title.localeCompare(b.title, "en"),
);
