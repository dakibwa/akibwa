// Give each cover a new URL only when one of its actual image files changes.
// The original paths stay available for older pages and artwork checks.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const source = join(process.cwd(), "public", "album-art");

export function sleeveVersionLookup(output) {
  const files = new Map();
  for (const name of readdirSync(source).sort()) {
    const id = name.match(/^(.+)-(?:wall|large)\.(?:avif|webp)$/)?.[1];
    if (!id) continue;
    if (!files.has(id)) files.set(id, []);
    files.get(id).push(name);
  }
  const versions = new Map();
  return id => {
    if (!files.has(id)) return "";
    if (versions.has(id)) return versions.get(id);
    const names = files.get(id);
    const hash = createHash("sha256");
    for (const name of names) hash.update(name).update(readFileSync(join(source, name)));
    const version = hash.digest("hex").slice(0, 16);
    versions.set(id, version);
    if (output) {
      const dir = join(output, version);
      mkdirSync(dir, { recursive: true });
      for (const name of names) copyFileSync(join(source, name), join(dir, name));
    }
    return version;
  };
}
