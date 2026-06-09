import { readFileSync } from "node:fs";

const surfaceConfig = JSON.parse(readFileSync(new URL("../data/public-surfaces.json", import.meta.url), "utf8"));
const refreshes = surfaceConfig.surfaces
  .filter((surface) => surface.refresh?.statusUrl)
  .map((surface) => ({
    id: surface.id,
    name: surface.title,
    url: surface.refresh.statusUrl,
    worker: surface.refresh.worker,
    route: surface.route
  }));

const rows = await Promise.all(
  refreshes.map(async ({ id, name, url, worker, route }) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      const degraded = isDegradedRefresh(id, data);

      return {
        id,
        name,
        worker,
        route,
        ok: Boolean(response.ok && data.ok && !degraded),
        refreshedAt: data.refreshedAt || null,
        source: data.source || data.mode || null,
        degraded,
        summary: summarize(id, data),
        error: data.error || (degraded ? "Refresh is serving fallback seed data instead of live source data." : null)
      };
    } catch (error) {
      return {
        id,
        name,
        worker,
        route,
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

function summarize(id, data) {
  if (id === "vitals") {
    return {
      recovery: data.latest?.recovery || null,
      sleep: data.latest?.sleep || null,
      strain: data.latest?.strain || null
    };
  }

  if (id === "chorus") {
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

function isDegradedRefresh(id, data) {
  if (id !== "cover-collision") return false;

  const source = String(data.source || "").toLowerCase();
  return source.includes("seed") || (source.includes("fallback") && !source.includes("public-profile"));
}
