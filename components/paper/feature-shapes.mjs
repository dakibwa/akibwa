/*
 * Features' house for the front page, from the game's own stamp artwork and
 * neuron rings in a 96-unit box (features.games: assets/stamps). It keeps the
 * first front page's layout: the neurons are dealt as a star (`tangle`) with a
 * chord across it and fall into the house's corners (`nodes`), where its
 * silhouette (`fill`) inks in under the threads — the thing it is, with no
 * coloured plate. `threads` joins the neurons one edge at a time, each drawn in
 * its own colour: the roof's right, the right wall, the floor, the left wall,
 * the roof's left, and last the chord. The chord ends up straight across the
 * house, so it runs under the silhouette, which covers it once the house has
 * formed (Dan, 26 September 2026).
 */
export const HOUSE = {
  fill: "M44 18Q48 14 52 18L83 46Q87 50 82 52H76V78Q76 82 72 82H56V60H40V82H24Q20 82 20 78V52H14Q9 50 13 46Z",
  nodes: [[48, 15], [85, 49], [76, 82], [20, 82], [11, 49]],
  tangle: [[48, 18], [22, 72], [80, 38], [14, 36], [74, 76]],
  threads: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 4]]
};
