"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FEATURE_SHAPES, edgesOf } from "./feature-shapes.mjs";
import { BLOBS } from "./websites-art.mjs";

/*
 * The five things on the front page, drawn as small papercraft objects
 * standing on the ground line (y = 128 in a 160 × 140 box). Each has a pencil
 * sketch (`.t-sketch`, drawn in on arrival) under its coloured paper, a soft
 * shadow, and one small idea it acts out on hover or focus.
 */

const ground = (cx, rx) => <ellipse className="t-shadow" cx={cx} cy="129.5" rx={rx} ry="4.6" />;

// The paper lands on its sketch; the outer group lifts it on hover.
function Paper({ children }) {
  return (
    <g className="t-lift">
      <g className="t-paper">{children}</g>
    </g>
  );
}

// One subpath each: a path of several with pathLength="1" dashes them all at
// once. `delay` staggers a drawing's strokes, in milliseconds.
function Sketch({ d, transform, delay = 0 }) {
  return <path className="t-sketch" d={d} transform={transform} pathLength="1" style={delay ? { "--d": `${delay}ms` } : undefined} />;
}

/*
 * Taste: a small hand of cards, each a cartoon of a favourite sleeve drawn
 * from its real artwork — Taking Tiger Mountain (By Strategy), Person Pitch
 * and Graceland — that fans open on hover. Faces are drawn in a 60-unit square
 * and set 1.3 times larger on 84-unit cards, the size of the other things.
 */
const CARD = "M-38-84h76a4 4 0 0 1 4 4v76a4 4 0 0 1-4 4h-76a4 4 0 0 1-4-4v-76a4 4 0 0 1 4-4z";

// Each card's resting place (.t-card-* in globals.css, turned about 0,72), so
// its sketch is drawn where the card will land.
const CARD_REST = [
  ["back", -6, -3, -11],
  ["middle", 0, -4, 0],
  ["front", 6, -3, 11]
];

function Card({ className, clip, children }) {
  return (
    <g className={`t-card ${className}`}>
      <path d={CARD} fill="#fffdf8" />
      <g clipPath={`url(#${clip})`}>
        <g transform="translate(-39 -81) scale(1.3)">{children}</g>
      </g>
      <path className="t-ink" d={CARD} />
    </g>
  );
}

const round = (value) => +value.toFixed(2);

// Taking Tiger Mountain: rows of small portraits round a large one, a red
// dragon curling beside it, on grey.
const ENOS = [];
[0.5, 8, 15.5, 23, 30.5, 38, 45.5, 53].forEach((y, row) => {
  [0.5, 6.5, 12.5, 18.5, 24.5, 30.5, 36.5, 42.5, 48.5, 54.5].forEach((x, column) => {
    if (row < 2 || row > 5 || column < 2 || column > 7) ENOS.push([x, y]);
  });
});
const enoPath = (draw) => ENOS.map(([x, y]) => draw((dx) => round(x + dx), (dy) => round(y + dy))).join("");
const ENO_SHOULDERS = enoPath((x, y) => `M${x(0.4)} ${y(7.4)}C${x(0.5)} ${y(5.6)} ${x(1.6)} ${y(4.9)} ${x(3)} ${y(4.9)}S${x(5.5)} ${y(5.6)} ${x(5.6)} ${y(7.4)}Z`);
const ENO_HAIR = enoPath((x, y) => `M${x(0.9)} ${y(5.6)}C${x(0.6)} ${y(2)} ${x(1.6)} ${y(0.6)} ${x(3)} ${y(0.6)}S${x(5.4)} ${y(2)} ${x(5.1)} ${y(5.6)}Z`);
const ENO_FACES = enoPath((x, y) => `M${x(1.75)} ${y(3.3)}a1.25 1.6 0 1 0 2.5 0a1.25 1.6 0 1 0-2.5 0Z`);
const DRAGON = "M21.5 19c-6 2-8.5 8-4.5 12s9.5 3 7.5 9-7.5 4.5-9 2.5";

