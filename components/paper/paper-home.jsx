"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Arrow } from "./arrow";
import { Cast } from "./cast";
import { NameFlip } from "./name-flip";
import { THINGS } from "./things";
import { Contact } from "./contact";
import { WebsitesRoom } from "./websites-room";
import { MusicRoom } from "./music-room";
import { FramedRoom } from "./framed-room";
import { CareerCards } from "./career-cards";

// The rooms stay mounted behind the front page; hovering and the mascot's
// visits re-render the sheet, so the rooms only redraw when their props do.
const Music = memo(MusicRoom);
const Websites = memo(WebsitesRoom);
const Career = memo(CareerCards);
const Framed = memo(FramedRoom);

// All five open in place; features and the trek frame their own pages.
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
        <Hole />
        <Cast onVisit={setVisited} />
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
        <Framed active={room === "features"} name="features" path="/features/" title="Features, the daily puzzle" />
      </Room>
      <Room id="websites">
        <Websites sites={websites} />
      </Room>
      <Room id="career">
        <Career />
      </Room>
      <Room id="trek">
        <Framed active={room === "trek"} name="trek" path="/trek/" title="The trek: Paris to Sofia on foot, autumn 2019" />
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

// A round opening in the sheet, where the sun and moon used to be: a hollow
// ring in ink with a little shade inside its top edge. The cast comes out of
// it (Dan, 25 September 2026).
function Hole() {
  return (
    <svg className="hole" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="hole-cut">
          <circle cx="60" cy="60" r="50" />
        </clipPath>
        <filter id="hole-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      <g clipPath="url(#hole-cut)">
        <circle cx="60" cy="66" r="55" fill="none" stroke="#2a2420" strokeOpacity=".22" strokeWidth="10" filter="url(#hole-soft)" />
      </g>
      <circle className="hole-rim" cx="60" cy="60" r="50" />
    </svg>
  );
}
