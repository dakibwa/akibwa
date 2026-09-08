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
  let lastResponse = "no response";
  let lastRequestError = null;

  while (performance.now() < deadline) {
    attempts++;
    try {
      const response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(Math.max(1, Math.ceil(Math.min(15000, deadline - performance.now())))),
      });
      if (response.status === 200) {
        const actual = createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex");
        lastResponse = `HTTP 200, SHA256 ${actual}`;
        lastRequestError = null;
        if (actual === expectedHash) {
          if (attempts > 1) log(`Export ready at ${target.origin} after ${attempts} checks.`);
          return;
        }
      } else {
        lastResponse = `HTTP ${response.status}`;
        lastRequestError = null;
        await response.body?.cancel();
      }
    } catch (error) {
      // A request aborted at the deadline must not erase the previous
      // completed response, especially its wrong-artifact hash or HTTP status.
      lastRequestError = error.name;
    }
    if (attempts === 1) log(`Waiting up to ${timeoutMs / 1000}s for the deployed export at ${target.origin}.`);
    const remaining = deadline - performance.now();
    if (remaining > 0) await delay(Math.min(intervalMs, remaining));
  }

  throw new Error(`Export did not become ready at ${target.origin} within ${timeoutMs}ms: expected SHA256 ${expectedHash}; last response ${lastResponse}${lastRequestError ? `; latest request ${lastRequestError}` : ""}`);
}
