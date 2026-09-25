"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { SiteImage } from "../site-image";
import { career, CareerStatement, logoClass, logoImage } from "../career-bar";

/*
 * Career as a railway: every role is a station, the most recent first, and a
 * pencil line with sleepers snakes across the page through them — along a row
 * of stations, round a bend in the margin and back along the next — so the
 * whole career reads at once and fills the sheet (Dan, 25 September 2026). On
 * phones it runs straight down the left edge. The line draws itself in when
 * the room opens and the stations arrive as it reaches them. The roles, logos
 * and statements are the career timeline's own (components/career-bar.jsx).
 */

const columnsFor = (width) => (width >= 1040 ? 3 : width >= 660 ? 2 : 1);
const LANE = 14; // the bends run this far in from the edges
const BEND = 28;

const round = (value) => Math.round(value * 10) / 10;

// A line through the points, its corners rounded.
function roundedPath(points) {
  let d = `M${round(points[0][0])} ${round(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    const into = Math.hypot(x - px, y - py);
    const out = Math.hypot(nx - x, ny - y);
    if (!into || !out || Math.abs((x - px) * (ny - y) - (y - py) * (nx - x)) < 1e-6) {
      d += `L${round(x)} ${round(y)}`;
      continue;
    }
    const r = Math.min(BEND, into / 2, out / 2);
    const a = [x - ((x - px) / into) * r, y - ((y - py) / into) * r];
    const b = [x + ((nx - x) / out) * r, y + ((ny - y) / out) * r];
    d += `L${round(a[0])} ${round(a[1])}Q${round(x)} ${round(y)} ${round(b[0])} ${round(b[1])}`;
  }
  const [lx, ly] = points.at(-1);
  return `${d}L${round(lx)} ${round(ly)}`;
}

// Stations in rows, every other row running back the other way.
const placeOf = (index, columns) => {
  const row = Math.floor(index / columns);
  const step = index % columns;
  return { row, column: row % 2 ? columns - 1 - step : step };
};

export function CareerRail() {
  const sheet = useRef(null);
  const nodes = useRef([]);
  const [columns, setColumns] = useState(3);
  const [rail, setRail] = useState(null);

  const trace = useCallback(() => {
    const box = sheet.current;
    const frame = box?.getBoundingClientRect();
    if (!frame?.width) return;
    const centres = nodes.current.map((node) => {
      const r = node.getBoundingClientRect();
      return [r.left + r.width / 2 - frame.left, r.top + r.height / 2 - frame.top];
    });
    const count = columnsFor(frame.width);
    let points;
    if (count === 1) {
      const x = centres[0][0];
      points = [[x, centres[0][1] - 30], ...centres, [x, centres.at(-1)[1] + 40]];
    } else {
      points = [[0, centres[0][1]]];
      const rows = Math.ceil(centres.length / count);
      for (let row = 0; row < rows; row += 1) {
        const stops = centres.slice(row * count, row * count + count);
        points.push(...stops);
        const next = centres[(row + 1) * count];
        if (!next) {
          // The line runs on a little past the last station to its buffers.
          const [x, y] = stops.at(-1);
          points.push([row % 2 ? Math.max(LANE, x - 64) : Math.min(frame.width - LANE, x + 64), y]);
          break;
        }
        const lane = row % 2 ? LANE : frame.width - LANE;
        points.push([lane, stops[0][1]], [lane, next[1]]);
      }
    }
    const end = points.at(-1);
    const before = points.at(-2);
    setRail({ d: roundedPath(points), width: frame.width, height: frame.height, end, across: end[1] === before[1] });
  }, []);

  useLayoutEffect(() => {
    const box = sheet.current;
    if (!box) return undefined;
    const observer = new ResizeObserver(() => {
      const next = columnsFor(box.clientWidth);
      if (box.clientWidth) setColumns((current) => (current === next ? current : next));
      trace();
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [trace]);

  useLayoutEffect(trace, [columns, trace]);

  return (
    <div className="room-body career-rail" ref={sheet} data-columns={columns} style={{ "--columns": columns }}>
      {rail ? (
        <svg className="rail-line" width={rail.width} height={rail.height} viewBox={`0 0 ${rail.width} ${rail.height}`} aria-hidden="true" focusable="false">
          <defs>
            <mask id="rail-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width={rail.width} height={rail.height}>
              <path className="rail-reveal" d={rail.d} pathLength="1" />
            </mask>
          </defs>
          <g mask="url(#rail-reveal)">
            <path className="rail-sleepers" d={rail.d} />
            <path className="rail-track" d={rail.d} />
            <path
              className="rail-buffer"
              d={rail.across ? `M${rail.end[0]} ${rail.end[1] - 9}v18` : `M${rail.end[0] - 9} ${rail.end[1]}h18`}
            />
          </g>
        </svg>
      ) : null}
      <ol className="rail-stops" aria-label="Career, the most recent first">
        {career.map((job, index) => {
          const { row, column } = placeOf(index, columns);
          return (
            <li
              key={job.name}
              className="rail-stop"
              style={{ gridRow: row + 1, gridColumn: column + 1, "--company-accent": job.accent, "--n": index }}
            >
              <span className="rail-node" ref={(node) => { nodes.current[index] = node; }} aria-hidden="true" />
              <span className="rail-when">{job.span.replace(/ — /g, "–")}</span>
              <article className="rail-card">
                <span className="rail-logo">
                  <span className={logoClass(job)}>
                    <SiteImage {...logoImage(job)} sizes="34px" alt="" fetchPriority="low" />
                  </span>
                </span>
                <h3 className="rail-name">{job.name}</h3>
                <p className="rail-role">{job.role}</p>
                <p className="rail-statement">
                  <CareerStatement {...job} />
                </p>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
