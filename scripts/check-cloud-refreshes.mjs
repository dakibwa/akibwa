const refreshes = [
  ["Vitals", "https://akibwa-vitals-refresh.dakibwa.workers.dev/status"],
  ["Chorus", "https://akibwa-chorus-refresh.dakibwa.workers.dev/status"],
  ["Cover Collision", "https://akibwa-cover-collision-refresh.dakibwa.workers.dev/status"]
];

const rows = await Promise.all(
  refreshes.map(async ([name, url]) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();

      return {
        name,
        ok: Boolean(response.ok && data.ok),
        refreshedAt: data.refreshedAt || null,
        source: data.source || data.mode || null,
        summary: summarize(name, data),
        error: data.error || null
      };
    } catch (error) {
      return {
        name,
        ok: false,
        refreshedAt: null,
        source: null,
        summary: null,
        error: error instanceof Error ? error.message : "Could not read status"
      };
    }
  })
);

console.log(JSON.stringify(rows, null, 2));

function summarize(name, data) {
  if (name === "Vitals") {
    return {
      recovery: data.latest?.recovery || null,
      sleep: data.latest?.sleep || null,
      strain: data.latest?.strain || null
    };
  }

  if (name === "Chorus") {
    return {
      totalScrobbles: data.totalScrobbles || null,
      recentTracks: data.recentTracks || null,
      stravaSource: data.strava?.source || null,
      stravaPairedCount: data.strava?.pairedCount || null
    };
  }

  return {
    postCount: data.postCount || null,
    latestPost: data.latestPost || null,
    credentialsConfigured: Boolean(data.credentialsConfigured)
  };
}
