// The wordmark in tall banded pixels, tried four ways. node net/riffs.mjs <out-folder>

import { mkdirSync } from "node:fs";
import { Grid, hex } from "./pix.mjs";
import { TALL, setWord } from "./wordmark.mjs";

const out = process.argv[2] ?? "net/out";
mkdirSync(out, { recursive: true });
const NIGHT = hex("#15110f");
const ramp = (list) => list.map(hex);
const EMBER = ramp(["#f8ecd8", "#f3c391", "#ec7a40", "#a9431f", "#5a291a"]);
const STONE = ramp(["#efe7d8", "#cfc2ae", "#a99a87", "#766a5e", "#463e37"]);
const WAIST = ramp(["#efe7d8", "#cfc2ae", "#f0703a", "#766a5e", "#463e37"]);

const caps = setWord(TALL);
const banded = (colours, height = 20) => (q, r) => colours[Math.max(0, Math.min(colours.length - 1, Math.floor((r / height) * colours.length)))];
const filled = (word, q, r) => r >= 0 && r < word.rows.length && q >= 0 && q < word.width && word.rows[r][q] !== ".";

const k = 10;
const G = new Grid(1440, 900, NIGHT);
const place = (n) => [Math.round((n % 2) * 720 + 360 - (caps.width * k) / 2), Math.round(Math.floor(n / 2) * 450 + 225 - (21 * k) / 2)];
{
  const [x, y] = place(0);
  G.stamp(caps.rows, x, y, k, banded(EMBER));
}
{
  const [x, y] = place(1);
  G.stamp(caps.rows, x, y, k, banded(WAIST));
}
{
  const [x, y] = place(2);
  const stone = banded(STONE);
  const ember = banded(EMBER);
  G.stamp(caps.rows, x, y, k, (q, r) => (q < caps.starts[1] ? ember(q, r) : stone(q, r)));
}
{
  const [x, y] = place(3);
  const base = banded(EMBER);
  G.stamp(caps.rows, x, y, k, (q, r) => {
    const n = Math.max(0, Math.min(4, Math.floor((r / 20) * 5)));
    if (!filled(caps, q - 1, r)) return EMBER[Math.max(0, n - 1)];
    if (!filled(caps, q + 1, r)) return EMBER[Math.min(4, n + 1)];
    return base(q, r);
  });
}
G.save(`${out}/akibwa-banded-riffs.png`);
