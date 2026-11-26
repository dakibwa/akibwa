// The parts of the signature that move, read out of Dan's drawing.
//
// public/akibwa-mark.svg is the whole drawing, and it keeps still. The page
// lays two things over it (components/paper/music-room.jsx): the halo's
// outline, to fill with light, and the five rays above it, each to lengthen
// along its own line. Both are read from the drawing here, when the shelf is
// built (scripts/build-shelf.mjs), so a redrawn mark needs nothing copied by
// hand. It is the studio's way of moving the same drawing on its cover
// (ohlifestudios, tools/covers.py), in the drawing's own units.

const INK = "#21190f";   // the drawing's black: its path holds the frame and the five rays
const GOLD = "#d69d53";  // the halo's gold
// The halo's middle and its outer radius, as the studio's cover measures them.
const HALO = { x: 271.04, y: 377.07, r: 242.07 };

const round = (value) => Math.round(value * 100) / 100;

/* A path's pieces, each made absolute so it can stand on its own, with every
   point it passes through. */
function pieces(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const out = [];
  let i = 0, command = null, piece = null;
  let x = 0, y = 0, startX = 0, startY = 0;
  const next = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++];
    const relative = command === command.toLowerCase();
    switch (command.toLowerCase()) {
      case "m": {
        const a = next(), b = next();
        [x, y] = relative && piece ? [x + a, y + b] : [a, b];
        [startX, startY] = [x, y];
        piece = { d: `M${round(x)} ${round(y)}`, xs: [], ys: [] };
        out.push(piece);
        command = relative ? "l" : "L";
        break;
      }
      case "l": {
        const a = next(), b = next();
        [x, y] = relative ? [x + a, y + b] : [a, b];
        piece.d += `L${round(x)} ${round(y)}`;
        break;
      }
      case "h": { const a = next(); x = relative ? x + a : a; piece.d += `L${round(x)} ${round(y)}`; break; }
      case "v": { const a = next(); y = relative ? y + a : a; piece.d += `L${round(x)} ${round(y)}`; break; }
      case "q": {
        const a = [next(), next(), next(), next()];
        const [qx, qy, endX, endY] = relative ? [x + a[0], y + a[1], x + a[2], y + a[3]] : a;
        piece.d += `Q${round(qx)} ${round(qy)} ${round(endX)} ${round(endY)}`;
        [x, y] = [endX, endY];
        break;
      }
      case "z": piece.d += "Z"; [x, y] = [startX, startY]; break;
      default: throw new Error(`The signature uses a path command this does not read: ${command}`);
    }
    piece.xs.push(x);
    piece.ys.push(y);
  }
  return out;
}

const path = (drawing, fill) => {
  const found = drawing.match(new RegExp(`<path fill="${fill}" d="([^"]*)"`));
  if (!found) throw new Error(`The signature has no ${fill} path.`);
  return pieces(found[1]);
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

export function signatureLight(drawing) {
  const box = drawing.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!box) throw new Error("The signature's viewBox no longer starts at its corner.");
  const { x: cx, y: cy, r } = HALO;

  // The halo: the largest piece of the gold above his shoulders.
  const span = (piece) => (Math.max(...piece.xs) - Math.min(...piece.xs)) * (Math.max(...piece.ys) - Math.min(...piece.ys));
  const halo = path(drawing, GOLD).filter((piece) => Math.max(...piece.ys) < 600).sort((a, b) => span(b) - span(a))[0];
  const rim = Math.max(...halo.xs.map((x, i) => Math.hypot(x - cx, halo.ys[i] - cy)));
  if (Math.abs(rim - r) > r * 0.06) throw new Error("The signature's halo is no longer where its light is drawn.");

  // The rays: the pieces of the ink that stand clear above the halo. Each
  // turns about the halo's middle; the end nearer the halo keeps its place.
  const above = path(drawing, INK).filter((piece) => Math.max(...piece.ys) < cy - r * 0.8);
  if (above.length !== 5) throw new Error("The signature no longer has five rays over its halo.");
  const rays = above.map((piece) => {
    const turn = Math.atan2(mean(piece.xs) - cx, cy - mean(piece.ys));
    const [ux, uy] = [Math.sin(turn), -Math.cos(turn)];
    const along = piece.xs.map((x, i) => (x - cx) * ux + (piece.ys[i] - cy) * uy);
    const near = Math.min(...along);
    return { d: piece.d, x: round(cx + ux * near), y: round(cy + uy * near), turn: round(turn * 180 / Math.PI), near };
  }).sort((a, b) => Math.abs(a.turn) - Math.abs(b.turn));   // the middle ray first, the outer two last

  // The page hides the drawing's own rays, since it draws them itself. It
  // shows the picture only below a line a little above the square panel
  // (`panel`), and inside a round edge about the halo's middle (`from`), set
  // just short of where the rays begin. The halo's inked outline above the
  // panel has to stand clear inside that edge, and the rays clear above the
  // line, or a redrawn mark would be cut: fail the build rather than ship that.
  const [width, height] = [Number(box[1]), Number(box[2])];
  const top = height - width;                     // where the square panel begins
  const outline = path(drawing, INK).sort((a, b) => b.xs.length - a.xs.length)[0];
  const inked = Math.max(rim, ...outline.xs.map((x, i) => (outline.ys[i] < top - 2 ? Math.hypot(x - cx, outline.ys[i] - cy) : 0)));
  const from = Math.min(...rays.map((ray) => ray.near)) - 2;
  const panel = top - 20;
  if (from - inked < 16 || Math.max(...above.flatMap((piece) => piece.ys)) > panel - 20) {
    throw new Error("The signature's rays now stand too close to its halo or its panel to be parted from them.");
  }

  return {
    size: [width, height],
    halo: { x: cx, y: cy, r, d: halo.d },
    rays: rays.map(({ d, x, y, turn }) => ({ d, x, y, turn })),
    from: round(from),
    panel
  };
}
