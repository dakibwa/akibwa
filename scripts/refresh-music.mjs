/*
 * Rebuilds the Music room from the private listening history in one go (Dan,
 * 26 September 2026): the listening catalogue, the ranking and its hours by
 * year, the search's genres and years, the large sleeves, and each album's
 * links and cover check, then checks the lot. The history's location is
 * private, so it comes from the command line or AKIBWA_HISTORY_ROOT, never
 * from this repository.
 *
 *   npm run music:refresh -- --history-root PRIVATE_HISTORY_DIRECTORY
 *
 * New listening reaches the room only once the history has it: Spotify and
 * YouTube deliver their histories as exports (docs/listening-history.md). A
 * sleeve the cover check cannot settle stops the refresh until it has been
 * looked at; then run npm run publish:ready before committing.
 */
import { spawnSync } from "node:child_process";

const at = process.argv.indexOf("--history-root");
const history = at > -1 ? process.argv[at + 1] : process.env.AKIBWA_HISTORY_ROOT;
if (!history || history.startsWith("--")) {
  throw Error("Usage: npm run music:refresh -- --history-root PRIVATE_HISTORY_DIRECTORY (or set AKIBWA_HISTORY_ROOT)");
}

const steps = [
  ["scripts/build-listening-counts.mjs", "--history-root", history],
  ["scripts/build-music-ranking.mjs", "--history-root", history],
  ["scripts/build-music-meta.mjs"],
  ["scripts/build-music-art.mjs"],
  ["scripts/build-music-sources.mjs"],
  ["scripts/check-music-room-data.mjs"]
];
for (const [script, ...args] of steps) {
  console.log(`\n→ ${script}`);
  const run = spawnSync(process.execPath, [script, ...args], { stdio: "inherit", cwd: new URL("../", import.meta.url).pathname });
  if (run.status !== 0) process.exit(run.status ?? 1);
}
console.log("\nThe Music room is rebuilt. Run npm run publish:ready before committing.");
