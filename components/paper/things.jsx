"use client";

import { useEffect, useId, useRef, useState } from "react";
import { NET } from "./feature-shapes.mjs";
import { BLOBS } from "./websites-art.mjs";
import { Graceland, PersonPitch, TigerMountain } from "./sleeves";

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
 * (sleeves.jsx) and set 1.3 times larger on 84-unit cards, the size of the
 * other things.
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

/* Features: a messy neural net on the game's board that resolves under the
   pointer (Dan, 21 October 2026: “can it not just be a representation look
   like a neural messy net that when you hover it resolves”, and “I think
   having the board background is still a good thing”). It is drawn as
   features.games draws a board: its paper and faint lattice, each feature one
   closed loop in one colour with a ring at every neuron, and an ink conflict
   wherever two threads cross. On hover the neurons glide home one after
   another, each ring springing as it lands, each conflict clears as its
   threads part, and every thread settles into its feature's outline, heavier,
   under a passing light, as the game frees it: a heart, a house and a droplet
   (feature-shapes.mjs). */
const BOARD = { x: 18, y: 36, w: 124, h: 92 };
const BOARD_PATH = `M${BOARD.x} ${BOARD.y}h${BOARD.w}v${BOARD.h}H${BOARD.x}z`;
// The game's lattice: rows of cells as tall as they are wide, every other row
// half a cell aside, each meeting joined to its six neighbours; nine across.
const CELL = BOARD.w / 9;
const OVER = Math.ceil(BOARD.h / 2 / CELL);
const LATTICE = [
  ...Array.from({ length: Math.ceil(BOARD.h / CELL) - 1 }, (_, k) => `M${BOARD.x} ${round(BOARD.y + CELL * (k + 1))}h${BOARD.w}`),
  ...Array.from({ length: 10 + 2 * OVER }, (_, i) => {
    const x = round(BOARD.x + CELL * (i - OVER));
    return `M${x} ${BOARD.y}l${BOARD.h / 2} ${BOARD.h}M${x} ${BOARD.y}l${-BOARD.h / 2} ${BOARD.h}`;
  })
].join("");
// The game's marks (MARK in features.games) at a third of their size: the
// ring and its stroke, the thread, a freed thread's heavier line, and a
// conflict, a paper halo round an ink ring with a paper centre.
const MARK = { r: 3.4, ring: 1.19, thread: 2.24, freed: 3.6, halo: 2.13, dot: 1.45, dotInk: 0.58 };
const at = ([x, y]) => `${round(x)} ${round(y)}`;
// How far one step of the resolve has come, once the whole has reached `from`.
const phase = (k, from, span) => Math.min(1, Math.max(0, (k - from) / span));
const smooth = (p) => p * p * (3 - 2 * p);
// Each neuron glides home as if dragged there, a beat after the one before
// (when it leaves, as a share of the whole resolve), and its ring springs on
// landing, as the game springs a dropped neuron into its place.
const leaves = (f, i) => f * 0.08 + i * 0.03;
const GLIDE = 0.42;
const glide = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x ** 3 : 1 - (2 - 2 * x) ** 3 / 2);
const landing = (x) => (x <= 0 || x >= 1 ? 0 : Math.exp(-4 * x) * Math.sin(3 * Math.PI * x));

// Each thread is straight between its neurons until it settles; neighbours on
// one loop meet at a neuron and never conflict.
function conflicts(loops) {
  const lines = loops.flatMap((points, f) => points.map((a, i) => ({ a, b: points[(i + 1) % points.length], f, i, n: points.length })));
  const found = [];
  lines.forEach((p, m) => {
    for (const q of lines.slice(m + 1)) {
      if (p.f === q.f && (q.i - p.i === 1 || q.i - p.i === p.n - 1)) continue;
      const [rx, ry] = [p.b[0] - p.a[0], p.b[1] - p.a[1]];
      const [sx, sy] = [q.b[0] - q.a[0], q.b[1] - q.a[1]];
      const across = rx * sy - ry * sx;
      if (!across) continue;
      const [ax, ay] = [q.a[0] - p.a[0], q.a[1] - p.a[1]];
      const t = (ax * sy - ay * sx) / across;
      const u = (ax * ry - ay * rx) / across;
      if (t > 0 && t < 1 && u > 0 && u < 1) found.push([p.a[0] + rx * t, p.a[1] + ry * t]);
    }
  });
  return found;
}

// One feature's loop through its neurons, its threads bent into the outline
// as far as it has settled (0 to 1).
function loopPath(points, edges, settled) {
  let d = `M${at(points[0])}`;
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length];
    const [cx, cy] = [b[0] - a[0], b[1] - a[1]];
    if (settled > 0)
      for (const [share, along, side] of edges[i]) {
        const u = share + (along - share) * settled;
        const v = side * settled;
        d += `L${at([a[0] + u * cx - v * cy, a[1] + u * cy + v * cx])}`;
      }
    d += i === points.length - 1 ? "Z" : `L${at(b)}`;
  });
  return d;
}

