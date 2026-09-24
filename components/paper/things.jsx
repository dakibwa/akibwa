"use client";

import { useEffect, useRef, useState } from "react";

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

export function MusicThing() {
  return (
    <svg className="thing-art thing-music" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      {ground(80, 62)}
      <Sketch d="M24 34h78v94H24zM148 74a46 46 0 1 1-92 0a46 46 0 1 1 92 0" />
      <Paper>
        <g className="t-record-slide">
          <g className="t-record">
            <circle cx="102" cy="74" r="46" fill="#1f1b19" />
            <g fill="none" stroke="#3b3632" strokeWidth=".9">
              <circle cx="102" cy="74" r="40" />
              <circle cx="102" cy="74" r="34" />
              <circle cx="102" cy="74" r="28" />
              <circle cx="102" cy="74" r="22" />
            </g>
            <circle cx="102" cy="74" r="14" fill="#d8434b" />
            <path d="M102 62.5v5" stroke="#fbf6ec" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="102" cy="74" r="2.2" fill="#f4ede0" />
          </g>
          <path d="M112 40a36 36 0 0 1 22 18" fill="none" stroke="#ffffff" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="M102 34l5 3.4v94l-5-3.4z" fill="#1b2352" />
        <path d="M24 34h78v94H24z" fill="#2e3a7a" />
        <circle cx="63" cy="80" r="23" fill="#f2a93b" />
        <path d="M49 80h28M63 66v28" stroke="#2e3a7a" strokeOpacity=".25" strokeWidth="1.2" />
        <path d="M36 117h30" stroke="#f4ede0" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" />
        <path className="t-ink" d="M24 34h78v94H24z" />
      </Paper>
    </svg>
  );
}

/* Features' house: five neurons that untangle into its outline on hover. */
const HOUSE = "M44 18Q48 14 52 18L83 46Q87 50 82 52H76V78Q76 82 72 82H56V60H40V82H24Q20 82 20 78V52H14Q9 50 13 46Z";
const SOLVED = [[48, 15], [85, 49], [76, 82], [20, 82], [11, 49]];
const TANGLED = [[48, 18], [22, 72], [80, 38], [14, 36], [74, 76]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 4]];
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function PlayThing({ solved = false }) {
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
  const nodes = TANGLED.map(([x, y], index) => [x + (SOLVED[index][0] - x) * k, y + (SOLVED[index][1] - y) * k]);
  return (
    <svg className="thing-art thing-play" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      {ground(82, 52)}
      <Sketch d="M34 36h92v92H34z" />
      <Paper>
        <path d="M126 36l5 3.4v92l-5-3.4z" fill="#a9560d" />
        <path d="M34 36h92v92H34z" fill="#e97e18" />
        <g transform="translate(34 36) scale(.958)">
          <path d={HOUSE} fill="#161a1d" opacity={k > 0.92 ? (k - 0.92) / 0.08 : 0} />
          <g className="t-graph">
            {EDGES.map(([a, b]) => (
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

export function WebsitesThing() {
  const windowShape = (x, y, w, h) => `M${x + 5} ${y}h${w - 10}a5 5 0 0 1 5 5v${h - 5}H${x}V${y + 5}a5 5 0 0 1 5-5z`;
  return (
    <svg className="thing-art thing-websites" viewBox="0 0 160 140" aria-hidden="true" focusable="false">
      {ground(80, 60)}
      <Sketch d={`${windowShape(28, 44, 104, 84)}M28 58h104`} />
      <Paper>
        <g className="t-window t-window-back">
          <path d={windowShape(34, 30, 96, 98)} fill="#7faaff" />
          <path d="M34 42h96" stroke="#2a2420" strokeOpacity=".2" />
          <path className="t-ink" d={windowShape(34, 30, 96, 98)} />
        </g>
        <g className="t-window t-window-middle">
          <path d={windowShape(30, 37, 100, 91)} fill="#f2c14e" />
          <path d="M30 49h100" stroke="#2a2420" strokeOpacity=".2" />
          <path className="t-ink" d={windowShape(30, 37, 100, 91)} />
        </g>
        <g className="t-window t-window-front">
          <path d={windowShape(28, 44, 104, 84)} fill="#fbf6ec" />
          <path d="M28 44h99a5 5 0 0 1 5 5v9H28v-9a5 5 0 0 1 5-5z" fill="#e7dcc7" />
          <circle cx="37" cy="51" r="2.2" fill="#d8434b" />
          <circle cx="44" cy="51" r="2.2" fill="#f2a93b" />
          <circle cx="51" cy="51" r="2.2" fill="#5e9c4e" />
          <path d="M38 68h50v24H38z" fill="#f76a2b" />
          <path d="M96 70h26M96 78h20M96 86h24M38 104h84M38 112h60" stroke="#2a2420" strokeOpacity=".32" strokeWidth="3" strokeLinecap="round" />
          <path className="t-ink" d={`${windowShape(28, 44, 104, 84)}M28 58h104`} />
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
  music: MusicThing,
  play: PlayThing,
  websites: WebsitesThing,
  career: CareerThing,
  trek: TrekThing
};
