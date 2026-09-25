/*
 * Shapes for the Features puzzle on the homepage, from the game's own stamp
 * artwork and neuron rings in a 96-unit box (features.games: assets/stamps and
 * its families). Each is a ring of neurons on the shape's outline, in the
 * game's order, unless `edges` says otherwise: the house keeps the first front
 * page's layout, a star-shaped tangle with a chord that falls into the house.
 * `curves[i]` is the thread for edge i (from neuron i to neuron i + 1) once
 * solved, as cubic segments [control, control, end] (the last ends on the
 * next neuron), so the threads settle into the outline itself — the star's
 * closing thread runs round its three lower points, as in the game; null stays
 * straight. `tangle` is where the neurons are first dealt, the same on the
 * front page and in the room. Solved, the shape's silhouette inks in under its
 * threads on the paper, as the first front page did — the thing it is, with no
 * coloured plate.
 */
export const FEATURE_SHAPES = [
  {
    id: "house",
    name: "a house",
    colour: "#E97E18",
    fill: "M44 18Q48 14 52 18L83 46Q87 50 82 52H76V78Q76 82 72 82H56V60H40V82H24Q20 82 20 78V52H14Q9 50 13 46Z",
    nodes: [[48, 15], [85, 49], [76, 82], [20, 82], [11, 49]],
    // The first front-page tangle: a five-pointed star with a chord across it.
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 4]],
    curves: [null, null, null, null, null, null],
    tangle: [[48, 18], [22, 72], [80, 38], [14, 36], [74, 76]]
  },
  {
    id: "star",
    name: "a star",
    colour: "#EFC319",
    fill: "M48 11L59 35L85 38L65 57L70 84L48 71L26 84L31 57L11 38L37 35Z",
    nodes: [[11, 38], [37, 35], [48, 11], [59, 35], [85, 38], [65, 57], [70, 84]],
    curves: [null, null, null, null, null, null, [
      [[62.67, 79.67], [55.33, 75.33], [48, 71]],
      [[40.67, 75.33], [33.33, 79.67], [26, 84]],
      [[27.67, 75], [29.33, 66], [31, 57]],
      [[24.33, 50.67], [17.67, 44.33]]
    ]],
    tangle: [[19, 39], [81, 57], [34, 14], [22, 59], [41, 55], [75, 19], [51, 84]]
  },
  {
    id: "heart",
    name: "a heart",
    colour: "#DE3C75",
    fill: "M48 82C42 76 14 55 14 35C14 16 36 10 48 28C60 10 82 16 82 35C82 55 54 76 48 82Z",
    nodes: [[14, 35], [30.2, 17.2], [48, 28], [65.8, 17.2], [82, 35], [48, 82]],
    curves: [
      [[[14, 23.9], [21.5, 17.2]]],
      [[[36.3, 17.2], [43, 20.5]]],
      [[[53, 20.5], [59.7, 17.2]]],
      [[[74.5, 17.2], [82, 23.9]]],
      [[[82, 55], [54, 76]]],
      [[[42, 76], [14, 55]]]
    ],
    tangle: [[81, 59], [18, 77], [66, 15], [70, 78], [15, 31], [31, 20]]
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
    ],
    tangle: [[82, 69], [12, 32], [38, 82], [51, 21]]
  }
];

// A ring: neuron i joins neuron i + 1, and the last joins the first.
export const ringEdges = (count) => Array.from({ length: count }, (_, i) => [i, (i + 1) % count]);
export const edgesOf = (shape) => shape.edges ?? ringEdges(shape.nodes.length);

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
