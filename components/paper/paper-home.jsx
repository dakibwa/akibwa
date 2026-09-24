"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Mark } from "./mark";
import { NameFlip } from "./name-flip";
import { THINGS } from "./things";
import { Contact } from "./contact";
import { FeaturesRoom } from "./features-room";
import { WebsitesRoom } from "./websites-room";
import { TasteLibrary } from "../taste-library";
import { CareerTimeline } from "../career-bar";

// The trek is its own page (/trek/); the other four open in place.
export const THINGS_ON_PAPER = [
  { id: "taste", label: "taste", hint: "songs, albums, films, games" },
  { id: "features", label: "features", hint: "a daily puzzle I made" },
  { id: "websites", label: "websites", hint: "sites I’ve built" },
  { id: "career", label: "career", hint: "how I got here" },
  { id: "trek", label: "trek", hint: "Paris to Sofia, on foot", href: "/trek/" }
];
export const ROOMS = THINGS_ON_PAPER.filter((thing) => !thing.href);
const IDS = ROOMS.map((room) => room.id);
const isRoom = (value) => IDS.includes(value);
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/*
 * One sheet of paper. The front page holds five things; choosing one opens its
 * room in place. `<html data-room>` owns what is shown — an inline script in
 * the layout sets it from the hash before the first paint, and without
 * JavaScript `:target` opens the room instead. Each room is one history entry
 * carrying its hash, so Back returns to the five things.
 */
