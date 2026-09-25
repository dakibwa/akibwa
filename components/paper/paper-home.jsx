"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Arrow } from "./arrow";
import { Mascot } from "./mascot";
import { NameFlip } from "./name-flip";
import { THINGS } from "./things";
import { Contact } from "./contact";
import { FeaturesRoom } from "./features-room";
import { WebsitesRoom } from "./websites-room";
import { MusicRoom } from "./music-room";
import { TrekRoom } from "./trek-room";
import { CareerRail } from "./career-rail";

// The rooms stay mounted behind the front page; hovering and the mascot's
// visits re-render the sheet, so the rooms only redraw when their props do.
const Music = memo(MusicRoom);
const Features = memo(FeaturesRoom);
const Websites = memo(WebsitesRoom);
const Career = memo(CareerRail);
const Trek = memo(TrekRoom);

// All five open in place; the trek's room frames its journey at /trek/.
export const THINGS_ON_PAPER = [
  { id: "music", label: "music", hint: "my taste archive" },
  { id: "features", label: "features", hint: "untangle a neural net" },
  { id: "websites", label: "websites", hint: "sites I’ve built" },
  { id: "career", label: "career", hint: "how I got here" },
  { id: "trek", label: "trek", hint: "my journey across Europe" }
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
export function PaperHome({ music, websites }) {
  const [room, setRoom] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [visited, setVisited] = useState(null);
  const lastThing = useRef(null);

  const show = useCallback((next) => {
    const apply = () => {
      // The room is shown before React renders it, so the bar's tab can
      // measure the room's name where it now sits.
      document.documentElement.dataset.room = next ?? "index";
      flushSync(() => setRoom(next));
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
        {/* In a room, a pencil arrow back to the five things. */}
        <a className="bar-back" href="#hello" onClick={home} aria-label="Back to the five things">
          <Arrow back size={26} />
        </a>
        <BarRooms room={room} follow={follow} />
        {/* On the front page the contact links sit under the lede. */}
        <Contact />
      </header>

      <section className="front" aria-labelledby="hello">
        <div className="front-intro">
          <h1 id="hello" tabIndex={-1}>
            <NameFlip />
          </h1>
          <p className="front-lede">Building in the age of AI.</p>
          <Contact />
        </div>
        <Sky />
        <Mascot onVisit={setVisited} />
        <div className="front-stage">
          <ul className="things" aria-label="Five things">
            {THINGS_ON_PAPER.map(({ id, label, hint, href }, index) => {
              const Art = THINGS[id];
              return (
                <li key={id} style={{ "--i": index, "--room": `var(--${id})` }}>
                  <a
                    className={`thing${visited === id ? " is-visited" : ""}`}
                    href={href ?? `#${id}`}
                    onClick={href ? undefined : follow(id)}
                    onPointerEnter={() => setHovered(id)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(id)}
                    onBlur={() => setHovered(null)}
                    style={{ viewTransitionName: room ? undefined : `thing-${id}` }}
                  >
                    <Art solved={hovered === id || visited === id} />
                    <span className="thing-label">{label}</span>
                    <span className="thing-hint">{hint}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Room id="music">
        <Music initial={music.initial} active={room === "music"} />
      </Room>
      <Room id="features">
        <Features />
      </Room>
      <Room id="websites">
        <Websites sites={websites} />
      </Room>
      <Room id="career">
        <Career />
      </Room>
      <Room id="trek">
        <Trek active={room === "trek"} />
      </Room>
    </div>
  );
}

/*
 * The rooms by name. The one on show sits on an ink tab, the albums/songs
 * switch's pill, which slides to the next room as the view changes (it has
 * its own view-transition name), rather than a pencil underline.
 */
function BarRooms({ room, follow }) {
  const nav = useRef(null);
  const [tab, setTab] = useState(null);
  useLayoutEffect(() => {
    const element = nav.current;
    if (!element) return undefined;
    const measure = () => {
      const link = element.querySelector('[aria-current="page"]');
      setTab(link?.offsetWidth ? { x: link.offsetLeft, w: link.offsetWidth } : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [room]);
  return (
    <nav className="bar-rooms" aria-label="Rooms" ref={nav}>
      {tab ? <span className="bar-tab" aria-hidden="true" style={{ width: tab.w, transform: `translateX(${tab.x}px)` }} /> : null}
      {THINGS_ON_PAPER.map(({ id, label }) => (
        <a key={id} href={`#${id}`} onClick={follow(id)} aria-current={room === id ? "page" : undefined}>
          {label}
        </a>
      ))}
    </nav>
  );
}

// A room has no title on the page: the bar already names it. Its heading
// stays for readers and takes the focus when the room opens.
function Room({ id, children }) {
  const { label } = ROOMS.find((room) => room.id === id);
  return (
    <section className={`room room-${id}`} id={id} aria-labelledby={`room-${id}`} style={{ "--room": `var(--${id})` }}>
      <h2 id={`room-${id}`} className="visually-hidden" tabIndex={-1}>
        {label}
      </h2>
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
          <g className="sky-sun sky-body">
            <path className="sky-rays" d="M60 30v-8M60 90v8M30 60h-8M90 60h8M38.8 38.8l-5.6-5.6M81.2 81.2l5.6 5.6M38.8 81.2l-5.6 5.6M81.2 38.8l5.6-5.6" />
            <circle cx="60" cy="60" r="21" fill="#f6c04f" />
            <circle cx="60" cy="60" r="21" fill="url(#sun-hatch)" opacity=".55" />
            <circle cx="60" cy="60" r="21" fill="none" stroke="#2a2420" strokeWidth="1.2" />
          </g>
          <g transform={`rotate(180 ${PIN[0]} ${PIN[1]})`}>
            {STARS.map((star, index) => (
              <path key={index} className="sky-star" d={sparkle(star)} style={{ "--twinkle": `${index * 0.45}s` }} />
            ))}
            <g className="sky-body">
              <path className="sky-moon" d="M59.63 38.06A22 22 0 1 0 78.13 68.88A18 18 0 1 1 59.63 38.06Z" />
              <circle cx="47" cy="62" r="2.2" fill="#e6dcc0" />
              <circle cx="53.5" cy="72.5" r="1.5" fill="#e6dcc0" />
            </g>
          </g>
        </g>
        {/* The page's cut edge shades the wheel behind it. */}
        <circle cx="63" cy="64" r="56" fill="none" stroke="#2a2420" strokeOpacity=".32" strokeWidth="12" filter="url(#sky-soft)" />
      </g>
      <circle className="sky-rim" cx="60" cy="60" r="50" />
    </svg>
  );
}
