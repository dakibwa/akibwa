"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteImage } from "../site-image";
import { Arrow } from "./arrow";
import { Tally } from "./tally";
import { unpackFilm, stateAt, dateLabel, WALK } from "./trek-film.mjs";
import { drawScene, borders } from "./trek-scene.mjs";

const PACES = [
  { id: "stroll", label: "stroll", seconds: 7, hold: 1.5, gap: 1.1 },
  { id: "walk", label: "walk", seconds: 2.8, hold: 1, gap: 1.5 },
  { id: "hurry", label: "hurry", seconds: 0.9, hold: 0.55, gap: 2.4 }
];
const km = (value) => Math.round(value).toLocaleString("en-GB");
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/*
 * The walk from Paris to Sofia as a short paper film. Each of the 67 days is
 * one beat: the sun crosses its dashed arc while the walker covers that day's
 * real ground, then night falls and a tent goes up. The Trek page's chapters
 * and moments pause the film with their own words; photographs drop in as
 * the day reaches them. The visitor sets the pace — stroll, walk or hurry —
 * pauses, or drags the day ribbon. The full 3D walk stays at /trek/.
 */
export function TrekRoom({ trek, active }) {
  const [film, setFilm] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active || film || failed) return undefined;
    let live = true;
    fetch("/trek-film.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((packet) => live && setFilm(unpackFilm(packet)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [active, film, failed]);

  return (
    <div className="room-body trek">
      {film ? (
        <TrekFilm film={film} sketch={trek} active={active} />
      ) : (
        <TrekStill sketch={trek} failed={failed} retry={() => setFailed(false)} />
      )}
      <p className="trek-more">
        <a className="pencil-link" href="/trek/">
          walk it in 3D, with every photograph <Arrow />
        </a>
        <span>
          {trek.facts.from} to {trek.facts.to}, {dateLabel(trek.facts.start)} to {dateLabel(trek.facts.end)}. Kilometres
          and metres climbed are recorded, plus reconstructed walks between recordings; two stretches went by train.
        </span>
      </p>
    </div>
  );
}

function RouteMap({ sketch, className = "", lineRef, dotRef }) {
  const [x0, y0, w, h] = sketch.view;
  return (
    <svg className={`trek-map ${className}`} viewBox={`${x0} ${y0} ${w} ${h}`} role="img" aria-label={`The route from ${sketch.start.name} to ${sketch.end.name}`}>
      <g className="trek-map-land">
        {sketch.countries.map((country) => (
          <path key={country.name} d={country.d} />
        ))}
      </g>
      <path className="trek-map-plan" d={sketch.route} />
      <path className="trek-map-plan is-join" d={sketch.joins} />
      <path className="trek-map-walked" ref={lineRef} d={sketch.line} pathLength="1" />
      <circle className="trek-map-end" cx={sketch.start.x} cy={sketch.start.y} r="7" />
      <circle className="trek-map-end" cx={sketch.end.x} cy={sketch.end.y} r="7" />
      <text className="trek-map-name" x={sketch.start.x + 12} y={sketch.start.y - 14}>
        {sketch.start.name}
      </text>
      <text className="trek-map-name" x={sketch.end.x - 12} y={sketch.end.y + 36} textAnchor="end">
        {sketch.end.name}
      </text>
      {dotRef ? <circle className="trek-map-dot" ref={dotRef} r="9" cx={sketch.start.x} cy={sketch.start.y} /> : null}
    </svg>
  );
}

