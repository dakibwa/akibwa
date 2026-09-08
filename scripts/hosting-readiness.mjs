import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// Wrangler can finish before an edge starts serving the new asset version.
// Wait only for that version marker; the caller still checks every response
// and security policy once, without retrying or weakening failed assertions.
export async function waitForHostedExport(origin, expectedHash, {
  timeoutMs = 60000,
  intervalMs = 2000,
  log = console.log,
} = {}) {
  const target = new URL("/", origin);
  const deadline = performance.now() + timeoutMs;
  let attempts = 0;
  let last = "no response";

  while (performance.now() < deadline) {
    attempts++;
    try {
      const response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(Math.max(1, Math.ceil(Math.min(15000, deadline - performance.now())))),
      });
      last = `HTTP ${response.status}`;
      if (response.status === 200) {
        const actual = createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
        last += `, SHA256 ${actual}`;
        if (actual === expectedHash) {
          if (attempts > 1) log(`Export ready at ${target.origin} after ${attempts} checks.`);
          return;
        }
      } else {
        await response.body?.cancel();
      }
    } catch (error) {
      last = error.name;
    }
    if (attempts === 1) log(`Waiting up to ${timeoutMs / 1000}s for the deployed export at ${target.origin}.`);
    const remaining = deadline - performance.now();
    if (remaining > 0) await delay(Math.min(intervalMs, remaining));
  }

  throw new Error(`Export did not become ready at ${target.origin} within ${timeoutMs}ms: expected SHA256 ${expectedHash}; last response ${last}`);
}
