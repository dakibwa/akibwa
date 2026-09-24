"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Mark } from "./mark";
import { NameFlip } from "./name-flip";
import { THINGS } from "./things";
import { Contact } from "./contact";
import { MusicRoom } from "./music-room";
import { PlayRoom } from "./play-room";
import { WebsitesRoom } from "./websites-room";
import { CareerRoom } from "./career-room";
import { TrekRoom } from "./trek-room";

export const ROOMS = [
  { id: "music", label: "music", hint: "what I listen to" },
  { id: "play", label: "play", hint: "a puzzle I made" },
  { id: "websites", label: "websites", hint: "sites I’ve built" },
  { id: "career", label: "career", hint: "how I got here" },
  { id: "trek", label: "trek", hint: "Paris to Sofia, on foot" }
];
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
export function PaperHome({ music, career, trek, websites }) {
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
        ? document.getElementById(`${next}-title`)
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
          {ROOMS.map(({ id, label }) => (
            <a key={id} href={`#${id}`} onClick={follow(id)} aria-current={room === id ? "page" : undefined} style={{ "--room": `var(--${id})` }}>
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
            {ROOMS.map(({ id, label, hint }, index) => {
              const Art = THINGS[id];
              return (
                <li key={id} style={{ "--i": index, "--room": `var(--${id})` }}>
                  <a
                    className="thing"
                    href={`#${id}`}
                    onClick={follow(id)}
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

      <Room id="music" active={room === "music"}>
        <MusicRoom preview={music} active={room === "music"} />
      </Room>
      <Room id="play" active={room === "play"}>
        <PlayRoom active={room === "play"} />
      </Room>
      <Room id="websites" active={room === "websites"}>
        <WebsitesRoom sites={websites} />
      </Room>
      <Room id="career" active={room === "career"}>
        <CareerRoom career={career} active={room === "career"} onTrek={() => open("trek")} />
      </Room>
      <Room id="trek" active={room === "trek"}>
        <TrekRoom trek={trek} active={room === "trek"} />
      </Room>
    </div>
  );
}

function Room({ id, active, children }) {
  const { label, hint } = ROOMS.find((room) => room.id === id);
  const Art = THINGS[id];
  return (
    <section className={`room room-${id}`} id={id} aria-labelledby={`${id}-title`} style={{ "--room": `var(--${id})` }}>
      <header className="room-head">
        <span className="room-art" style={{ viewTransitionName: active ? `thing-${id}` : undefined }}>
          <Art solved />
        </span>
        <div>
          <h2 id={`${id}-title`} tabIndex={-1}>
            {label}
          </h2>
          <p className="room-hint">{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

// A hatched pencil sun by day and a moon after dark, in the reader's own time.
function Sky() {
  const [night, setNight] = useState(false);
  useEffect(() => {
    const hour = new Date().getHours();
    setNight(hour < 6 || hour >= 20);
  }, []);
  return (
    <svg className={`sky${night ? " is-night" : ""}`} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="sun-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0v4" stroke="#e8893a" strokeWidth="1.6" />
        </pattern>
      </defs>
      <g className="sky-sun">
        <path className="sky-rays" d="M60 18v-12M60 102v12M18 60h-12M102 60h12M30 30l-8-8M90 90l8 8M30 90l-8 8M90 30l8-8" />
        <circle cx="60" cy="60" r="28" fill="#f6c04f" />
        <circle cx="60" cy="60" r="28" fill="url(#sun-hatch)" opacity=".55" />
        <circle cx="60" cy="60" r="28" fill="none" stroke="#2a2420" strokeWidth="1.2" />
      </g>
      <g className="sky-moon">
        <path d="M74 30a32 32 0 1 0 16 42a25 25 0 1 1-16-42z" fill="#f3ead2" stroke="#2a2420" strokeWidth="1.2" />
        <path className="sky-stars" d="M22 24l1.4 3.2 3.2 1.4-3.2 1.4-1.4 3.2-1.4-3.2-3.2-1.4 3.2-1.4zM100 94l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" />
      </g>
    </svg>
  );
}
