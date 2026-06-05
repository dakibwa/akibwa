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
      const degraded = isDegradedRefresh(name, data);

      return {
        name,
        ok: Boolean(response.ok && data.ok && !degraded),
        refreshedAt: data.refreshedAt || null,
        source: data.source || data.mode || null,
        degraded,
        summary: summarize(name, data),
        error: data.error || (degraded ? "Refresh is serving fallback seed data instead of live source data." : null)
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

if (rows.some((row) => !row.ok)) {
  process.exitCode = 1;
}

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

function isDegradedRefresh(name, data) {
  if (name !== "Cover Collision") return false;

  const source = String(data.source || "").toLowerCase();
  return source.includes("seed") || (source.includes("fallback") && !source.includes("public-profile"));
}