function TigerMountain() {
  return (
    <>
      <rect width="60" height="60" fill="#77736d" />
      <path d={ENO_SHOULDERS} fill="#1d1b1a" />
      <path d={ENO_HAIR} fill="#e0913a" />
      <path d={ENO_FACES} fill="#f3efe8" />
      <path d={DRAGON} fill="none" stroke="#1d1b1a" strokeWidth="4.4" strokeLinecap="round" />
      <path d={DRAGON} fill="none" stroke="#d13b2a" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="22" cy="19" r="3.3" fill="#e5872f" stroke="#1d1b1a" strokeWidth=".6" />
      <circle cx="22" cy="19" r="1.5" fill="#d13b2a" />
      <path d="M25 46c.6-5.6 4.6-8.8 10-9.4h5c5.4.6 8.6 3.8 9 9.4z" fill="#1d1b1a" />
      <path d="M29.2 39.5c-2.4-8-1.6-17.4 5.4-19.8s12.8.6 13 7.4c.2 5.2-.6 9.4-2.2 12.4z" fill="#e0913a" />
      <ellipse cx="38.2" cy="29.8" rx="5.6" ry="7.2" fill="#f3efe8" />
      <path d="M35.6 28.8h1.5M39.4 28.8h1.5" stroke="#3a2c28" strokeWidth=".8" strokeLinecap="round" />
      <path d="M37.3 33.8h1.8" stroke="#b5483a" strokeWidth="1" strokeLinecap="round" />
      <path d="M33.6 21.6c1.6-3.4 6.6-4.6 10.2-2.6 1.6.9 2.2 2.6 1.2 3.8-1.4 1.6-4.4 1.2-6.6 1.4-2 .2-4.2-.4-4.8-2.6z" fill="#f7f4ee" stroke="#1d1b1a" strokeWidth=".5" />
    </>
  );
}

// Person Pitch: bathers and animals crowded into a round pool, from above.
const BATHERS = [
  [22, 21.5, 3.3, "#e0b28c", "#3a2a22"],
  [44, 25, 3.2, "#d9a67f", "#2d2320"],
  [26.5, 32, 3.6, "#e8c3a0", "#5a3d2a"],
  [38.5, 34, 3.4, "#c98f6a", "#2a2020"],
  [49.5, 35.5, 3.1, "#e0b08a", "#6b4a2e"],
  [17.5, 42.5, 3.6, "#d7a47c", "#2b2320"],
  [31, 44, 3.5, "#f0c9a8", "#3b2b22"],
  [44, 46, 3.4, "#b9805a", "#1f1a18"],
  [24, 52.5, 3.7, "#e2b491", "#4a3426"],
  [37.5, 53.5, 3.5, "#d39f78", "#2d2320"]
];

function PersonPitch() {
  return (
    <>
      <rect width="60" height="60" fill="#7f978c" />
      <circle cx="30" cy="30.5" r="28" fill="#6c8480" stroke="#b3b6a9" strokeWidth="2.4" />
      {BATHERS.map(([x, y, r, skin, hair]) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={round(y + r * 1.25)} rx={round(r * 1.35)} ry={round(r * 0.85)} fill={skin} />
          <circle cx={x} cy={y} r={r} fill={skin} />
          <path d={`M${round(x - r)} ${y}a${r} ${r} 0 0 1 ${round(2 * r)} 0z`} fill={hair} />
        </g>
      ))}
      <path d="M23 30l3.5-5.4 3.5 5.4z" fill="#f2efe6" />
      <path d="M40.6 25.4c0-3.1 1.5-4.8 3.4-4.8s3.4 1.7 3.4 4.8z" fill="#b8332f" />
      <path d="M40.6 48.8h6.8v2h-6.8z" fill="#b8332f" />
      <circle cx="11" cy="14" r="4.6" fill="#2e2a28" />
      <ellipse cx="11" cy="15.4" rx="2.4" ry="1.8" fill="#6d5a50" />
      <ellipse cx="21" cy="8" rx="4.6" ry="4.2" fill="#4f5150" />
      <path d="M19.6 7.4h.1M22.4 7.4h.1" stroke="#111" strokeWidth="1" strokeLinecap="round" />
      <circle cx="27.8" cy="4.8" r="1.6" fill="#7a5436" />
      <circle cx="34.2" cy="4.8" r="1.6" fill="#7a5436" />
      <circle cx="31" cy="8.2" r="4.4" fill="#7a5436" />
      <ellipse cx="31" cy="9.8" rx="1.9" ry="1.3" fill="#b88a60" />
      <path d="M41 15c-.3-5 .9-9 3-9s3.3 4 3 9z" fill="#ece5d8" />
      <path d="M42 6.6l-.6-2.4M46 6.6l.6-2.4" stroke="#ece5d8" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="52" cy="18" r="3.2" fill="#d9a67f" />
      <path d="M49 15.5l-1.6-4.6M53.2 14.6l.8-5M55.2 15.6l1.8-4.4" stroke="#c43a2f" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M51 14.6l-.6-5" stroke="#3a5aa0" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="31.2" cy="15" r="1.5" fill="#1f1d1c" />
      <circle cx="36.8" cy="15" r="1.5" fill="#1f1d1c" />
      <circle cx="34" cy="18" r="3.8" fill="#f4f1ea" />
      <ellipse cx="32.6" cy="18" rx="1" ry="1.3" fill="#1f1d1c" />
      <ellipse cx="35.4" cy="18" rx="1" ry="1.3" fill="#1f1d1c" />
      <circle cx="34" cy="20" r=".55" fill="#1f1d1c" />
      <circle cx="10.5" cy="27" r="4.8" fill="#dd8a31" />
      <ellipse cx="10.5" cy="29" rx="2.2" ry="1.6" fill="#f3e6d2" />
      <path d="M8.2 23.4l.9 2M12.8 23.4l-.9 2M6.4 27.5h2M14.6 27.5h-2" stroke="#2a2420" strokeWidth=".8" strokeLinecap="round" />
      <path d="M9.2 26.2h.1M11.8 26.2h.1" stroke="#2a2420" strokeWidth="1" strokeLinecap="round" />
      <path d="M9 38.6l1-3.4 2 1.8 2-1.8 1 3.4-3 3z" fill="#d8883c" />
    </>
  );
}

