import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import test from "node:test";
import { waitForHostedExport } from "./hosting-readiness.mjs";

const hash = (body) => createHash("sha256").update(body).digest("hex");
const expected = "<html>this deployment</html>";
const quiet = () => {};
const deadlineOptions = { timeoutMs: 500, intervalMs: 20, log: quiet };
const runNode = promisify(execFile);

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
    const ready = await waitForHostedExport(origin, hash(expected), { timeoutMs: 1000, intervalMs: 10, log: quiet });
    assert.deepEqual(paths, ["/", "/", "/"], "readiness must check the real canonical URL");
    assert.equal(ready.body.toString(), expected, "callers can verify the ready response without refetching another edge version");
    assert.equal(ready.response.status, 200);
  });
});

test("Features hosting validates the matched document without fetching a different edge version", async (t) => {
  const scratch=await mkdtemp(join(tmpdir(),"features-hosting-"));
  t.after(()=>rm(scratch,{recursive:true,force:true}));
  await mkdir(join(scratch,"scripts"));await mkdir(join(scratch,"out/features"),{recursive:true});
  for(const name of ["check-features-hosting.mjs","hosting-readiness.mjs"])
    await copyFile(new URL(name,import.meta.url),join(scratch,"scripts",name));
  const files={"index.html":expected,"manifest.webmanifest":"{}","og.png":"fixture image",
    "icon-192.png":"fixture icon","icon-512-maskable.png":"fixture maskable icon"};
  for(const [name,body] of Object.entries(files))await writeFile(join(scratch,"out/features",name),body);
  let documents=0;
  await fixture((request,response)=>{
    const path=new URL(request.url,"http://fixture.test").pathname;
    response.setHeader("x-content-type-options","nosniff");
    response.setHeader("x-frame-options","SAMEORIGIN");
    response.setHeader("cache-control","public, max-age=0, must-revalidate");
    if(path==="/"){
      response.setHeader("content-encoding","gzip");
      response.end(gzipSync(++documents===1?expected:"<html>previous deployment</html>"));
    }else if(["/features","/features/","/features/index.html"].includes(path)){
      response.writeHead(301,{location:"/?signin=ok"});response.end();
    }else if(path==="/features/api/health"){
      response.setHeader("cache-control","no-store");response.end(JSON.stringify({ok:true}));
    }else if(Object.hasOwn(files,path.slice(1)))response.end(files[path.slice(1)]);
    else{response.statusCode=404;response.end()}
  },async origin=>{
    const {stdout}=await runNode(process.execPath,[join(scratch,"scripts/check-features-hosting.mjs"),origin],{timeout:10000});
    assert.match(stdout,/Features hosting verified/);
    assert.equal(documents,1,"the checked document is the exact response that passed readiness");
  });
});

test("readiness uses the caller's document request headers", async () => {
  await fixture((request,response)=>{
    response.end(request.headers["user-agent"]==="hosting-fixture"?expected:"other variant");
  },async origin=>{
    const ready=await waitForHostedExport(origin,hash(expected),{
      ...deadlineOptions,requestHeaders:{"user-agent":"hosting-fixture"},
    });
    assert.equal(ready.body.toString(),expected);
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

test("unchanged game bytes wait for the new header policy at the game path", async () => {
  const paths = [];
  const policy = "public, max-age=0, must-revalidate, no-transform";
  await fixture((request, response) => {
    paths.push(request.url);
    response.setHeader("cache-control", paths.length < 3 ? "public, max-age=0, must-revalidate" : policy);
    response.end(expected);
  }, async (origin) => {
    await waitForHostedExport(origin, hash(expected), {
      ...deadlineOptions, path: "/features/", expectedHeaders: {"cache-control": policy},
    });
    assert.deepEqual(paths, ["/features/", "/features/", "/features/"]);
  });
});

test("matching game bytes with a permanently old header policy fail at the deadline", async () => {
  await fixture((_request, response) => {
    response.setHeader("cache-control", "public, max-age=0, must-revalidate");
    response.end(expected);
  }, async (origin) => {
    await assert.rejects(waitForHostedExport(origin, hash(expected), {
      ...deadlineOptions,
      expectedHeaders: {"cache-control": "public, max-age=0, must-revalidate, no-transform"},
    }), /headers cache-control=public, max-age=0, must-revalidate/);
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
