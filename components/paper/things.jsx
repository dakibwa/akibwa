"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FEATURE_SHAPES, ringEdges, threadPath } from "./feature-shapes.mjs";

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

function Sketch({ d }) {
  return <path className="t-sketch" d={d} pathLength="1" />;
}

/*
 * Taste: a small hand of cards, each a cartoon of a favourite sleeve drawn
 * from its real artwork — Taking Tiger Mountain (By Strategy), Person Pitch
 * and Graceland — that fans open on hover. Faces are drawn in a 60-unit square.
 */
function Card({ className, clip, children }) {
  return (
    <g className={`t-card ${className}`}>
      <rect x="-33" y="-66" width="66" height="66" rx="4" fill="#fffdf8" />
      <g clipPath={`url(#${clip})`}>
        <g transform="translate(-30 -63)">{children}</g>
      </g>
      <rect className="t-ink" x="-33" y="-66" width="66" height="66" rx="4" />
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
          <rect x="-30" y="-63" width="60" height="60" rx="2" />
        </clipPath>
      </defs>
      {ground(80, 62)}
      <Sketch d="M47 62h66v66H47z" />
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

/* Features: five neurons on the game's paper, dealt as a star. On hover they
   untangle into a heart: the threads settle into its outline and it colours
   in, as the game resolves a shape, and it stays a heart rather than becoming
   a stamp. */
const HEART = FEATURE_SHAPES[0];
const HEART_EDGES = ringEdges(HEART.nodes.length);
const STAR = [[67.4, 76.7], [16.6, 39.8], [79.4, 39.8], [28.6, 76.7], [48, 17]];
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const after = (k, start) => Math.min(1, Math.max(0, (k - start) / (1 - start)));

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
    const duration = 820 * Math.abs(target - from) || 1;
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
  const nodes = STAR.map(([x, y], index) => [x + (HEART.nodes[index][0] - x) * k, y + (HEART.nodes[index][1] - y) * k]);
  const bend = ease(after(k, 0.5));
  return (
    <svg className="thing-art thing-features" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      {ground(82, 52)}
      <Sketch d="M34 32h92v92H34z" />
      <Paper>
        <path d="M126 32l5 3.4v92l-5-3.4z" fill="#c9c4b8" />
        <path d="M34 32h92v92H34z" fill="#EAE7DF" />
        <g transform="translate(34 32) scale(.958)">
          <path className="t-heart" d={HEART.fill} opacity={after(k, 0.72)} />
          <g className="t-graph">
            {HEART_EDGES.map(([a, b], index) => (
              <path key={`${a}-${b}`} d={threadPath(nodes[a], nodes[b], HEART.curves[index], bend)} />
            ))}
            {nodes.map(([x, y], index) => (
              <circle key={index} className="t-neuron" cx={x} cy={y} r="4.4" />
            ))}
          </g>
        </g>
        <path d="M34 124h23v4H34z" fill="#2EA3DC" />
        <path d="M57 124h23v4H57z" fill="#EFC319" />
        <path d="M80 124h23v4H80z" fill="#1FA45A" />
        <path d="M103 124h23v4h-23z" fill="#E97E18" />
        <path className="t-ink" d="M34 32h92v96H34z" />
      </Paper>
    </svg>
  );
}

/* Websites: three windows drawn from the sites themselves — Butterfly Rose at
   the back, Castle Bank, and Português com a Inês in front — that fan open. */
const windowShape = (x, y, w, h) => `M${x + 5} ${y}h${w - 10}a5 5 0 0 1 5 5v${h - 5}H${x}V${y + 5}a5 5 0 0 1 5-5z`;

// Castle Bank's orange particle swirl, as dots round an open ring.
const SWIRL = Array.from({ length: 30 }, (_, index) => {
  const angle = (-40 + index * 9.4) * (Math.PI / 180);
  const radius = 15 + ((index * 7) % 5) * 0.9;
  const size = 0.55 + ((index * 3) % 4) * 0.18;
  const x = round(104 + Math.cos(angle) * radius);
  const y = round(71 + Math.sin(angle) * radius);
  return `M${round(x - size)} ${y}a${round(size)} ${round(size)} 0 1 0 ${round(2 * size)} 0a${round(size)} ${round(size)} 0 1 0 ${round(-2 * size)} 0Z`;
}).join("");

export function WebsitesThing() {
  return (
    <svg className="thing-art thing-websites" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      {ground(80, 60)}
      <Sketch d={`${windowShape(28, 44, 104, 84)}M28 56h104`} />
      <Paper>
        <g className="t-window t-window-back">
          <path d={windowShape(34, 30, 96, 98)} fill="#f3eeeb" />
          <path d="M34 40.5h96" stroke="#2a2420" strokeOpacity=".14" />
          <path d="M40 35.4h13" stroke="#6b4a55" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M66 35.4h8M77 35.4h9M89 35.4h6M98 35.4h9" stroke="#2a2420" strokeOpacity=".35" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="113" y="32.6" width="11" height="5.6" rx="2.8" fill="#7c4650" />
          <path d="M40 50h14" stroke="#2a2420" strokeOpacity=".3" strokeLinecap="round" />
          <path d="M40 56h24M40 62h24M40 68h30" stroke="#3a2e31" strokeWidth="3" strokeLinecap="round" />
          <path d="M67 62h9" stroke="#8a5d69" strokeWidth="3" strokeLinecap="round" />
          <path d="M40 76h34M40 80h30M40 84h24" stroke="#2a2420" strokeOpacity=".3" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="40" y="89" width="22" height="6" rx="3" fill="#7c4650" />
          <path d="M88 44h36v64H88z" fill="#dcd8cd" />
          <circle cx="97" cy="59" r="5.6" fill="#eef0ee" stroke="#6d6a64" strokeWidth=".8" />
          <circle cx="112" cy="56" r="6.2" fill="#eef0ee" stroke="#6d6a64" strokeWidth=".8" />
          <path d="M88 94h36v14H88z" fill="#cfc9bf" />
          <path d="M91 96v-9a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v9zM106 96v-8a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v8z" fill="#7d7a71" />
          <path className="t-ink" d={`${windowShape(34, 30, 96, 98)}M34 40.5h96`} />
        </g>
        <g className="t-window t-window-middle">
          <path d={windowShape(30, 37, 100, 91)} fill="#ffffff" />
          <path d="M39.4 39.6a3 3 0 1 0 0 4.8" fill="none" stroke="#f26b1d" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M42.4 42h11" stroke="#1f1f1f" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M70 42h7M81 42h7M92 42h9" stroke="#1f1f1f" strokeOpacity=".45" strokeWidth="1.1" strokeLinecap="round" />
          <rect x="106.6" y="39.4" width="9" height="5.2" rx="2.6" fill="none" stroke="#1f1f1f" strokeWidth=".7" />
          <rect x="117.4" y="39.4" width="9.6" height="5.2" rx="2.6" fill="#25d366" />
          <path d="M30 48h100" stroke="#1f1f1f" strokeOpacity=".08" />
          <path d="M36 58h17" stroke="#f26b1d" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M57 58h30M42 65.5h38" stroke="#1f1f1f" strokeWidth="4.2" strokeLinecap="round" />
          <path d="M36 75h40M36 79h38M36 83h30" stroke="#1f1f1f" strokeOpacity=".35" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="36" y="89" width="20" height="6" rx="3" fill="#ff6c00" />
          <rect x="58.6" y="89" width="17" height="6" rx="3" fill="none" stroke="#1f1f1f" strokeWidth=".7" />
          <path d={SWIRL} fill="#f26b1d" opacity=".85" />
          <path className="t-ink" d={`${windowShape(30, 37, 100, 91)}M30 48h100`} />
        </g>
        <g className="t-window t-window-front">
          <path d={windowShape(28, 44, 104, 84)} fill="#dbd7f3" />
          <path d="M28 56v-7a5 5 0 0 1 5-5h94a5 5 0 0 1 5 5v7z" fill="#f3ebd8" />
          <path d="M34 50.5c1.5-2.4 3-2.4 2.6 0s1.2-2.2 2.6-.6 1.4-1.8 2.8-.3M35 53.8c1.4-1.2 3-1.2 4.4 0s3-1.2 4.4 0" fill="none" stroke="#2f56aa" strokeWidth=".9" strokeLinecap="round" />
          <path d="M88 50h8M100 50h7M111 50h5M120 50h7" stroke="#2f56aa" strokeOpacity=".85" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M28 56h58v72H28z" fill="#2f56aa" />
          <path d="M34 73c2-4 5-4 4.4 0s2.6-3.6 4.4-1 2.6-3 4.6-.6 2.8-2.2 4.4-.4M34 81c2-3 4.6-3 5.6 0s3.2-2.6 4.8-.4 3-2.4 4.6-.4 2.6-2 4-.2" fill="none" stroke="#fffdf8" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M34 87h26" stroke="#fffdf8" strokeOpacity=".6" strokeWidth=".6" />
          <path d="M34 93h30M34 97.5h24" stroke="#fffdf8" strokeOpacity=".85" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="34" y="104" width="18" height="7" rx="3.5" fill="#c46351" />
          <rect x="55" y="104" width="13" height="7" rx="3.5" fill="none" stroke="#fffdf8" strokeOpacity=".8" strokeWidth=".6" />
          <path d="M86 82.5h46M86 104.5h46" stroke="#2f56aa" strokeOpacity=".2" strokeWidth=".6" />
          {[60, 83, 105].map((y) => (
            <g key={y}>
              <circle cx="91.4" cy={y + 6.6} r="1.9" fill="#ef6142" />
              <circle cx="93.6" cy={y + 9.4} r="1.9" fill="#2f56aa" />
              <circle cx="90.2" cy={y + 10} r="1.7" fill="#8b6fd6" />
              <path d={`M99 ${y + 6.4}c1-1.6 2.4-1.6 2.4 0s1.4-1.4 2.4 0 1.4-1.2 2.4 0`} fill="none" stroke="#2f56aa" strokeWidth=".9" strokeLinecap="round" />
              <path d={`M99 ${y + 11}h24M99 ${y + 14.5}h19`} stroke="#2a2420" strokeOpacity=".35" strokeWidth="1" strokeLinecap="round" />
            </g>
          ))}
          <path className="t-ink" d={`${windowShape(28, 44, 104, 84)}M28 56h104M86 56v72`} />
        </g>
      </Paper>
    </svg>
  );
}

export function CareerThing() {
  return (
    <svg className="thing-art thing-career" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      {ground(118, 24)}
      <Sketch d="M14 122C34 118 44 104 54 94C66 82 78 76 72 64C66 54 52 62 60 72C68 82 90 72 104 58C112 50 118 44 126 40" />
      <path className="t-trail" d="M14 122C34 118 44 104 54 94C66 82 78 76 72 64C66 54 52 62 60 72C68 82 90 72 104 58C112 50 118 44 126 40" />
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

export function TrekThing() {
  return (
    <svg className="thing-art thing-trek" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      {ground(80, 64)}
      <Sketch d="M18 40l40-10v96l-40 4zM58 30l42 10v88l-42-2zM100 40l42-10v96l-42 2z" />
      <Paper>
        <path d="M18 40l40-10v96l-40 4z" fill="#f1e6cf" />
        <path d="M58 30l42 10v88l-42-2z" fill="#dccca9" />
        <path d="M100 40l42-10v96l-42 2z" fill="#f1e6cf" />
        <path d="M24 70c10-4 18 2 30-4M62 50c12 6 24 0 34 8M104 86c12-6 22 2 32-6M22 102c12 4 22-2 34 2" fill="none" stroke="#7f95c7" strokeOpacity=".55" strokeWidth="1.2" />
        <path className="t-route" d="M26 112C36 104 44 108 52 96C58 88 66 90 72 80C80 68 90 72 98 62C106 52 116 58 124 48C128 43 131 40 134 36" />
        <g className="t-pin">
          <path d="M134 36c0-6 4-10 8.5-10s8.5 4 8.5 10c0 6-8.5 14-8.5 14s-8.5-8-8.5-14z" transform="translate(-8.5 -14)" fill="#b3322d" />
          <circle cx="134" cy="22" r="2.8" fill="#fbf6ec" />
        </g>
        <path className="t-ink" d="M18 40l40-10v96l-40 4zM58 30l42 10v88l-42-2zM100 40l42-10v96l-42 2z" />
      </Paper>
    </svg>
  );
}

export const THINGS = {
  taste: TasteThing,
  features: FeaturesThing,
  websites: WebsitesThing,
  career: CareerThing,
  trek: TrekThing
};
