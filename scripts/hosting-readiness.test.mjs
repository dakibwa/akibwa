import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import { waitForHostedExport } from "./hosting-readiness.mjs";

const hash = (body) => createHash("sha256").update(body).digest("hex");
const expected = "<html>this deployment</html>";
const quiet = () => {};
const deadlineOptions = { timeoutMs: 500, intervalMs: 20, log: quiet };

async function fixture(respond, run) {
  const server = createServer(respond);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test("waits through the previous deployment and returns when exact new bytes arrive", async () => {
  const paths = [];
  await fixture((request, response) => {
    paths.push(request.url);
    response.end(paths.length < 3 ? "<html>previous deployment</html>" : expected);
  }, async (origin) => {
    await waitForHostedExport(origin, hash(expected), { timeoutMs: 1000, intervalMs: 10, log: quiet });
    assert.deepEqual(paths, ["/", "/", "/"], "readiness must check the real canonical URL");
  });
});

test("a permanently wrong artifact fails at the deadline with expected and actual hashes", async () => {
  const wrong = "<html>wrong deployment</html>";
  let requests = 0;
  await fixture((_request, response) => {
    requests++;
    response.end(wrong);
  }, async (origin) => {
    await assert.rejects(waitForHostedExport(origin, hash(expected), deadlineOptions), (error) => {
      assert.match(error.message, /did not become ready/);
      assert.ok(error.message.includes(hash(expected)));
      assert.ok(error.message.includes(hash(wrong)));
      return true;
    });
    assert.ok(requests > 1, "a wrong artifact is retried only within the readiness window");
  });
});

test("matching bytes with a failure status never count as the deployed page", async () => {
  let requests = 0;
  await fixture((_request, response) => {
    requests++;
    response.writeHead(503);
    response.end(expected);
  }, async (origin) => {
    await assert.rejects(waitForHostedExport(origin, hash(expected), deadlineOptions), /did not become ready/);
    assert.ok(requests > 0, "the server returned matching bytes with HTTP 503");
  });
});

test("a later stalled request preserves the completed wrong-artifact diagnostic", async () => {
  const wrong = "<html>previous deployment</html>";
  let requests = 0;
  await fixture((_request, response) => {
    if (++requests === 1) response.end(wrong);
    // The following request deliberately stalls through the deadline.
  }, async (origin) => {
    await assert.rejects(waitForHostedExport(origin, hash(expected), deadlineOptions), (error) => {
      assert.match(error.message, /did not become ready/);
      assert.ok(error.message.includes(`last response HTTP 200, SHA256 ${hash(wrong)}`));
      return true;
    });
    assert.ok(requests > 1, "the timeout followed a completed wrong-artifact response");
  });
});

test("a stalled response cannot extend the readiness deadline by a request timeout", async () => {
  await fixture(() => {}, async (origin) => {
    const start = performance.now();
    await assert.rejects(waitForHostedExport(origin, hash(expected), deadlineOptions), /did not become ready/);
    assert.ok(performance.now() - start < 2000, "a stalled request must use the remaining readiness budget");
  });
});