// Graceland: the small painting of a rider on a white horse, set low on
// cream under the spaced title.
function Graceland() {
  return (
    <>
      <rect width="60" height="60" fill="#ede3c2" />
      <text className="t-sleeve-type" x="30" y="7.8" textAnchor="middle">PAUL·SIMON</text>
      <text className="t-sleeve-type" x="30" y="11.4" textAnchor="middle">GRACELAND</text>
      <path d="M19.2 19.5l22.8-.4.5 23.4-23 .4z" fill="#2a211d" />
      <path d="M20.9 21.1h19.8v19.8H20.9z" fill="#1f1c26" />
      <path d="M24.2 37.4h.1M38.4 29.6h.1M22.6 34.2h.1M36.8 38.8h.1M39.2 22.8h.1" stroke="#c8402e" strokeWidth=".9" strokeLinecap="round" />
      <path d="M21.2 21.4l4.4.6-3.2 2.6z" fill="#d8472f" />
      <path d="M28.4 25.4c-2.6.4-5.8 1.4-7.4 3.6l.2 4.4 6.8-2.6z" fill="#c8402e" />
      <ellipse cx="31.6" cy="32.6" rx="6.8" ry="3.3" transform="rotate(-8 31.6 32.6)" fill="#f1e5e0" />
      <path d="M34.6 31.4l2-7c.3-1 1.4-1.6 2.4-1.3l1 .4-.3 3.2-1.4 1-1.1 5.3z" fill="#f1e5e0" />
      <path d="M27.4 34.8l-2.2 5.3M29.8 35.4l-.6 5.1M33.6 35.2l1 5.2M35.9 34.2l2.6 5" stroke="#f1e5e0" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M28 30.4l1.2-5.4h3.6l1.4 5.4z" fill="#d8472f" />
      <path d="M28.6 28.6h4.8v1.2h-4.8z" fill="#e3b53b" />
      <circle cx="31" cy="23.2" r="2.1" fill="none" stroke="#e3b53b" strokeWidth=".5" />
      <circle cx="31" cy="23.2" r="1.5" fill="#6b4030" />
      <path d="M22.6 22.2l17 17" stroke="#efe2cc" strokeWidth=".7" strokeLinecap="round" />
      <circle cx="38.8" cy="24.4" r=".45" fill="#1f1c26" />
    </>
  );
}

