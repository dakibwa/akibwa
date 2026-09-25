"use client";

import { useEffect, useRef, useState } from "react";

const NAMES = ["Daniel", "Akibwa"];

const ERASE = 460;
const WRITE = 720;

// Daniel keeps the sun in the sky and Akibwa the moon (see Sky in
// paper-home). Unset means day, so the first load turns nothing.
function setSky(night) {
  const root = document.documentElement;
  const next = night ? "night" : "day";
  if ((root.dataset.sky ?? "day") !== next) root.dataset.sky = next;
}

/*
 * The original Daniel ↔ Akibwa flick: one name wipes away and the other wipes
 * in, and the sky turns with it. First
 * change at 3.2 seconds, then every 4.2 seconds, as before. Both names reserve
 * their width, hidden tabs pause the cycle, and reduced motion keeps Daniel
 * and the sun still.
 */
export function NameFlip() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("rest");
  const shown = useRef(0);

  useEffect(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let timers = [];
    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const cycle = () => {
      const upcoming = (shown.current + 1) % NAMES.length;
      setPhase("erase");
      setSky(upcoming === 1);
      timers.push(setTimeout(() => {
        shown.current = upcoming;
        setIndex(upcoming);
        setPhase("write");
      }, ERASE));
      timers.push(setTimeout(() => {
        setPhase("rest");
        timers.push(setTimeout(cycle, 4200));
      }, ERASE + WRITE));
    };
    const reset = () => {
      clear();
      setPhase("rest");
      if (still.matches) {
        shown.current = 0;
        setIndex(0);
        delete document.documentElement.dataset.sky;
      } else {
        setSky(shown.current === 1);
        if (!document.hidden) timers.push(setTimeout(cycle, 3200));
      }
    };
    reset();
    still.addEventListener("change", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      clear();
      still.removeEventListener("change", reset);
      document.removeEventListener("visibilitychange", reset);
      delete document.documentElement.dataset.sky;
    };
  }, []);

  return (
    <>
      <span className="visually-hidden">I’m Daniel. Online as Akibwa.</span>
      <span aria-hidden="true">
        I’m{" "}
        <span className="name" data-phase={phase} data-name={NAMES[index].toLowerCase()}>
          {/* No full stop after the name (Dan, 25 September 2026). */}
          {NAMES.map((name) => (
            <span key={name} className="name-sizer">
              {name}
            </span>
          ))}
          <span key={NAMES[index]} className="name-word">
            {NAMES[index]}
          </span>
        </span>
      </span>
    </>
  );
}
