/*
 * Shapes for the Features puzzle on the homepage, drawn from the game's own
 * stamp artwork in a 96-unit box (features.games, assets/stamps). Each is a
 * single ring of neurons lying on the shape's outline, in order along it, as
 * the game builds its rings. `curves[i]` is the thread from neuron i to
 * neuron i + 1 once solved, as cubic segments [control, control, end] (the
 * last ends on the next neuron), so the threads settle into the outline
 * itself; null stays straight. The heart keeps five neurons so it can be dealt
 * as a five-pointed star; its thread across the top dips into the cleft.
 * Solved, a shape is left looking like the thing it is — its outline coloured
 * in — never turned into a stamp.
 */
export const FEATURE_SHAPES = [
  {
    id: "heart",
    name: "a heart",
    colour: "#DE3C75",
    fill: "M48 82C42 76 14 55 14 35C14 16 36 10 48 28C60 10 82 16 82 35C82 55 54 76 48 82Z",
    nodes: [[48, 82], [14, 35], [30.2, 17.2], [65.8, 17.2], [82, 35]],
    curves: [
      [[[42, 76], [14, 55]]],
      [[[14, 23.9], [21.5, 17.2]]],
      [[[36.3, 17.2], [43, 20.5], [48, 28]], [[53, 20.5], [59.7, 17.2]]],
      [[[74.5, 17.2], [82, 23.9]]],
      [[[82, 55], [54, 76]]]
    ]
  },
  {
    id: "house",
    name: "a house",
    colour: "#E97E18",
    fill: "M48 14L82 46C76 48 76 58 76 82H20C20 58 20 48 14 46Z",
    nodes: [[48, 14], [82, 46], [76, 82], [20, 82], [14, 46]],
    curves: [null, [[[76, 48], [76, 58]]], null, [[[20, 58], [20, 48]]], null]
  },
  {
    id: "leaf",
    name: "a leaf",
    colour: "#1FA45A",
    fill: "M28 68C22 56.5 23.5 44.8 31.9 35.4C40.3 26 55.5 19 77 17C78 32.5 74.3 47.3 66.9 57.4C59.5 67.5 44 72.5 28 68Z",
    stem: "M21 79C24 74 27 70 29 69",
    nodes: [[28, 68], [31.9, 35.4], [77, 17], [66.9, 57.4]],
    curves: [
      [[[22, 56.5], [23.5, 44.8]]],
      [[[40.3, 26], [55.5, 19]]],
      [[[78, 32.5], [74.3, 47.3]]],
      [[[59.5, 67.5], [44, 72.5]]]
    ]
  }
];

// A ring: neuron i joins neuron i + 1, and the last joins the first.
export const ringEdges = (count) => Array.from({ length: count }, (_, i) => [i, (i + 1) % count]);

const lerp = (p, q, m) => [p[0] + (q[0] - p[0]) * m, p[1] + (q[1] - p[1]) * m];
const point = ([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`;

/*
 * One thread from a to b: straight while the puzzle is being played (m = 0),
 * bending into the outline as the shape settles (m = 1). `place` maps the
 * shape's 96-unit box onto the board the thread is drawn on.
 */
export function threadPath(a, b, curve, m, place = (p) => p) {
  const segments = curve ?? [[]];
  const bent = (straight, target) => (target && m > 0 ? lerp(straight, place(target), m) : straight);
  return segments.reduce((path, [c1, c2, end], j) => {
    const start = lerp(a, b, j / segments.length);
    const stop = lerp(a, b, (j + 1) / segments.length);
    const last = j === segments.length - 1;
    return `${path}C${point(bent(lerp(start, stop, 1 / 3), c1))} ${point(bent(lerp(start, stop, 2 / 3), c2))} ${point(last ? b : bent(stop, end))}`;
  }, `M${point(a)}`);
}

// Where two straight threads cross, for the ink rings Features draws on them.
export function crossingPoints(nodes, edges) {
  const points = [];
  edges.forEach(([a, b], i) => {
    edges.forEach(([c, d], j) => {
      if (j <= i || [a, b].some((n) => n === c || n === d)) return;
      const [p, q, r, t] = [nodes[a], nodes[b], nodes[c], nodes[d]];
      const den = (q[0] - p[0]) * (t[1] - r[1]) - (q[1] - p[1]) * (t[0] - r[0]);
      if (!den) return;
      const u = ((r[0] - p[0]) * (t[1] - r[1]) - (r[1] - p[1]) * (t[0] - r[0])) / den;
      const v = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / den;
      if (u > 0 && u < 1 && v > 0 && v < 1) points.push([p[0] + u * (q[0] - p[0]), p[1] + u * (q[1] - p[1])]);
    });
  });
  return points;
}
