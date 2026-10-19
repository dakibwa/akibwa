/*
 * The three sleeves on the music thing's cards, drawn as cartoons of their
 * real covers (public/album-art: 142, 201 and lf-9a73a1e5602a994d), each in a
 * 60-unit square that things.jsx sets 1.3 times larger. Redrawn on 19 October
 * 2026 (Dan: “keep them cute but meticulously improve all three”): every
 * cover keeps the structure that makes it recognisable from across the room,
 * with its most telling part where the fanned hand leaves it in view.
 */

const round = (value) => +value.toFixed(2);

/* Taking Tiger Mountain (By Strategy): Eno with his hand on his head and a
   red dragon curling behind him, framed by rows of smaller Enos, small round
   the edge and middling within, each a pale face in long orange hair on its
   own black print against the charcoal. */
const TILES = [];
for (let i = 0; i < 12; i += 1) {
  for (let j = 0; j < 12; j += 1) {
    if (i === 0 || i === 11 || j === 0 || j === 11) TILES.push([0.24 + i * 4.96, 0.24 + j * 4.96, 4.96]);
  }
}
for (let i = 0; i < 7; i += 1) {
  for (let j = 0; j < 7; j += 1) {
    if (i === 0 || i === 6 || j === 0 || j === 6) TILES.push([5.2 + i * 7.08, 5.2 + j * 7.08, 7.08]);
  }
}
// Each print turns its head a little one way or the other, and every few
// hold a hand to the chin.
const TURNS = [0, -0.07, 0.06, 0.02, -0.04, 0.07, -0.02];
const tilePath = (draw) =>
  TILES.map(([x, y, s], index) => draw((u) => round(x + u * s), (v) => round(y + v * s), s, TURNS[index % TURNS.length], index)).join("");
const TILE_PRINTS = tilePath((x, y, s) => `M${x(0.07)} ${y(0.07)}h${round(s * 0.86)}v${round(s * 0.86)}h${round(-s * 0.86)}z`);
const TILE_HAIR = tilePath((x, y, s, t) => `M${x(0.19 + t)} ${y(0.93)}C${x(0.13 + t)} ${y(0.5)} ${x(0.2 + t)} ${y(0.15)} ${x(0.5 + t)} ${y(0.14)}C${x(0.8 + t)} ${y(0.15)} ${x(0.87 + t)} ${y(0.5)} ${x(0.81 + t)} ${y(0.93)}Z`);
const TILE_FACES = tilePath((x, y, s, t) => `M${x(0.34 + t * 1.4)} ${y(0.47)}a${round(s * 0.16)} ${round(s * 0.21)} 0 1 0 ${round(s * 0.32)} 0a${round(s * 0.16)} ${round(s * 0.21)} 0 1 0 ${round(-s * 0.32)} 0Z`);
const TILE_HANDS = tilePath((x, y, s, t, index) => (index % 4 === 1 ? `M${x(0.36 + t)} ${y(0.74)}a${round(s * 0.1)} ${round(s * 0.08)} 0 1 0 ${round(s * 0.2)} 0a${round(s * 0.1)} ${round(s * 0.08)} 0 1 0 ${round(-s * 0.2)} 0Z` : ""));
// The big portrait's fingers, from the palm at the right across his crown,
// and his thumb.
const HAND_FINGERS = "M27.2 8.6l-6.6.7M27.6 10.2l-7 1.4M27.4 11.8l-6 2M26.8 13.2l-4.4 2.2M29.8 13.4l-1.6 2.6";