// Before the film loads, or without JavaScript: the pencil map and the facts.
function TrekStill({ sketch, failed, retry }) {
  return (
    <div className="trek-still">
      <RouteMap sketch={sketch} />
      <p className="trek-still-facts">
        {sketch.facts.days} days on foot through {sketch.facts.countries} countries.
        {failed ? (
          <>
            {" "}The film didn’t load.{" "}
            <button type="button" className="text-button" onClick={retry}>
              Try again
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}

function TrekFilm({ film, sketch, active }) {
  const canvas = useRef(null);
  const frame = useRef(null);
  const kmRef = useRef(null);
  const climbRef = useRef(null);
  const headRef = useRef(null);
  const doneRef = useRef(null);
  const mapLine = useRef(null);
  const mapDot = useRef(null);
  const ribbonRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [pace, setPace] = useState(PACES[1]);
  const [dayIndex, setDayIndex] = useState(0);
  const [card, setCard] = useState(null);
  const [pile, setPile] = useState([]);
  const [arrived, setArrived] = useState(false);

  const clock = useRef({ t: 0, stride: 0, hold: 0, lastPhoto: 0, dragging: false });
  const shownDay = useRef(0);
  const showDay = useCallback((index) => {
    if (index === shownDay.current) return;
    shownDay.current = index;
    setDayIndex(index);
  }, []);
  const settings = useRef({ playing, pace });
  settings.current = { playing, pace };
  const borderList = useMemo(() => borders(film), [film]);
  const count = film.days.length;

  // The ribbon: 67 equal days, each drawing its own ground heights.
  const ribbon = useMemo(() => {
    const top = Math.max(...film.ground);
    const points = [];
    film.days.forEach((day, index) => {
      for (let i = 0; i <= 6; i += 1) {
        const share = i / 6;
        const h = film.ground[Math.min(film.ground.length - 1, Math.round((day.start + (day.end - day.start) * share) / film.step))];
        points.push([((index + share * WALK) / count) * 1000, 52 - (h / top) * 44]);
      }
      const h = film.ground[Math.min(film.ground.length - 1, Math.round(day.end / film.step))];
      points.push([((index + 1) / count) * 1000, 52 - (h / top) * 44]);
    });
    const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
    const bands = [];
    film.days.forEach((day, index) => {
      if (!index || day.country !== film.days[index - 1].country) bands.push({ from: index, country: day.country });
    });
    bands.forEach((band, i) => (band.to = bands[i + 1]?.from ?? count));
    return { area: `${line}L1000 60L0 60Z`, line, bands };
  }, [film, count]);

  const paint = useCallback(() => {
    const element = canvas.current;
    if (!element) return;
    const width = element.clientWidth;
    const height = element.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (element.width !== Math.round(width * ratio) || element.height !== Math.round(height * ratio)) {
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
    }
    const context = element.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const state = stateAt(film, clock.current.t);
    drawScene(context, {
      width,
      height,
      film,
      state,
      stride: clock.current.stride,
      sleeping: !state.walking && state.index < count - 1,
      borderList
    });
    if (kmRef.current) kmRef.current.textContent = km(state.km);
    if (climbRef.current) climbRef.current.textContent = km(state.climbed);
    const share = state.t / count;
    if (headRef.current) headRef.current.style.left = `${share * 100}%`;
    if (doneRef.current) doneRef.current.setAttribute("width", String(share * 1000));
    if (ribbonRef.current) {
      ribbonRef.current.setAttribute("aria-valuenow", String(state.index + 1));
      ribbonRef.current.setAttribute("aria-valuetext", `Day ${state.index + 1} of ${count}, ${dateLabel(state.day.date)}, ${state.day.country}`);
    }
    // The map's red line follows the day's progress along the drawn route.
    const before = state.index ? sketch.days[state.index - 1].progress : 0;
    const after = sketch.days[state.index].progress;
    const along = before + (after - before) * state.progress;
    if (mapLine.current) {
      mapLine.current.style.strokeDashoffset = String(1 - along);
      if (mapDot.current) {
        const total = mapLine.current.getTotalLength();
        const point = mapLine.current.getPointAtLength(total * along);
        mapDot.current.setAttribute("cx", point.x.toFixed(1));
        mapDot.current.setAttribute("cy", point.y.toFixed(1));
      }
    }
    return state;
  }, [film, sketch, count, borderList]);

  // Moving the clock by hand: no pauses for cards, just the new day.
  const seek = useCallback((t) => {
    const state = clock.current;
    state.t = Math.max(0, Math.min(count, t));
    state.hold = 0;
    setCard(null);
    setArrived(state.t >= count);
    showDay(stateAt(film, state.t).index);
    paint();
  }, [film, count, paint, showDay]);

  // Opening the room starts the film from Paris, unless motion is reduced.
  useEffect(() => {
    if (!active) {
      setPlaying(false);
      return;
    }
    if (!reduced() && clock.current.t === 0) {
      setPlaying(true);
      const chapter = film.chapters[0];
      setCard({ kind: "chapter", ...chapter });
      clock.current.hold = performance.now() + 2600 * PACES[1].hold;
    }
  }, [active, film]);

  useEffect(() => {
    if (!active) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const state = clock.current;
      const { playing: on, pace: current } = settings.current;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const before = stateAt(film, state.t);
      if (state.hold && now >= state.hold) {
        state.hold = 0;
        setCard(null);
      }
      if (on && !state.hold && !state.dragging && state.t < count) {
        state.t = Math.min(count, state.t + dt / current.seconds);
        const after = stateAt(film, state.t);
        state.stride += ((after.distance - before.distance) / 1600) * Math.PI * 2;
        // Chapters open on their first morning; moments stop the walk where they happened.
        const chapter = film.chapters.find((entry) => entry.from > 1 && before.t < entry.from - 1 - 1e-6 && after.t >= entry.from - 1);
        const moment = film.moments.find((entry) => entry.at > before.distance && entry.at <= after.distance && after.walking);
        if (chapter) {
          state.t = chapter.from - 1;
          state.hold = now + 2600 * current.hold;
          setCard({ kind: "chapter", ...chapter });
        } else if (moment) {
          state.hold = now + 2400 * current.hold;
          setCard({ kind: "moment", ...moment });
        }
        // Photographs drop in as the day reaches them, no faster than the pace allows.
        if (now - state.lastPhoto > current.gap * 1000) {
          const photo = film.photos.find((entry) => entry.at > before.distance && entry.at <= after.distance);
          if (photo) {
            state.lastPhoto = now;
            setPile((list) => [...list.slice(-2), { ...photo, key: `${photo.src}-${now}` }]);
          }
        }
        if (after.index !== before.index) {
          // Warm the next day's photographs.
          for (const entry of film.photos) if (entry.day === after.index + 2) new Image().src = `/trek/photos/${entry.src}`;
        }
        if (state.t >= count) {
          setArrived(true);
          setPlaying(false);
        }
      }
      const drawn = paint();
      if (drawn) showDay(drawn.index);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, film, count, paint, showDay]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(() => paint());
    observer.observe(element);
    return () => observer.disconnect();
  }, [paint]);

  const scrub = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    seek(((event.clientX - box.left) / box.width) * count);
  };
  const onRibbonDown = (event) => {
    clock.current.dragging = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    scrub(event);
  };
  const onRibbonMove = (event) => {
    if (clock.current.dragging) scrub(event);
  };
  const onRibbonUp = (event) => {
    clock.current.dragging = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const onRibbonKey = (event) => {
    const t = clock.current.t;
    const steps = { ArrowRight: 0.25, ArrowLeft: -0.25, PageDown: 1, PageUp: -1 };
    if (event.key in steps) {
      event.preventDefault();
      const step = event.shiftKey ? Math.sign(steps[event.key]) : steps[event.key];
      seek(Math.abs(step) === 1 ? Math.floor(t) + (step > 0 ? 1 : -1) : t + step);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      seek(event.key === "Home" ? 0 : count);
    }
  };

  const day = film.days[dayIndex];
  const again = () => {
    seek(0);
    setPile([]);
    setPlaying(true);
    setCard({ kind: "chapter", ...film.chapters[0] });
    clock.current.hold = performance.now() + 2600 * pace.hold;
  };

  return (
    <div className="trek-film">
      <div className="trek-frame" ref={frame}>
        <canvas className="trek-canvas" ref={canvas} aria-hidden="true" />

        <div className="trek-day">
          <Tally count={Math.min(count, dayIndex + (arrived ? 1 : 0))} className="trek-tally" />
          <p className="trek-day-no">
            day {day.n} <span>of {count}</span>
          </p>
          <p className="trek-day-date">
            {dateLabel(day.date)}, {day.country}
          </p>
          {day.title ? (
            <p className="trek-day-song">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                <path d="M9 17.5V5.5l10-2v12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="6.5" cy="17.5" r="2.6" fill="currentColor" />
                <circle cx="16.5" cy="15.5" r="2.6" fill="currentColor" />
              </svg>
              <span>
                <em>{day.title}</em>
                {day.song ? (
                  <small>
                    {" "}
                    · {day.song.artist}, no. {day.song.rank} in my top 1,000
                  </small>
                ) : null}
              </span>
            </p>
          ) : (
            <p className="trek-day-song is-rest">{day.n === count ? "arrived" : "a day off the path"}</p>
          )}
        </div>

        <div className="trek-pile" aria-hidden="true">
          {pile.map((photo, index) => (
            <figure key={photo.key} className="polaroid" style={{ "--tilt": `${[-5, 3, -2][index % 3]}deg`, "--stack": index }}>
              <SiteImage src={`/trek/photos/${photo.src}`} alt="" />
              <figcaption>
                day {photo.day} · {photo.taken}
              </figcaption>
            </figure>
          ))}
        </div>

        {card ? (
          <div className={`trek-card is-${card.kind}`} role="status">
            {card.kind === "chapter" ? <p className="trek-card-kind">{card.place}</p> : null}
            <p className="trek-card-title">{card.title}</p>
            <p className="trek-card-text">{card.text}</p>
          </div>
        ) : null}

        {arrived ? (
          <div className="trek-card is-arrival" role="status">
            <p className="trek-card-kind">
              day {count}, {dateLabel(film.days.at(-1).date)}
            </p>
            <p className="trek-card-title">Sofia.</p>
            <p className="trek-card-text">
              {count} days, {km(film.walked.at(-1) / 10)} km and {km(film.climbed.at(-1))} m of climbing from Paris.
            </p>
            <button type="button" className="chip" onClick={again}>
              walk it again
            </button>
          </div>
        ) : null}

        <RouteMap sketch={sketch} className="trek-inset" lineRef={mapLine} dotRef={mapDot} />
      </div>

      <div className="trek-controls">
        <button
          type="button"
          className="round-button"
          onClick={() => (arrived ? again() : setPlaying((value) => !value))}
          aria-label={playing ? "Pause the walk" : "Play the walk"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M8 5.5v13M16 5.5v13" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.4-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z" fill="currentColor" />
            </svg>
          )}
        </button>
        <div className="trek-paces" role="group" aria-label="Pace">
          {PACES.map((option) => (
            <button
              key={option.id}
              type="button"
              className="chip"
              aria-pressed={pace.id === option.id}
              onClick={() => {
                setPace(option);
                if (!arrived) setPlaying(true);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div
          className="trek-ribbon"
          ref={ribbonRef}
          role="slider"
          tabIndex={0}
          aria-label="Day of the walk"
          aria-valuemin={1}
          aria-valuemax={count}
          aria-valuenow={1}
          onPointerDown={onRibbonDown}
          onPointerMove={onRibbonMove}
          onPointerUp={onRibbonUp}
          onPointerCancel={onRibbonUp}
          onKeyDown={onRibbonKey}
        >
          <svg viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <defs>
              <clipPath id="trek-done">
                <rect ref={doneRef} x="0" y="0" width="0" height="60" />
              </clipPath>
            </defs>
            {ribbon.bands.map((band, index) => (
              <rect key={band.country} className={`trek-band${index % 2 ? " is-alt" : ""}`} x={(band.from / count) * 1000} y="0" width={((band.to - band.from) / count) * 1000} height="60" />
            ))}
            <path className="trek-ribbon-area" d={ribbon.area} />
            <path className="trek-ribbon-area is-done" d={ribbon.area} clipPath="url(#trek-done)" />
            <path className="trek-ribbon-line" d={ribbon.line} />
          </svg>
          <span className="trek-head" ref={headRef} aria-hidden="true" />
          <span className="trek-ribbon-countries" aria-hidden="true">
            {ribbon.bands.map((band) => (
              <span key={band.country} style={{ left: `${(band.from / count) * 100}%`, width: `${((band.to - band.from) / count) * 100}%` }}>
                {band.country}
              </span>
            ))}
          </span>
        </div>

        <dl className="trek-counters">
          <div>
            <dt>km walked</dt>
            <dd ref={kmRef}>0</dd>
          </div>
          <div>
            <dt>metres climbed</dt>
            <dd ref={climbRef}>0</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
