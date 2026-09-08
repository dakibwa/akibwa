import assert from "node:assert/strict";
import test from "node:test";
import { assertRobotsBytes } from "./hosting-robots.mjs";

const authored = Buffer.from("User-Agent: *\nAllow: /\n\nSitemap: https://akibwa.com/sitemap.xml\n");
const managed = "# BEGIN Cloudflare Managed content\n\nUser-agent: *\nContent-Signal: search=yes,ai-train=no,use=reference\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\n# END Cloudflare Managed Content\n";
const prefixed = (prefix = managed, suffix = authored) => Buffer.concat([Buffer.from(prefix), Buffer.from(suffix)]);

test("exact authored bytes pass without a managed-content exception", () => {
  assertRobotsBytes(authored, authored);
});

test("public robots allows the bounded managed block and optional comment-only policy preface", () => {
  for (const prefix of [managed, `# Content Signals policy notice\n\n${managed}\n`]) {
    assertRobotsBytes(prefixed(prefix), authored, { managed: true });
  }
});

test("preview robots remains an exact whole-file check", () => {
  assert.throws(() => assertRobotsBytes(prefixed(), authored), /exact exported bytes/);
});

test("altered, missing, appended or replaced authored bytes are rejected", () => {
  for (const actual of [
    Buffer.from(managed),
    prefixed(managed, authored.toString().replace("Allow: /", "Disallow: /")),
    prefixed(managed, authored.toString() + "Disallow: /private\n"),
    prefixed(managed, authored.toString().replace("akibwa.com", "example.com")),
  ]) assert.throws(() => assertRobotsBytes(actual, authored, { managed: true }), /exact authored file/);
});

test("only one anchored managed block may precede the authored bytes", () => {
  for (const prefix of [
    "User-agent: *\nDisallow: /\n",
    managed.replace("# BEGIN Cloudflare Managed content\n", ""),
    managed.replace("# END Cloudflare Managed Content\n", ""),
    "User-agent: *\nDisallow: /\n" + managed,
    managed + "User-agent: *\nDisallow: /\n",
    managed + authored.toString(),
    managed + managed,
    managed.replace("Allow: /", "Sitemap: https://example.com/sitemap.xml"),
    managed.replace("User-agent: *", "User-agent: OtherBot"),
    managed.replace(/^Content-Signal:.*\n/m, ""),
  ]) assert.throws(() => assertRobotsBytes(prefixed(prefix), authored, { managed: true }));
});