export function TigerMountain() {
  return (
    <>
      <rect width="60" height="60" fill="#36332f" />
      <path d={TILE_PRINTS} fill="#151413" />
      <path d={TILE_HAIR} fill="#e5953a" />
      <path d={TILE_FACES} fill="#f2ede3" />
      <path d={TILE_HANDS} fill="#f2ede3" />
      <g transform="translate(12.28 12.28)">
        <rect width="35.44" height="35.44" fill="#121110" />
        {/* The dragon, curling up behind his head from the left. */}
        <path d="M3 30C1 22 3 13 9 9c4.4-3 10-2.6 12.6.6" fill="none" stroke="#7a1f16" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M3 30C1 22 3 13 9 9c4.4-3 10-2.6 12.6.6" fill="none" stroke="#d5412b" strokeWidth="3" strokeLinecap="round" />
        <path d="M3.4 24.6c2.6-.4 3.6 1.6 2.2 3.4M5.6 14.2c2.4.4 2.8 2.6 1 3.8" fill="none" stroke="#d5412b" strokeWidth="1.3" strokeLinecap="round" />
        <g fill="#f1b23d">
          <circle cx="2.6" cy="19.4" r=".8" />
          <circle cx="4.6" cy="11.8" r=".8" />
          <circle cx="9.6" cy="7.8" r=".8" />
          <circle cx="15.4" cy="6.6" r=".8" />
        </g>
        <circle cx="5.4" cy="6.4" r="2.6" fill="#f1b23d" />
        <circle cx="5.4" cy="6.4" r="1.2" fill="#d5412b" />
        {/* His long hair, falling past his shoulders. */}
        <path d="M9.4 35.44C8 27 8.6 17.6 12.6 12.6c3.4-4.2 10-4.8 14-1 4 3.8 5.4 13.4 4.8 23.84z" fill="#e5953a" />
        <path d="M12 33c-.6-6 0-12.6 2.4-17M29 33c.6-6-.2-12-2.4-16.4" fill="none" stroke="#c06c20" strokeWidth=".9" strokeLinecap="round" />
        <path d="M6.6 35.44c1.4-4.4 5.6-6.6 12.6-6.6s11.2 2.2 12.6 6.6z" fill="#1f1d1b" />
        {/* His face, tilted under the hand. */}
        <g transform="rotate(-12 19.6 20)">
          <ellipse cx="19.6" cy="20" rx="5.6" ry="7.4" fill="#f4efe6" />
          <path d="M16.4 18.4c.8-.5 1.8-.5 2.6 0M20.6 18.4c.8-.5 1.8-.5 2.6 0" fill="none" stroke="#2a2420" strokeWidth=".7" strokeLinecap="round" />
          <path d="M19.8 19.6l-.5 3.2h1" fill="none" stroke="#c9b9a6" strokeWidth=".5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18.4 24.8c.8.5 1.8.5 2.6 0" fill="none" stroke="#c97f7a" strokeWidth=".8" strokeLinecap="round" />
        </g>
        {/* His hand laid over the top of his head from the right, its four
            fingers spread across his hair and its thumb tucked down. */}
        <path d={HAND_FINGERS} fill="none" stroke="#1a1817" strokeWidth="2.7" strokeLinecap="round" />
        <ellipse cx="28.4" cy="10.8" rx="3.5" ry="3.1" transform="rotate(-18 28.4 10.8)" fill="#f6f2ea" stroke="#1a1817" strokeWidth=".45" />
        <path d={HAND_FINGERS} fill="none" stroke="#f6f2ea" strokeWidth="1.95" strokeLinecap="round" />
        <text x="21.4" y="33.9" fill="#e5953a" fontFamily="Georgia, serif" fontSize="2.4" letterSpacing=".3">ENO</text>
      </g>
    </>
  );
}

/* Person Pitch: a round pool seen from above, crowded with children in their
   hats and the animals bathing with them — a seal, a bear, a panda, a tiger,
   a fox and a llama — on its pale rim. */
function Kid({ x, y, skin = "#e7b98f", hair = "#4a3122", children }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="4" rx="4.4" ry="2.4" fill={skin} opacity=".9" />
      <circle r="3.3" fill={skin} />
      <path d="M-3.3-.2a3.3 3.3 0 0 1 6.6 0c-1-.9-2.2-1.4-3.3-1.4s-2.3.5-3.3 1.4z" fill={hair} />
      <path d="M-1.2.6h.01M1.2.6h.01" stroke="#2a2420" strokeWidth=".9" strokeLinecap="round" />
      {children}
    </g>
  );
}