export function FeaturesThing({ solved = false }) {
  const [k, setK] = useState(0);
  const frame = useRef(0);
  const current = useRef(0);
  const clip = `t-board-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  useEffect(() => {
    const target = solved ? 1 : 0;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setK(target);
      return undefined;
    }
    const from = current.current;
    const start = performance.now();
    // Resolving takes a little longer than knotting up again.
    const duration = (target ? 1300 : 750) * Math.abs(target - from) || 1;
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      current.current = from + (target - from) * progress;
      setK(current.current);
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [solved]);
  // The heart's neurons leave first, then the house's, then the droplet's,
  // and each feature settles as its last lands, by when every conflict has
  // long cleared.
  const loops = NET.map((feature, f) =>
    feature.rest.map(([x, y], i) => {
      const p = glide((k - leaves(f, i)) / GLIDE);
      const [hx, hy] = feature.home[i];
      return [x + (hx - x) * p, y + (hy - y) * p];
    })
  );
  const rings = NET.map((feature, f) => feature.rest.map((_, i) => round(MARK.r * (1 + 0.25 * landing((k - leaves(f, i) - GLIDE) / 0.2)))));
  const settled = NET.map((feature, f) => smooth(phase(k, leaves(f, feature.rest.length - 1) + GLIDE - 0.04, 0.28)));
  const paths = NET.map((feature, f) => loopPath(loops[f], feature.edges, settled[f]));
  return (
    <svg className="thing-art thing-features" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={BOARD_PATH} />
        </clipPath>
      </defs>
      {ground(80, 64)}
      <Sketch d={BOARD_PATH} />
      <Paper>
        <path className="t-board" d={BOARD_PATH} />
        <path className="t-lattice" d={LATTICE} clipPath={`url(#${clip})`} />
        {NET.map((feature, f) => (
          <path key={feature.key} className="t-thread" d={paths[f]} stroke={feature.colour} strokeWidth={round(MARK.thread + (MARK.freed - MARK.thread) * settled[f])} />
        ))}
        {NET.map((feature, f) =>
          loops[f].map(([x, y], i) => <circle key={`${feature.key}-${i}`} className="t-neuron" cx={round(x)} cy={round(y)} r={rings[f][i]} stroke={feature.colour} strokeWidth={MARK.ring} />)
        )}
        {/* As in the game, conflicts lie over every neuron. */}
        {conflicts(loops).map(([x, y], i) => (
          <g key={i} className="t-conflict">
            <circle cx={round(x)} cy={round(y)} r={MARK.halo} />
            <circle cx={round(x)} cy={round(y)} r={MARK.dot} strokeWidth={MARK.dotInk} />
          </g>
        ))}
        {/* A light runs along each thread as it comes free. */}
        {NET.map((feature, f) =>
          settled[f] > 0 && settled[f] < 1 ? (
            <path
              key={`${feature.key}-light`}
              className="t-release"
              d={paths[f]}
              pathLength="1"
              strokeWidth={round(MARK.thread + (MARK.freed - MARK.thread) * settled[f])}
              strokeDashoffset={round(0.1 - 1.1 * settled[f])}
              opacity={round(0.6 * Math.sin(Math.PI * settled[f]))}
            />
          ) : null
        )}
        <path className="t-ink" d={BOARD_PATH} />
      </Paper>
    </svg>
  );
}

/* Websites: browser windows that fan open, the front one showing the mark of
   Português com a Inês — its cream, lilac and orange blobs on navy — and the
   one behind it Castle Bank's, the orange circuit C with its two terminals on
   cream. The back window keeps its first size, so only the C's top stroke and
   terminal peep out above the front one (Dan, 26 September 2026: it needn't
   be obvious). Between them, leaning the other way so its corner peeps out on
   the left, is Butterfly Rose's: a butterfly over a rose and ribbons of hair
   on the salon's burgundy (Dan, 19 October 2026: “there's three websites too
   so add butterfly rose”). Dan dropped the splat behind them on 25 September
   2026. */
const windowShape = (x, y, w, h) => `M${x + 5} ${y}h${w - 10}a5 5 0 0 1 5 5v${h - 5}H${x}V${y + 5}a5 5 0 0 1 5-5z`;
const BACK = windowShape(34, 38, 96, 90);
const MIDDLE = windowShape(26, 46, 98, 76);
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

