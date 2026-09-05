const number = (value) => value.toLocaleString("en-GB");
export function listeningLabel(item) {
  if (item.kind === "music") {
    const date = new Date(item.countAsOf);
    const asOf = Number.isFinite(date.getTime())
      ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
      : "saved snapshot";
    return {
      value: item.plays === null ? "—" : number(item.plays),
      label: item.plays === null ? "No matched count" : `track listen${item.plays === 1 ? "" : "s"}`,
      source: `Last.fm · ${asOf}`,
      explanation: "Recorded track scrobbles, not complete album listens.",
    };
  }
  if (item.kind !== "podcasts") return null;
  if (item.listens === null) {
    return {
      value: item.appleEpisodes ? number(item.appleEpisodes) : "—",
      label: item.appleEpisodes ? `episode${item.appleEpisodes === 1 ? "" : "s"} recorded` : "No recorded count",
      source: item.appleEpisodes ? "Apple Podcasts · 2023–25" : "Available history",
      explanation: "Apple episode records are separate from Spotify playback starts.",
    };
  }
  return {
    value: number(item.listens),
    label: `listen${item.listens === 1 ? "" : "s"}`,
    source: "Spotify · 30+ seconds",
    extra: item.appleEpisodes ? `Apple: ${number(item.appleEpisodes)} episode${item.appleEpisodes === 1 ? "" : "s"}` : null,
    explanation: "Spotify starts lasting at least 30 seconds, not completed episodes. Partial history through August 2026.",
  };
}

export const rankPodcasts = (items) => [...items].sort((a, b) =>
  (b.listens ?? -1) - (a.listens ?? -1) ||
  b.appleEpisodes - a.appleEpisodes || a.title.localeCompare(b.title, "en"),
);