export function TasteThing() {
  const clip = `t-card-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className="thing-art thing-taste" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <rect x="-39" y="-81" width="78" height="78" rx="2.6" />
        </clipPath>
      </defs>
      {ground(80, 66)}
      {CARD_REST.map(([name, x, y, turn], index) => (
        <Sketch key={name} d={CARD} delay={index * 140} transform={`translate(80 200) translate(${x} ${y}) rotate(${turn}) translate(0 -72)`} />
      ))}
      <Paper>
        <g transform="translate(80 128)">
          <Card className="t-card-back" clip={clip}>
            <TigerMountain />
          </Card>
          <Card className="t-card-middle" clip={clip}>
            <PersonPitch />
          </Card>
          <Card className="t-card-front" clip={clip}>
            <Graceland />
          </Card>
        </g>
      </Paper>
    </svg>
  );
}

/* Features' house, as the first front page drew it: five neurons dealt as a
   star with a chord across it on an orange square, which fall into the
   house's corners on hover while its ink silhouette appears beneath them. */
const HOUSE = FEATURE_SHAPES[0];
const HOUSE_EDGES = edgesOf(HOUSE);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function FeaturesThing({ solved = false }) {
  const [t, setT] = useState(0);
  const frame = useRef(0);
  const current = useRef(0);
  useEffect(() => {
    const target = solved ? 1 : 0;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setT(target);
      return undefined;
    }
    const from = current.current;
    const start = performance.now();
    const duration = 620 * Math.abs(target - from) || 1;
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      current.current = from + (target - from) * progress;
      setT(current.current);
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [solved]);
  const k = ease(t);
  const nodes = HOUSE.tangle.map(([x, y], index) => [x + (HOUSE.nodes[index][0] - x) * k, y + (HOUSE.nodes[index][1] - y) * k]);
  return (
    <svg className="thing-art thing-features" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      {ground(82, 52)}
      <Sketch d="M34 36h92v92H34z" />
      <Paper>
        <path d="M126 36l5 3.4v92l-5-3.4z" fill="#a9560d" />
        <path d="M34 36h92v92H34z" fill="#e97e18" />
        <g transform="translate(34 36) scale(.958)">
          <path d={HOUSE.fill} fill="#161a1d" opacity={k > 0.92 ? (k - 0.92) / 0.08 : 0} />
          <g className="t-graph">
            {HOUSE_EDGES.map(([a, b]) => (
              <line key={`${a}-${b}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
            ))}
            {nodes.map(([x, y], index) => (
              <circle key={index} cx={x} cy={y} r="4.6" />
            ))}
          </g>
        </g>
        <path className="t-ink" d="M34 36h92v92H34z" />
      </Paper>
    </svg>
  );
}

/* Websites: browser windows that fan open, the front one showing the mark of
   Português com a Inês — its cream, lilac and orange blobs on navy — and the
   one behind it Castle Bank's, the orange circuit C with its two terminals on
   cream, peeping out above. Dan dropped the splat behind them on 25 September
   2026. */
const windowShape = (x, y, w, h) => `M${x + 5} ${y}h${w - 10}a5 5 0 0 1 5 5v${h - 5}H${x}V${y + 5}a5 5 0 0 1 5-5z`;
const BACK = windowShape(34, 16, 96, 112);
const FRONT = windowShape(26, 48, 108, 80);

// Castle Bank's mark, traced from its card art (public/project-art/websites/
// castle-bank.webp) into a 100-unit box: two chamfered Cs as circuit traces,
// each ending in a ring.
function CastleBankMark() {
  return (
    <>
      <defs>
        <linearGradient id="t-castle-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fd8c0a" />
          <stop offset="1" stopColor="#f0661a" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#t-castle-orange)" strokeWidth="7.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M77 16H30L11 35v21l19 17.5h40" />
        <path d="M70 29H33l-8 8v13l10 10h42" />
      </g>
      <g fill="#f57a12">
        <circle cx="77" cy="16" r="8.4" />
        <circle cx="77" cy="60" r="8.4" />
      </g>
      <g fill="#fbf6ec">
        <circle cx="77" cy="16" r="3.4" />
        <circle cx="77" cy="60" r="3.4" />
      </g>
    </>
  );
}

export function WebsitesThing() {
  return (
    <svg className="thing-art thing-websites" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      {ground(80, 60)}
      <Sketch d={BACK} transform="rotate(-4 80 128)" />
      <Sketch d="M34 27h96" transform="rotate(-4 80 128)" delay={200} />
      <Sketch d={FRONT} transform="rotate(2 80 128)" delay={140} />
      <Sketch d="M26 60h108" transform="rotate(2 80 128)" delay={340} />
      <Paper>
        <g className="t-window t-window-back">
          <path d={BACK} fill="#fbf6ec" />
          <path d="M34 27h96" stroke="#2a2420" strokeOpacity=".2" />
          <circle cx="41" cy="21.5" r="1.8" fill="#f57a12" />
          <circle cx="47" cy="21.5" r="1.8" fill="#2a2420" fillOpacity=".25" />
          <circle cx="53" cy="21.5" r="1.8" fill="#2a2420" fillOpacity=".25" />
          <g transform="translate(92 28.5) scale(.38)">
            <CastleBankMark />
          </g>
          <path className="t-ink" d={BACK} />
        </g>
        <g className="t-window t-window-front">
          <path d={FRONT} fill="#12387d" />
          <path d="M26 60v-7a5 5 0 0 1 5-5h98a5 5 0 0 1 5 5v7z" fill="#f3ebd8" />
          <circle cx="34" cy="54" r="2.1" fill="#e5654c" />
          <circle cx="41" cy="54" r="2.1" fill="#efc319" />
          <circle cx="48" cy="54" r="2.1" fill="#5e9c4e" />
          <g transform="translate(44.3 59.7) scale(.7)">
            <path d={BLOBS.cream} fill="#f3e7d1" />
            <path d={BLOBS.lilac} fill="#b0aae7" />
            <path d={BLOBS.dot} fill="#f2613d" />
          </g>
          <path className="t-ink" d={`${FRONT}M26 60h108`} />
        </g>
      </Paper>
    </svg>
  );
}