export function PaperHome({ taste, websites }) {
  const [room, setRoom] = useState(null);
  const [hovered, setHovered] = useState(null);
  const lastThing = useRef(null);

  const show = useCallback((next) => {
    const apply = () => {
      flushSync(() => setRoom(next));
      document.documentElement.dataset.room = next ?? "index";
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    const settle = () => {
      const target = next
        ? document.getElementById(`room-${next}`)
        : lastThing.current ?? document.getElementById("hello");
      target?.focus({ preventScroll: true });
    };
    if (!document.startViewTransition || still()) {
      apply();
      settle();
      return;
    }
    // A skipped transition (a hidden tab, a second click) still applies.
    const transition = document.startViewTransition(apply);
    transition.ready.catch(() => {});
    transition.finished.then(settle, settle);
  }, []);

  const open = useCallback((next) => {
    if (!isRoom(next)) return;
    const ours = isRoom(history.state?.akibwaRoom);
    history[ours ? "replaceState" : "pushState"]({ akibwaRoom: next }, "", `#${next}`);
    document.documentElement.dataset.drawn = "";
    show(next);
  }, [show]);

  const close = useCallback(() => {
    if (isRoom(history.state?.akibwaRoom)) history.back();
    else {
      history.replaceState(null, "", location.pathname);
      show(null);
    }
  }, [show]);

  useEffect(() => {
    const root = document.documentElement;
    const initial = location.hash.slice(1);
    // After the first drawing, the front page is shown at rest.
    const drawn = setTimeout(() => { root.dataset.drawn = ""; }, isRoom(initial) ? 0 : 2400);
    if (isRoom(initial)) {
      // Arriving on a room's link still leaves the front page behind it.
      history.replaceState(null, "", location.pathname);
      history.pushState({ akibwaRoom: initial }, "", `#${initial}`);
      setRoom(initial);
      root.dataset.room = initial;
    } else {
      root.dataset.room = "index";
    }
    const restore = () => {
      const next = history.state?.akibwaRoom ?? location.hash.slice(1);
      show(isRoom(next) ? next : null);
    };
    const escape = (event) => {
      if (event.key !== "Escape" || !isRoom(document.documentElement.dataset.room)) return;
      setTimeout(() => {
        if (!event.defaultPrevented) close();
      });
    };
    window.addEventListener("popstate", restore);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("keydown", escape);
      clearTimeout(drawn);
    };
  }, [show, close]);

  // Plain clicks open rooms in place; modified clicks keep the anchor.
  const follow = (id) => (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!room) lastThing.current = event.currentTarget;
    open(id);
  };

  const home = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (room) close();
  };

  return (
    <div className="paper">
      <header className="bar">
        <a className="bar-home" href="#hello" onClick={home} aria-label="Akibwa — the five things">
          <Mark size={34} />
          <span className="bar-name">akibwa</span>
        </a>
        <nav className="bar-rooms" aria-label="Rooms">
          {THINGS_ON_PAPER.map(({ id, label, href }) => (
            <a
              key={id}
              href={href ?? `#${id}`}
              onClick={href ? undefined : follow(id)}
              aria-current={room === id ? "page" : undefined}
              style={{ "--room": `var(--${id})` }}
            >
              {label}
            </a>
          ))}
        </nav>
        <Contact />
      </header>

      <section className="front" aria-labelledby="hello">
        <div className="front-intro">
          <h1 id="hello" tabIndex={-1}>
            <NameFlip />
          </h1>
          <p className="front-lede">Building in the age of AI.</p>
        </div>
        <Sky />
        <div className="front-stage">
          <ul className="things" aria-label="Five things">
            {THINGS_ON_PAPER.map(({ id, label, hint, href }, index) => {
              const Art = THINGS[id];
              return (
                <li key={id} style={{ "--i": index, "--room": `var(--${id})` }}>
                  <a
                    className="thing"
                    href={href ?? `#${id}`}
                    onClick={href ? undefined : follow(id)}
                    onPointerEnter={() => setHovered(id)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(id)}
                    onBlur={() => setHovered(null)}
                    style={{ viewTransitionName: room ? undefined : `thing-${id}` }}
                  >
                    <Art solved={hovered === id} />
                    <span className="thing-label">{label}</span>
                    <span className="thing-hint">{hint}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          <svg className="ground" viewBox="0 0 1000 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path className="ground-line" d="M0 12C120 10 240 13 360 11.5S620 10 760 12.5 920 11 1000 12" pathLength="1" />
            <path className="ground-grass" d="M40 12l3-6M44 12l-1-5M190 12l2-5M194 12l3-7M420 12l-2-6M424 12l2-5M612 12l3-6M616 12l-1-5M820 12l2-6M825 12l-2-5M960 12l3-5" />
          </svg>
        </div>
      </section>

      <Room id="taste" active={room === "taste"}>
        <TasteLibrary {...taste} expanded />
      </Room>
      <Room id="features" active={room === "features"}>
        <FeaturesRoom />
      </Room>
      <Room id="websites" active={room === "websites"}>
        <WebsitesRoom sites={websites} />
      </Room>
      <Room id="career" active={room === "career"}>
        <CareerTimeline />
      </Room>
    </div>
  );
}

function Room({ id, active, children }) {
  const { label, hint } = ROOMS.find((room) => room.id === id);
  const Art = THINGS[id];
  return (
    <section className={`room room-${id}`} id={id} aria-labelledby={`room-${id}`} style={{ "--room": `var(--${id})` }}>
      <header className="room-head">
        <span className="room-art" style={{ viewTransitionName: active ? `thing-${id}` : undefined }}>
          <Art solved />
        </span>
        <div>
          <h2 id={`room-${id}`} tabIndex={-1}>
            {label}
          </h2>
          <p className="room-hint">{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

/*
 * The sky is a paper wheel turning behind a round window cut in the page: the
 * sun while the heading says Daniel, the moon while it says Akibwa. NameFlip
 * sets `<html data-sky>` as each change begins, and the wheel turns half a
 * revolution about a pin below the window — through a sunset to the moon, and
 * on through a dawn back to the sun. Night things are drawn upright where
 * they will show, then turned half round onto the far side of the wheel.
 */
const PIN = [60, 160];
const BANDS = [
  [-168, -12, "#cfe2e8"],
  [-12, 0, "#f6c894"],
  [0, 12, "#eca09c"],
  [12, 24, "#8e85bf"],
  [24, 156, "#2b356f"],
  [156, 168, "#86609a"],
  [168, 180, "#e7806a"],
  [180, 192, "#f4b47c"]
];
const STARS = [[24, 40, 3.2], [33, 84, 2.4], [86, 84, 2.8], [86, 32, 3.4], [70, 19, 2.2]];

function wedge(from, to) {
  const at = (degrees) => {
    const angle = (degrees * Math.PI) / 180;
    return `${(PIN[0] + Math.cos(angle) * 180).toFixed(2)} ${(PIN[1] + Math.sin(angle) * 180).toFixed(2)}`;
  };
  // A little overlap, so no seam shows between neighbouring bands.
  return `M${PIN[0]} ${PIN[1]}L${at(from)}A180 180 0 0 1 ${at(to + 0.6)}Z`;
}

const sparkle = ([x, y, s]) =>
  `M${x} ${y - s}q${s * 0.18} ${s * 0.82} ${s} ${s}q${-s * 0.82} ${s * 0.18} ${-s} ${s}q${-s * 0.18} ${-s * 0.82} ${-s} ${-s}q${s * 0.82} ${-s * 0.18} ${s} ${-s}z`;

function Sky() {
  return (
    <svg className="sky" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="sky-window">
          <circle cx="60" cy="60" r="50" />
        </clipPath>
        <pattern id="sun-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0v4" stroke="#e8893a" strokeWidth="1.6" />
        </pattern>
        <filter id="sky-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
      </defs>
      <g clipPath="url(#sky-window)">
        <g className="sky-wheel">
          {BANDS.map(([from, to, colour]) => (
            <path key={from} d={wedge(from, to)} fill={colour} />
          ))}
          <path className="sky-cloud" d="M25 88.5c-3.2 0-4.2-3.6-1.6-5 .2-3.4 4-4.6 6.2-2.6 1.4-3.6 7-3.8 8.4.2 3.2-.8 5.6 1.6 4.6 4.2-.2 2-2 3.2-4 3.2z" />
          <g className="sky-sun">
            <path className="sky-rays" d="M60 30v-8M60 90v8M30 60h-8M90 60h8M38.8 38.8l-5.6-5.6M81.2 81.2l5.6 5.6M38.8 81.2l-5.6 5.6M81.2 38.8l5.6-5.6" />
            <circle cx="60" cy="60" r="21" fill="#f6c04f" />
            <circle cx="60" cy="60" r="21" fill="url(#sun-hatch)" opacity=".55" />
            <circle cx="60" cy="60" r="21" fill="none" stroke="#2a2420" strokeWidth="1.2" />
          </g>
          <g transform={`rotate(180 ${PIN[0]} ${PIN[1]})`}>
            {STARS.map((star, index) => (
              <path key={index} className="sky-star" d={sparkle(star)} style={{ "--twinkle": `${index * 0.45}s` }} />
            ))}
            <path className="sky-moon" d="M59.63 38.06A22 22 0 1 0 78.13 68.88A18 18 0 1 1 59.63 38.06Z" />
            <circle cx="47" cy="62" r="2.2" fill="#e6dcc0" />
            <circle cx="53.5" cy="72.5" r="1.5" fill="#e6dcc0" />
          </g>
        </g>
        {/* The page's cut edge shades the wheel behind it. */}
        <circle cx="63" cy="64" r="56" fill="none" stroke="#2a2420" strokeOpacity=".32" strokeWidth="12" filter="url(#sky-soft)" />
      </g>
      <circle className="sky-rim" cx="60" cy="60" r="50" />
    </svg>
  );
}
