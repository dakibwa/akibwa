"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Arrow } from "./arrow";
import { FEATURE_SHAPES, crossingPoints, edgesOf, threadPath } from "./feature-shapes.mjs";

/*
 * A small taste of Features: a ring of neurons to untangle on the page. Drag
 * the dots (or focus one and use the arrow keys) until no threads cross; the
 * dots then settle onto the shape they were all along, the threads bend into
 * its outline and its silhouette inks in — the front page's house first, dealt
 * as the same star, then a star, a heart and a leaf.
 */
const BOARD = 100;
const INSET = 2;
const toBoard = ([x, y]) => [INSET + x * ((BOARD - 2 * INSET) / 96), INSET + y * ((BOARD - 2 * INSET) / 96)];
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const dealt = (shape) => shape.tangle.map(toBoard);

function crosses([a, b], [c, d]) {
  const turn = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0;
}

function crossings(nodes, edges) {
  const found = new Set();
  edges.forEach((one, i) => {
    edges.forEach((two, j) => {
      if (j <= i || one.some((n) => two.includes(n))) return;
      if (crosses([nodes[one[0]], nodes[one[1]]], [nodes[two[0]], nodes[two[1]]])) {
        found.add(i);
        found.add(j);
      }
    });
  });
  return found;
}

export function FeaturesRoom() {
  const [which, setWhich] = useState(0);
  const shape = FEATURE_SHAPES[which];
  const edges = edgesOf(shape);
  const [nodes, setNodes] = useState(() => dealt(FEATURE_SHAPES[0]));
  const [bend, setBend] = useState(0);
  const [solved, setSolved] = useState(false);
  const [found, setFound] = useState([]);
  const [releases, setReleases] = useState(0);
  const board = useRef(null);
  const drag = useRef(null);
  const settle = useRef(0);
  const crossed = crossings(nodes, edges);
  const rings = solved ? [] : crossingPoints(nodes, edges);

  // Untangled: glide the dots onto the outline, bend the threads into it and
  // colour the shape in.
  useEffect(() => {
    if (solved || crossed.size || drag.current !== null) return;
    setSolved(true);
    setFound((list) => (list.includes(which) ? list : [...list, which]));
    const target = shape.nodes.map(toBoard);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setNodes(target);
      setBend(1);
      return;
    }
    const from = nodes;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1000);
      const k = ease(Math.min(1, t / 0.7));
      setNodes(from.map(([x, y], i) => [x + (target[i][0] - x) * k, y + (target[i][1] - y) * k]));
      setBend(ease(Math.max(0, (t - 0.45) / 0.55)));
      if (t < 1) settle.current = requestAnimationFrame(step);
    };
    // The settling belongs to the solved shape, so marking it solved must not
    // cancel it; only the next shape or leaving the page does.
    settle.current = requestAnimationFrame(step);
    // The crossing count, checked again whenever a dot is let go.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossed.size, solved, releases]);
  useEffect(() => () => cancelAnimationFrame(settle.current), []);

  const next = () => {
    const upcoming = (which + 1) % FEATURE_SHAPES.length;
    cancelAnimationFrame(settle.current);
    setWhich(upcoming);
    setSolved(false);
    setBend(0);
    setNodes(dealt(FEATURE_SHAPES[upcoming]));
  };

  const pointFor = useCallback((event) => {
    const svg = board.current;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM().inverse());
    return [Math.max(4, Math.min(96, local.x)), Math.max(4, Math.min(96, local.y))];
  }, []);

  const onPointerDown = (index) => (event) => {
    if (solved) return;
    event.preventDefault();
    drag.current = index;
    board.current.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (drag.current === null) return;
    const [x, y] = pointFor(event);
    setNodes((list) => list.map((node, i) => (i === drag.current ? [x, y] : node)));
  };
  const onPointerUp = (event) => {
    if (drag.current === null) return;
    drag.current = null;
    board.current.releasePointerCapture?.(event.pointerId);
    setReleases((value) => value + 1);
  };
  const onKeyDown = (index) => (event) => {
    const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!(event.key in steps) || solved) return;
    event.preventDefault();
    const size = event.shiftKey ? 8 : 3;
    const [dx, dy] = steps[event.key];
    setNodes((list) => list.map((node, i) => (i === index ? [Math.max(4, Math.min(96, node[0] + dx * size)), Math.max(4, Math.min(96, node[1] + dy * size))] : node)));
  };

  return (
    <div className="room-body play">
      <div className="play-board-wrap">
        <svg
          className={`play-board${solved ? " is-solved" : ""}`}
          ref={board}
          viewBox={`0 0 ${BOARD} ${BOARD}`}
          style={{ "--shape": shape.colour }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="group"
          aria-label={solved ? `Untangled: ${shape.name}` : "A tangled network. Move the dots until no lines cross."}
        >
          <g
            className="play-shape"
            transform={`translate(${INSET} ${INSET}) scale(${(BOARD - 2 * INSET) / 96})`}
            opacity={Math.round(Math.max(0, (bend - 0.55) / 0.45) * 1000) / 1000}
          >
            <path d={shape.fill} />
            {shape.stem ? <path className="play-stem" d={shape.stem} /> : null}
          </g>
          {edges.map(([a, b], index) => (
            <path
              key={`${a}-${b}`}
              className={`play-edge${crossed.has(index) ? " is-crossed" : ""}`}
              d={threadPath(nodes[a], nodes[b], shape.curves[index], bend, toBoard)}
            />
          ))}
          {rings.map(([x, y], index) => (
            <circle key={index} className="play-crossing" cx={x} cy={y} r="1.8" />
          ))}
          {nodes.map(([x, y], index) => (
            <g key={index} className="play-node" transform={`translate(${x} ${y})`}>
              <circle className="play-hit" r="7" onPointerDown={onPointerDown(index)} />
              <circle
                className="play-dot"
                r="3.4"
                tabIndex={solved ? -1 : 0}
                role="button"
                aria-label={`Dot ${index + 1} of ${nodes.length}. Use the arrow keys to move it.`}
                onPointerDown={onPointerDown(index)}
                onKeyDown={onKeyDown(index)}
              />
            </g>
          ))}
        </svg>
        <p className="play-status" aria-live="polite">
          {solved ? (
            <>
              untangled — <strong>{shape.name}</strong>.
            </>
          ) : (
            <>
              {rings.length ? `${rings.length} ${rings.length === 1 ? "crossing" : "crossings"} left.` : "Let go to check."}{" "}
              Drag the dots until no lines cross.
            </>
          )}
        </p>
      </div>

      <div className="play-side">
        <p className="play-name">
          features
          <svg className="play-rule" viewBox="0 0 4 1" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M0 0h1v1H0z" fill="#2EA3DC" />
            <path d="M1 0h1v1H1z" fill="#EFC319" />
            <path d="M2 0h1v1H2z" fill="#1FA45A" />
            <path d="M3 0h1v1H3z" fill="#E97E18" />
          </svg>
        </p>
        <p className="play-lede">
          Ten small networks to untangle each day, with shapes to discover along the way. Free to play.
        </p>
        <ol className="play-found" aria-label="Shapes found here">
          {FEATURE_SHAPES.map((entry, index) => (
            <li key={entry.id} className={found.includes(index) ? "is-found" : ""} style={{ "--shape": entry.colour }}>
              <svg viewBox="0 0 96 96" aria-hidden="true" focusable="false">
                <path d={entry.fill} />
                {entry.stem ? <path className="play-stem" d={entry.stem} /> : null}
              </svg>
              <span className="visually-hidden">
                {entry.name}, {found.includes(index) ? "found" : "not found yet"}
              </span>
            </li>
          ))}
        </ol>
        <div className="play-actions">
          {solved ? (
            <button type="button" className="chip" onClick={next}>
              another shape
            </button>
          ) : null}
          <a className="pencil-link" href="https://features.games/">
            play today’s ten at features.games <Arrow />
          </a>
        </div>
      </div>
    </div>
  );
}