export function PersonPitch() {
  return (
    <>
      <rect width="60" height="60" fill="#a9d1c9" />
      <path d="M0 0h60v9C46 2 14 2 0 9z" fill="#6fb3ad" />
      <circle cx="30" cy="31" r="29.4" fill="#eef3ee" />
      <circle cx="30" cy="31" r="27.4" fill="#3c8d97" />
      <circle cx="30" cy="31" r="22" fill="#4a9ca5" />
      <path d="M14 22c3-1.6 6-1.6 9 0M38 48c3-1.6 6-1.6 9 0M33 18c2-1 4-1 6 0M10 42c2-1 4-1 6 0" fill="none" stroke="#86c9ca" strokeWidth=".9" strokeLinecap="round" />
      {/* The seal, top left, whiskered. */}
      <g transform="translate(16.6 10.6)">
        <ellipse rx="5.6" ry="5" fill="#68717a" />
        <ellipse cy="2.2" rx="3.2" ry="2.1" fill="#8e979e" />
        <circle cx="-2" cy="-1" r=".9" fill="#151413" />
        <circle cx="2" cy="-1" r=".9" fill="#151413" />
        <ellipse cy="1.4" rx="1" ry=".7" fill="#151413" />
        <path d="M-1.6 2.6l-2.4.6M1.6 2.6l2.4.6" stroke="#d9dee0" strokeWidth=".35" strokeLinecap="round" />
      </g>
      {/* The bear, top middle, ears up. */}
      <g transform="translate(30.4 6.6)">
        <circle cx="-3.4" cy="-3" r="1.7" fill="#7a5233" />
        <circle cx="3.4" cy="-3" r="1.7" fill="#7a5233" />
        <circle r="4.6" fill="#7a5233" />
        <ellipse cy="1.6" rx="2.2" ry="1.6" fill="#c0935f" />
        <circle cx="-1.6" cy="-.8" r=".7" fill="#151413" />
        <circle cx="1.6" cy="-.8" r=".7" fill="#151413" />
        <ellipse cy="1" rx=".8" ry=".55" fill="#151413" />
      </g>
      {/* The panda. */}
      <g transform="translate(40.2 13)">
        <circle cx="-3" cy="-3.1" r="1.6" fill="#151413" />
        <circle cx="3" cy="-3.1" r="1.6" fill="#151413" />
        <circle r="4.3" fill="#f6f4ef" />
        <ellipse cx="-1.6" cy="-.4" rx="1.2" ry="1.5" transform="rotate(20 -1.6 -.4)" fill="#151413" />
        <ellipse cx="1.6" cy="-.4" rx="1.2" ry="1.5" transform="rotate(-20 1.6 -.4)" fill="#151413" />
        <circle cx="-1.5" cy="-.6" r=".4" fill="#f6f4ef" />
        <circle cx="1.5" cy="-.6" r=".4" fill="#f6f4ef" />
        <ellipse cy="1.7" rx=".7" ry=".5" fill="#151413" />
      </g>
      {/* The llama, top right, with its long ears and neck. */}
      <g transform="translate(50.6 11)">
        <path d="M-2.4 6.4c-.4-3 0-6 .8-8.4h3.2c.8 2.4 1.2 5.4.8 8.4z" fill="#f1ece2" />
        <path d="M-2-3.6l-.8-3.2 1.6 1.4zM2-3.6l.8-3.2-1.6 1.4z" fill="#f1ece2" />
        <ellipse cy="-2" rx="2.6" ry="2.4" fill="#f1ece2" />
        <ellipse cy="-.6" rx="1.4" ry="1" fill="#ded5c6" />
        <circle cx="-1.1" cy="-2.6" r=".5" fill="#151413" />
        <circle cx="1.1" cy="-2.6" r=".5" fill="#151413" />
      </g>
      {/* The tiger, left, striped. */}
      <g transform="translate(9.6 27)">
        <path d="M-4-3.4l-.6-2.6 2.6 1.2zM4-3.4l.6-2.6-2.6 1.2z" fill="#e0812e" />
        <circle r="4.8" fill="#e0812e" />
        <path d="M-4.6-1l2 .5M-4.4 1.4l2 .1M4.6-1l-2 .5M4.4 1.4l-2 .1M-.8-4.6l.4 1.6M.8-4.6l-.4 1.6" stroke="#2a2420" strokeWidth=".7" strokeLinecap="round" />
        <ellipse cy="2" rx="2.6" ry="1.9" fill="#f5ead8" />
        <circle cx="-1.7" cy="-1" r=".65" fill="#151413" />
        <circle cx="1.7" cy="-1" r=".65" fill="#151413" />
        <path d="M-.7 1.2h1.4l-.7.8z" fill="#c45a52" />
      </g>
      {/* The fox, big-eared, below it. */}
      <g transform="translate(11.6 39.4)">
        <path d="M-3.8-1.6l-.6-4.4 3 2.2zM3.8-1.6l.6-4.4-3 2.2z" fill="#d97a2d" />
        <path d="M-4.2-1.8C-4-3 4-3 4.2-1.8L0 4z" fill="#d97a2d" />
        <path d="M-2.6.2L0 4l2.6-3.8C1.6-.2-1.6-.2-2.6.2z" fill="#f6efe3" />
        <circle cx="-1.6" cy="-1.2" r=".55" fill="#151413" />
        <circle cx="1.6" cy="-1.2" r=".55" fill="#151413" />
        <circle cy="3.4" r=".55" fill="#151413" />
      </g>
      {/* Children in their hats: paper, red, black, feathered. */}
      <Kid x={23.6} y={22.4}>
        <path d="M-4.4-1.4L0-6.4l4.4 5z" fill="#f6f2e8" />
        <path d="M-4.4-1.4h8.8" stroke="#cfc7b6" strokeWidth=".5" />
      </Kid>
      <Kid x={38.4} y={25.4} skin="#d9a379">
        <path d="M-3.5-.6a3.5 3.6 0 0 1 7 0z" fill="#c62f3b" />
        <path d="M-3.6-.6h7.2" stroke="#9c1f2b" strokeWidth=".8" strokeLinecap="round" />
      </Kid>
      <Kid x={49.4} y={26.6} skin="#e3b086" hair="#6b4a2e">
        <path d="M-3.6-2.4l-1.6-4M-1.6-3.2l-.6-4.2M.6-3.4l.4-4.2M2.6-3l1.4-4" stroke="#2f62a8" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M-2.6-2.8l-1-4M1.6-3.2l.8-4" stroke="#e3463a" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M-3.6-1.6h7.2" stroke="#f1d36b" strokeWidth="1.1" strokeLinecap="round" />
      </Kid>
      <Kid x={29} y={34.6} skin="#f0c8a4" hair="#2a2018">
        <ellipse cy="-1.6" rx="4.6" ry="1.4" fill="#151413" />
        <path d="M-2.8-1.6a2.8 3 0 0 1 5.6 0z" fill="#151413" />
      </Kid>
      <Kid x={41.2} y={40.2} skin="#c98f6a" hair="#2a1d16" />
      <Kid x={20.8} y={45.6} skin="#e8c09a" hair="#5a3a24" />
      <Kid x={35.8} y={49.4} skin="#d6a07a" hair="#4a3122">
        <path d="M-3.4-.4a3.4 3.4 0 0 1 6.8 0z" fill="#b8232f" />
        <path d="M-2.2-1.6h.01M0-2.6h.01M2.2-1.6h.01" stroke="#f1d36b" strokeWidth=".8" strokeLinecap="round" />
      </Kid>
      {/* A dolphin turning low on the left, a parrot perched on the right. */}
      <path d="M8.4 50.4c3-3.4 8.4-4.2 11.6-1.6-2.6-.6-5.6 0-7.6 1.8 1.6.4 2.4 1.4 2.4 2.6-2.2-1.6-4.6-2.2-6.4-2.8z" fill="#5e6870" />
      <g transform="translate(52.6 38.6)">
        <path d="M-1.8 5.6c0-3 .4-6 1.8-8 1.4 2 1.8 5 1.8 8z" fill="#f4f2ec" />
        <path d="M-.8 5.4l.8 3.4.8-3.4z" fill="#2a2420" />
        <circle cy="-2.4" r="2" fill="#d63a33" />
        <path d="M1.4-2.6l1.6.6-1.6.6z" fill="#f1d36b" />
        <circle cx=".4" cy="-2.8" r=".4" fill="#151413" />
      </g>
    </>
  );
}