/*
 * A dashed line can't draw itself (its dashes are the dash array), so it is
 * revealed instead: a solid copy of it in a mask is drawn in, and the dashes
 * show only where that copy has reached.
 */
function useMaskId(name) {
  return `t-${name}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

function Reveal({ id, d, width }) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="140">
      <path className="t-reveal" d={d} pathLength="1" fill="none" stroke="#fff" strokeWidth={width} strokeLinecap="round" />
    </mask>
  );
}

const TRAIL = "M14 122C34 118 44 104 54 94C66 82 78 76 72 64C66 54 52 62 60 72C68 82 90 72 104 58C112 50 118 44 126 40";

// Career: the paper plane flies in along its trail, laying it down behind it.
export function CareerThing() {
  const mask = useMaskId("trail");
  return (
    <svg className="thing-art thing-career" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      <defs>
        <Reveal id={mask} d={TRAIL} width="5" />
      </defs>
      {ground(118, 24)}
      <Sketch d={TRAIL} />
      <path className="t-trail" d={TRAIL} mask={`url(#${mask})`} />
      <Paper>
        <g className="t-plane-fly">
          <g className="t-plane">
            <path d="M152 24L108 40l14 3z" fill="#d9ccb4" />
            <path d="M152 24l-30 19 2 13z" fill="#bfae90" />
            <path d="M152 24L112 51l10-8z" fill="#fbf6ec" />
            <path d="M152 24L96 30l26 13z" fill="#fbf6ec" />
            <path className="t-ink" d="M152 24L96 30l26 13zM152 24L112 51l10-8M122 43l2 13 28-32" />
          </g>
        </g>
      </Paper>
    </svg>
  );
}

// Trek: a folded map. Its three panels are sketched one after another, the
// paper lands, the dashed route walks across it and the pin drops last.
const PANELS = ["M18 40l40-10v96l-40 4z", "M58 30l42 10v88l-42-2z", "M100 40l42-10v96l-42 2z"];
const ROUTE = "M26 112C36 104 44 108 52 96C58 88 66 90 72 80C80 68 90 72 98 62C106 52 116 58 124 48C128 43 131 40 134 36";

export function TrekThing() {
  const mask = useMaskId("route");
  return (
    <svg className="thing-art thing-trek" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      <defs>
        <Reveal id={mask} d={ROUTE} width="6" />
      </defs>
      {ground(80, 64)}
      {PANELS.map((d, index) => (
        <Sketch key={d} d={d} delay={index * 160} />
      ))}
      <Paper>
        <path d={PANELS[0]} fill="#f1e6cf" />
        <path d={PANELS[1]} fill="#dccca9" />
        <path d={PANELS[2]} fill="#f1e6cf" />
        <path d="M24 70c10-4 18 2 30-4M62 50c12 6 24 0 34 8M104 86c12-6 22 2 32-6M22 102c12 4 22-2 34 2" fill="none" stroke="#7f95c7" strokeOpacity=".55" strokeWidth="1.2" />
        <g mask={`url(#${mask})`}>
          <path className="t-route" d={ROUTE} />
        </g>
        <g className="t-pin">
          <path d="M134 36c0-6 4-10 8.5-10s8.5 4 8.5 10c0 6-8.5 14-8.5 14s-8.5-8-8.5-14z" transform="translate(-8.5 -14)" fill="#b3322d" />
          <circle cx="134" cy="22" r="2.8" fill="#fbf6ec" />
        </g>
        <path className="t-ink" d={PANELS.join("")} />
      </Paper>
    </svg>
  );
}

export const THINGS = {
  music: TasteThing,
  features: FeaturesThing,
  websites: WebsitesThing,
  career: CareerThing,
  trek: TrekThing
};
