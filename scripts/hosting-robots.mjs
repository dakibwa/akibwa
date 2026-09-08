import assert from "node:assert/strict";

// Cloudflare prepends this zone-managed block to an existing robots.txt:
// https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/
// The authored file must remain byte-for-byte intact at the very end.
export function assertRobotsBytes(actual, expected, { managed = false } = {}) {
  if (actual.equals(expected)) return;
  assert.ok(managed, "robots.txt must serve the exact exported bytes");
  assert.ok(expected.length > 0 && actual.length > expected.length
    && actual.subarray(-expected.length).equals(expected),
  "robots.txt must end with the exact authored file, without additions or replacements");

  const prefix = actual.subarray(0, -expected.length).toString("utf8");
  const block = prefix.match(/^(?:#[^\r\n]*\r?\n|\r?\n)*# BEGIN Cloudflare Managed content\r?\n([\s\S]+)# END Cloudflare Managed Content\r?\n(?:\r?\n)?$/);
  assert.ok(block, "robots.txt may prepend only the anchored Cloudflare managed block and comment preface");
  assert.equal((prefix.match(/# (?:BEGIN|END) Cloudflare Managed [Cc]ontent/g) || []).length, 2,
    "robots.txt must have exactly one Cloudflare managed block");
  assert.ok(block[1].split(/\r?\n/).every((line) => /^(?:\s*|#.*|(?:User-agent|Content-signal|Allow|Disallow):[^\r\n]+)$/i.test(line)),
    "Cloudflare managed robots contains an unexpected directive");
  assert.match(block[1], /^User-agent:\s*\*\s*$/mi, "Cloudflare managed robots must identify its default crawler group");
  assert.match(block[1], /^Content-signal:[^\r\n]+$/mi, "Cloudflare managed robots must contain its content signals");
}