/* Graceland: the spaced title over the small painting, a rider in a yellow
   tunic and a red cloak on a white horse in its red harness, spear across
   them, on the dark board of an old icon, all on the sleeve's warm cream. */
// The horse's legs: hind legs straight, one foreleg planted and the other
// lifted mid-stride.
const HORSE_LEGS = "M5.2 15l-.8 6.6M7.6 15.2l.2 6.6M14.4 15l.8 6.6M16.6 14.4l2.6 3 1.4-1.2";

export function Graceland() {
  return (
    <>
      <rect width="60" height="60" fill="#ece5cf" />
      <text className="t-sleeve-type" x="30" y="9.2" textAnchor="middle">PAUL·SIMON</text>
      <text className="t-sleeve-type" x="30" y="13.4" textAnchor="middle">GRACELAND</text>
      {/* The old board, its edges worn pale. */}
      <path d="M17.6 19.2l24.8-.6.6 25.2-25 .6z" fill="#cdb791" />
      <path d="M18.6 20.2l23-.4.4 23-23.2.4z" fill="#1c1b29" />
      <path d="M18.6 20.2h8.6c-1.6 4-5 6.6-8.6 7.4z" fill="#8f2e22" />
      <path d="M33.4 43l8.6-.2v-5.4c-3.2.8-6.6 2.6-8.6 5.6z" fill="#7d281f" />
      <g transform="translate(18.6 20.2)">
        {/* His red cloak sweeping back over the horse's quarters. */}
        <path d="M10.4 6C7 5 2.6 6.4 1 11.4c2.6-1 5-.6 7 1L11.4 9z" fill="#c8392b" />
        <path d="M8.6 6.6C6 6.8 3.8 8.4 2.8 10.4" fill="none" stroke="#8e2219" strokeWidth=".6" strokeLinecap="round" />
        {/* The white horse, striding right, neck arched and head held high,
            outlined in ink so it stands clear of the board. */}
        <path d={HORSE_LEGS} fill="none" stroke="#2a2420" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={HORSE_LEGS} fill="none" stroke="#f3ede2" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.9 12.2C1.4 13 .8 14.8 1 17.2" fill="none" stroke="#2a2420" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M2.9 12.2C1.4 13 .8 14.8 1 17.2" fill="none" stroke="#f3ede2" strokeWidth="1" strokeLinecap="round" />
        <path d="M19.4 3.4l.7-1.9.8 2z" fill="#f3ede2" stroke="#2a2420" strokeWidth=".4" strokeLinejoin="round" />
        <path d="M2.8 12.6C3.4 10.8 5.6 10.2 8.2 10.4h5.6c1.6-2 3.2-4.8 5.6-6.8 1-.8 2-.6 2.4.4l.8 2.8c.2.8-.2 1.4-1 1.4h-1l-2.2 3.2c-.6 1.8-1.4 3.2-3.4 3.6l-7.4.2c-3 0-5.2-.8-4.8-2.6z" fill="#f3ede2" stroke="#2a2420" strokeWidth=".45" strokeLinejoin="round" />
        <circle cx="20.9" cy="5" r=".5" fill="#151413" />
        {/* Its red harness, a band and tassels at the neck. */}
        <path d="M19 6.6c1.2.6 2.4.8 3.6.4M17.4 8.6l2.2 1.8" fill="none" stroke="#c8392b" strokeWidth=".9" strokeLinecap="round" />
        <g fill="#c8392b">
          <circle cx="17" cy="10.6" r=".6" />
          <circle cx="18.2" cy="11.4" r=".6" />
          <circle cx="19.2" cy="10.2" r=".6" />
        </g>
        {/* The saddle cloth, and the rider in yellow with his halo. */}
        <path d="M7.8 10.4h5.6l-.5 3.8H8.3z" fill="#c8392b" stroke="#2a2420" strokeWidth=".35" strokeLinejoin="round" />
        <path d="M8.9 11.6h.01M10.6 11.6h.01M12.3 11.6h.01M9.7 13.1h.01M11.4 13.1h.01" stroke="#f1c84e" strokeWidth=".8" strokeLinecap="round" />
        <path d="M11.2 10.6l.4 4.2" stroke="#e2b13a" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M9.2 10.6C8.8 8 9.2 6 10.4 5.4h2.4C14 6 14.4 8 13.8 10.6z" fill="#e2b13a" stroke="#2a2420" strokeWidth=".35" strokeLinejoin="round" />
        <path d="M9.4 9.2h4.2" stroke="#c8392b" strokeWidth=".6" />
        <circle cx="11.6" cy="3.5" r="2.6" fill="none" stroke="#e8c45a" strokeWidth=".7" />
        <circle cx="11.6" cy="3.5" r="1.6" fill="#b07a52" />
        <path d="M10 3a1.6 1.6 0 0 1 3.2 0c-.8-.4-1.6-.6-1.6-.6s-.8.2-1.6.6z" fill="#2a1d16" />
        <path d="M10.6 6.4L8.8 5.2" stroke="#e2b13a" strokeWidth="1.1" strokeLinecap="round" />
        {/* The spear in his raised hand, across them to the horse's chest. */}
        <path d="M2.4 1l19.4 13.4" stroke="#2a2420" strokeWidth="1" strokeLinecap="round" />
        <path d="M2.4 1l19.4 13.4" stroke="#ece2cb" strokeWidth=".5" strokeLinecap="round" />
        <path d="M1.2.2l2.2.2-1 1.6z" fill="#ece2cb" stroke="#2a2420" strokeWidth=".3" strokeLinejoin="round" />
        <circle cx="8.8" cy="5.2" r=".75" fill="#b07a52" />
      </g>
    </>
  );
}