// Butterfly Rose's marks, after Dan's card art (public/project-art/websites/
// butterfly-rose.webp): a pale butterfly with blush underwings, and a rose
// furled in two pinks, each in its own box centred on 0 0.
function Butterfly() {
  return (
    <>
      <path d="M0 0C-1.8-4.6-6.6-8.4-10-6.8-12.6-5.6-11.4-1.4-7.6.2-5 1.2-2.4.8 0 0Z" fill="#f7dcd8" />
      <path d="M0 0C1.8-4.6 6.6-8.4 10-6.8 12.6-5.6 11.4-1.4 7.6.2 5 1.2 2.4.8 0 0Z" fill="#f7dcd8" />
      <path d="M0 .4C-1.6 2.6-4.6 6-7 5.2-8.8 4.6-8 1.8-5.6.8-3.6 0-1.6.2 0 .4Z" fill="#e7a9ad" />
      <path d="M0 .4C1.6 2.6 4.6 6 7 5.2 8.8 4.6 8 1.8 5.6.8 3.6 0 1.6.2 0 .4Z" fill="#e7a9ad" />
      <path d="M-7.6-3.2c1.8-.2 3.6.4 5 1.6M7.6-3.2c-1.8-.2-3.6.4-5 1.6" fill="none" stroke="#d58f96" strokeWidth=".8" strokeLinecap="round" />
      <path d="M0-4.6v6.6" stroke="#3f1520" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M-.4-4.4c-.6-2-1.8-3.2-3.2-3.8M.4-4.4c.6-2 1.8-3.2 3.2-3.8" fill="none" stroke="#3f1520" strokeWidth=".7" strokeLinecap="round" />
    </>
  );
}

function Rose() {
  return (
    <>
      <path d="M-7.4 1.6c-2.6-1.4-4.4.8-3.4 2.6 1 1.6 3.4 1.4 4.6-.6M6.8 2c2.8-1.2 4.4 1 3.2 2.8-1.2 1.4-3.6 1-4.6-1" fill="#7a9b6e" />
      <circle r="6.6" fill="#c76b7b" />
      <path d="M-4.6-.6c.6-3.6 5.4-4.6 7.4-1.6 1.6 2.6-.8 5.6-3.6 4.6-2-.8-1.8-3.4.2-3.6" fill="none" stroke="#8e3a4b" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M-5.8 2.4c1.4 3 6.4 3.8 9 1.2" fill="none" stroke="#e39aa5" strokeWidth="1.1" strokeLinecap="round" />
    </>
  );
}

export function WebsitesThing() {
  const clip = `t-salon-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className="thing-art thing-websites" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={MIDDLE} />
        </clipPath>
      </defs>
      {ground(80, 60)}
      <Sketch d={BACK} transform="rotate(-4 80 128)" />
      <Sketch d="M34 46h96" transform="rotate(-4 80 128)" delay={200} />
      <Sketch d={MIDDLE} transform="rotate(8 80 128)" delay={70} />
      <Sketch d="M26 58h98" transform="rotate(8 80 128)" delay={270} />
      <Sketch d={FRONT} transform="rotate(2 80 128)" delay={140} />
      <Sketch d="M26 60h108" transform="rotate(2 80 128)" delay={340} />
      <Paper>
        <g className="t-window t-window-back">
          <path d={BACK} fill="#fbf6ec" />
          <path d="M34 46h96" stroke="#2a2420" strokeOpacity=".2" />
          <circle cx="40" cy="42" r="1.5" fill="#f57a12" />
          <circle cx="45" cy="42" r="1.5" fill="#2a2420" fillOpacity=".25" />
          <circle cx="50" cy="42" r="1.5" fill="#2a2420" fillOpacity=".25" />
          <g transform="translate(95 43.5) scale(.33)">
            <CastleBankMark />
          </g>
          <path className="t-ink" d={BACK} />
        </g>
        <g className="t-window t-window-middle">
          <path d={MIDDLE} fill="#6c2a37" />
          <path d="M26 58v-7a5 5 0 0 1 5-5h88a5 5 0 0 1 5 5v7z" fill="#f0d0cd" />
          <circle cx="33" cy="52" r="1.9" fill="#c9566c" />
          <circle cx="39.4" cy="52" r="1.9" fill="#2a2420" fillOpacity=".22" />
          <circle cx="45.8" cy="52" r="1.9" fill="#2a2420" fillOpacity=".22" />
          {/* Ribbons of hair sweep across, under a butterfly and a rose. */}
          <g clipPath={`url(#${clip})`}>
            <path d="M26 88c10-8 20 4 32-3s20-14 34-6 20 2 32-6" fill="none" stroke="#a24a5a" strokeWidth="5.4" strokeLinecap="round" />
            <path d="M26 100c12-7 22 3 34-3s22-12 36-4 16 2 28-4" fill="none" stroke="#bf6576" strokeWidth="3.6" strokeLinecap="round" />
            <path d="M26 111c14-5 26 2 38-2s24-9 38-3" fill="none" stroke="#8a3a49" strokeWidth="2.6" strokeLinecap="round" />
            <g transform="translate(42 73) rotate(-14) scale(1.15)">
              <Butterfly />
            </g>
            <g transform="translate(38 102)">
              <Rose />
            </g>
          </g>
          <path className="t-ink" d={`${MIDDLE}M26 58h98`} />
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
