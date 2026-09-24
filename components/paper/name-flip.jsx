"use client";

import { useEffect, useRef, useState } from "react";

const NAMES = ["Daniel", "Akibwa"];

// The green pencil from the reference film: eraser up, point down.
function Pencil() {
  return (
    <>
      <path d="M14 4h12a2 2 0 0 1 2 2v14H12V6a2 2 0 0 1 2-2z" fill="#e79aa0" />
      <path d="M12 20h16v6H12z" fill="#b9b3a6" />
      <path d="M12 26h16v68H12z" fill="#3f6b4a" />
      <path d="M18 26h4v68h-4z" fill="#4f7f5a" />
      <path d="M12 94h16l-8 22z" fill="#e8c9a0" />
      <path d="M17.4 108.8h5.2L20 116z" fill="#2a2420" />
    </>
  );
}
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
 * The original Daniel ↔ Akibwa flick, redrawn: a small pencil rubs out one
 * name with its eraser and writes the other, and the sky turns with it. First
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
          {NAMES.map((name) => (
            <span key={name} className="name-sizer">
              {name}.
            </span>
          ))}
          <span key={NAMES[index]} className="name-word">
            {NAMES[index]}.
          </span>
          <span className="name-pen" aria-hidden="true">
            <svg className="name-pencil is-writing" viewBox="0 0 40 120" focusable="false">
              <Pencil />
            </svg>
            <svg className="name-pencil is-erasing" viewBox="0 0 40 120" focusable="false">
              <g transform="rotate(180 20 60)">
                <Pencil />
              </g>
            </svg>
          </span>
        </span>
      </span>
    </>
  );
}
