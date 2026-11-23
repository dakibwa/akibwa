// Prepare the client catalogue before Next bundles it. It then has a hashed
// cacheable URL and does not have to travel inside the HTML on every visit.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileCatalogue } from "../lib/paper-home.mjs";
import { sleeveVersionLookup } from "../lib/sleeve-assets.mjs";

const output = ".shelf-build";
const art = join(output, "sleeves");
const dev = process.argv.includes("--dev");
mkdirSync(output, { recursive: true });
if (!dev) rmSync(art, { recursive: true, force: true });
const read = file => JSON.parse(readFileSync(join("public", file), "utf8"));
const catalogue = compileCatalogue(read("music-ranking.json"), read("music-meta.json"),
  read("music-years.json"), read("music-kinds.json"), sleeveVersionLookup(dev ? undefined : art));
writeFileSync(join(output, "catalogue.json"), JSON.stringify(catalogue));
