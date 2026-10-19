"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HOUSE } from "./feature-shapes.mjs";
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

/* Features as the game draws it now (features.games, October 2026: the clear
   six and the ink direction). Its board lies on the game's faint lattice
   under the wordmark's four-colour rule, in a stamp's proportions, and the
   house's five neurons are dealt on it as a star with a chord across it, each
   thread and its ring in a colour of its own (Dan, 26 September 2026). On
   hover they untangle into the house's corners and the board becomes the
   stamp they make (Dan, 19 October 2026: “based on our new theme of features
   can we update the thing?”): the threads lift away as the house inks in on
   its orange plate, the mount takes the plate's tint and the six colours fill
   its foot one after another. */
// The wordmark's rule, left to right, along the top of the board.
const BAND = ["#22A3DD", "#EFC319", "#279B57", "#DD700C"];
// Round the house blue, yellow, pink, green and violet, then the chord in
// orange: no two threads alike.
const THREAD_COLOURS = ["#22A3DD", "#EFC319", "#DA327B", "#279B57", "#7A68B6", "#DD700C"];
// A collected stamp's foot, in the collection's rail order.
const RAIL = ["#DA327B", "#DD700C", "#EFC319", "#279B57", "#22A3DD", "#7A68B6"];
// The house's plate and its mount, the plate's colour at 26% on the game's
// stamp paper; the glyph is the game's emblem ink.
const STAMP = { paper: "#fbfaf6", mount: "#f3d6b9", plate: "#dd700c", ink: "#0e1214" };
// The outline's threads, and the chord that crosses the house.
const OUTLINE = HOUSE.threads.slice(0, -1);
const CHORD = HOUSE.threads.at(-1);
// A stamp is mounted 102 wide and 110 tall, with 3 units round its square
// plate and an 11-unit foot; the board is one, 92 wide, standing on the ground.
const UNIT = 92 / 102;
const BOARD = { x: 34, y: 128 - 110 * UNIT, w: 92, h: 110 * UNIT };
const PLATE = { x: BOARD.x + 3 * UNIT, y: BOARD.y + 3 * UNIT, side: 96 * UNIT };
const BOARD_PATH = `M${BOARD.x} ${round(BOARD.y)}h${BOARD.w}v${round(BOARD.h)}H${BOARD.x}z`;
// The lattice: rows of triangles, each row offset by half a cell, eight cells
// across the board.
const CELL = BOARD.w / 8;
const ROW = (CELL * Math.sqrt(3)) / 2;
const RUN = BOARD.h / Math.sqrt(3);
const LATTICE = [
  ...Array.from({ length: Math.floor(BOARD.h / ROW) }, (_, k) => `M${BOARD.x} ${round(BOARD.y + ROW * (k + 1))}h${BOARD.w}`),
  ...Array.from({ length: 14 }, (_, i) => {
    const x = BOARD.x + CELL * (i - 5);
    return `M${round(x)} ${round(BOARD.y)}l${round(RUN)} ${round(BOARD.h)}M${round(x + CELL * 5)} ${round(BOARD.y)}l${round(-RUN)} ${round(BOARD.h)}`;
  })
].join("");
const at = ([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// How far one step of the mint has come, once the whole has reached `from`.
const phase = (k, from, span) => Math.min(1, Math.max(0, (k - from) / span));
// A spring's overshoot, for the plate landing.
const back = (p) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;

export function FeaturesThing({ solved = false }) {
  const [t, setT] = useState(0);
  const frame = useRef(0);
  const current = useRef(0);
  const clip = `t-board-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  useEffect(() => {
    const target = solved ? 1 : 0;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setT(target);
      return undefined;
    }
    const from = current.current;
    const start = performance.now();
    // Minting takes a little longer than undoing it.
    const duration = (target ? 1150 : 720) * Math.abs(target - from) || 1;
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
  const k = t;
  const move = ease(phase(k, 0, 0.56));
  const nodes = HOUSE.tangle.map(([x, y], index) => [x + (HOUSE.nodes[index][0] - x) * move, y + (HOUSE.nodes[index][1] - y) * move]);
  const mount = phase(k, 0.54, 0.2);
  const plate = phase(k, 0.58, 0.22);
  const ink = phase(k, 0.62, 0.16);
  const lift = phase(k, 0.66, 0.16);
  const grow = 0.78 + 0.22 * back(plate);
  const centre = PLATE.side / 2;
  return (
    <svg className="thing-art thing-features" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={BOARD_PATH} />
        </clipPath>
      </defs>
      {ground(80, 52)}
      <Sketch d={BOARD_PATH} />
      <Paper>
        <path d={BOARD_PATH} fill={STAMP.paper} />
        <path className="t-lattice" d={LATTICE} clipPath={`url(#${clip})`} />
        <path d={BOARD_PATH} fill={STAMP.mount} opacity={mount} />
        {BAND.map((colour, index) => (
          <path key={colour} d={`M${BOARD.x + index * 23} ${round(BOARD.y)}h23v4.4h-23z`} fill={colour} opacity={1 - mount} />
        ))}
        {RAIL.map((colour, index) => {
          // One after another, the last full by the end, so the foot spans
          // the plate's width with an even margin on each side.
          const filled = phase(k, 0.74 + index * 0.03, 0.1);
          return filled ? (
            <path key={colour} d={`M${round(BOARD.x + (3 + 16 * index) * UNIT)} ${round(BOARD.y + 102 * UNIT)}h${round(16.05 * UNIT * filled)}v${round(5 * UNIT)}h${round(-16.05 * UNIT * filled)}z`} fill={colour} />
          ) : null;
        })}
        <g transform={`translate(${round(PLATE.x)} ${round(PLATE.y)})`}>
          {plate ? (
            <rect width={round(PLATE.side)} height={round(PLATE.side)} fill={STAMP.plate} opacity={Math.min(1, plate * 2.2)} transform={`translate(${round(centre)} ${round(centre)}) scale(${round(grow)}) translate(${round(-centre)} ${round(-centre)})`} />
          ) : null}
          <g transform={`scale(${round(UNIT)})`}>
            {/* The chord, the last thread, lies under the house's ink. */}
            <g className="t-graph" opacity={1 - lift}>
              <path d={`M${CHORD.map((n) => at(nodes[n])).join("L")}`} stroke={THREAD_COLOURS[OUTLINE.length]} />
            </g>
            <path d={HOUSE.fill} fill={STAMP.ink} opacity={ink} />
            <g className="t-graph" opacity={1 - lift}>
              {OUTLINE.map((thread, index) => (
                <path key={thread.join("-")} d={`M${thread.map((n) => at(nodes[n])).join("L")}`} stroke={THREAD_COLOURS[index]} />
              ))}
              {nodes.map(([x, y], index) => (
                <circle key={index} cx={x} cy={y} r="4.6" stroke={THREAD_COLOURS[index]} />
              ))}
            </g>
          </g>
        </g>
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
