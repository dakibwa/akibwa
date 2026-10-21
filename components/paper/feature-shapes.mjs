/*
 * Features on the front page: a messy neural net that resolves (Dan,
 * 21 October 2026: “can it not just be a representation look like a neural
 * messy net that when you hover it resolves”). Three features, each one closed
 * loop in one colour, as the game draws them: a heart in pink, a house in
 * orange and a droplet in blue. Their neurons are dealt knotted together
 * (`rest`, ten conflicts) and resolve to their rests on the game's own
 * outlines (`home`), in a row across the middle of the board, in the
 * thing's 160 × 140 box. `edges` holds each outline between one neuron and the
 * next: every point as its share of the way along, then where it lies in the
 * frame of the straight thread between the two (along it, and to its left in
 * thread lengths), so a thread drawn straight while knotted bends into its
 * outline as it settles. The outlines are features.games' stamp collection
 * (revision 41: heart, house and droplet), simplified to a fifth of a unit.
 */
export const NET = [
  {
    key: "heart",
    colour: "#da327b",
    rest: [[68, 47], [101, 88], [36, 112], [29, 92]],
    home: [[39.8, 72], [55.5, 75.7], [39.7, 97], [24, 75.7]],
    edges: [
      [[0.134, 0.085, -0.17], [0.291, 0.238, -0.33], [0.4, 0.374, -0.403], [0.512, 0.531, -0.43], [0.613, 0.671, -0.409], [0.723, 0.808, -0.335], [0.853, 0.928, -0.195]],
      [[0.166, 0.156, -0.067], [0.385, 0.379, -0.091], [0.617, 0.615, -0.073]],
      [[0.398, 0.4, -0.075], [0.639, 0.647, -0.09], [0.819, 0.829, -0.07], [0.917, 0.925, -0.04]],
      [[0.155, 0.077, -0.206], [0.257, 0.169, -0.317], [0.363, 0.296, -0.397], [0.467, 0.439, -0.43], [0.589, 0.611, -0.408], [0.718, 0.772, -0.323], [0.856, 0.907, -0.181]]
    ]
  },
  {
    key: "house",
    colour: "#dd700c",
    rest: [[101, 48], [125, 48], [107, 113], [48, 95], [31, 71]],
    home: [[84.6, 64.5], [104, 82.3], [98.6, 99.2], [70.4, 99.1], [65.1, 82.3]],
    edges: [
      [[0.073, 0.069, -0.025], [0.912, 0.918, -0.029], [0.966, 0.972, -0.021]],
      [[0.047, 0.054, 0.014], [0.098, 0.097, 0.056], [0.249, 0.152, 0.226], [0.921, 0.908, -0.017]],
      [[0.026, 0.047, -0.012], [0.191, 0.347, -0.013], [0.416, 0.349, 0.4], [0.581, 0.649, 0.4], [0.807, 0.648, -0.013], [0.971, 0.949, -0.014]],
      [[0.064, 0.074, -0.014], [0.749, 0.848, 0.228], [0.905, 0.905, 0.053], [0.972, 0.968, 0.003]],
      [[0.042, 0.035, -0.023], [0.088, 0.082, -0.029], [0.927, 0.931, -0.025]]
    ]
  },
  {
    key: "droplet",
    colour: "#119bd5",
    rest: [[100, 67], [130, 89], [72, 119]],
    home: [[113.6, 77], [136, 77], [124.8, 97.7]],
    edges: [
      [[0.127, 0.045, -0.188], [0.233, 0.136, -0.322], [0.318, 0.236, -0.405], [0.372, 0.31, -0.442], [0.481, 0.472, -0.479], [0.595, 0.644, -0.459], [0.695, 0.782, -0.393], [0.746, 0.842, -0.344], [0.803, 0.9, -0.28], [0.884, 0.962, -0.173]],
      [[0.163, 0.155, -0.058], [0.336, 0.33, -0.074], [0.488, 0.484, -0.067]],
      [[0.451, 0.454, -0.062], [0.644, 0.65, -0.075], [0.84, 0.848, -0.057]]
    ]
  }
];
