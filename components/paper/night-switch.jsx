"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

/*
 * Night paper (from Kevin Ngo's hand-drawn UI animations, October 2026): a
 * little switch beside the contact links whose sun rolls over into a moon.
 * The sheet keeps its day paper until someone asks; the choice stays on the
 * device, and the layout's first script lays the night paper again before the
 * first paint (keep its key and colour in step with these). The new paper
 * spreads out from the switch, and the a looks round at it (cast.jsx listens
 * for PAPER_EVENT).
 */
export const PAPER_KEY = "akibwa-paper";
export const PAPER_EVENT = "akibwa:paper";
// The browser chrome follows the paper: --paper by day and by night.
const CHROME = { day: "#f3ecdf", night: "#1e1a17" };

const isNight = () => document.documentElement.dataset.paper === "night";
const subscribe = (callback) => {
  window.addEventListener(PAPER_EVENT, callback);
  return () => window.removeEventListener(PAPER_EVENT, callback);
};

// The sun's eight rays, a little uneven, as if drawn round it by hand.
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => {
  const a = (angle * Math.PI) / 180;
  const from = index % 2 ? 7.9 : 8.3;
  const to = index % 2 ? 10.2 : 10.9;
  const at = (r) => `${(12 + Math.cos(a) * r).toFixed(2)} ${(12 + Math.sin(a) * r).toFixed(2)}`;
  return `M${at(from)}L${at(to)}`;
}).join("");

export function NightSwitch() {
  const night = useSyncExternalStore(subscribe, isNight, () => false);
  const squash = useRef(null);

  const flip = useCallback((event) => {
    const root = document.documentElement;
    const next = !isNight();
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const apply = () => {
      if (next) root.dataset.paper = "night";
      else delete root.dataset.paper;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? CHROME.night : CHROME.day);
      try {
        localStorage.setItem(PAPER_KEY, next ? "night" : "day");
      } catch {
        // Without storage the paper still turns; it just isn't remembered.
      }
      window.dispatchEvent(new CustomEvent(PAPER_EVENT, { detail: { night: next, x, y } }));
    };
    if (!still) {
      // The knob squashes as it sets off and settles with a wobble.
      squash.current?.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.24, 0.8)", offset: 0.22 },
          { transform: "scale(0.92, 1.08)", offset: 0.56 },
          { transform: "scale(1.03, 0.97)", offset: 0.8 },
          { transform: "scale(1, 1)" }
        ],
        { duration: 620, easing: "ease-out" }
      );
    }
    if (still || !document.startViewTransition) {
      apply();
      return;
    }
    // The other paper is revealed in a circle that widens from the switch.
    root.style.setProperty("--flip-x", `${x}px`);
    root.style.setProperty("--flip-y", `${y}px`);
    root.style.setProperty("--flip-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
    root.dataset.flipping = "";
    const transition = document.startViewTransition(apply);
    transition.ready.catch(() => {});
    transition.finished.finally(() => delete root.dataset.flipping);
  }, []);

  return (
    <button type="button" className="night-switch" role="switch" aria-checked={night} aria-label="Night paper" title="Night paper" onClick={flip}>
      <span className="ns-track" aria-hidden="true">
        <svg className="ns-sky" viewBox="0 0 55 27" focusable="false">
          <path className="ns-cloud" d="M33.5 19.6h12.2a3.5 3.5 0 0 0 .3-7 4.9 4.9 0 0 0-9.2-1.4 3.7 3.7 0 0 0-3.3 8.4z" />
          <path className="ns-star" style={{ "--n": 0 }} d="M9 4.6l.9 2.3 2.3.9-2.3.9L9 11l-.9-2.3-2.3-.9 2.3-.9z" />
          <path className="ns-star" style={{ "--n": 1 }} d="M18.5 13.2l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" />
          <path className="ns-star" style={{ "--n": 2 }} d="M8.6 18.4l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" />
        </svg>
        <span className="ns-knob">
          <span className="ns-squash" ref={squash}>
            <span className="ns-roll">
              <svg className="ns-sun" viewBox="0 0 24 24" focusable="false">
                <path className="ns-rays" d={RAYS} />
                <circle className="ns-sun-disc" cx="12" cy="12" r="5.6" />
              </svg>
              <svg className="ns-moon" viewBox="0 0 24 24" focusable="false">
                <path className="ns-moon-disc" d="M11.45 3.62A8.4 8.4 0 1 0 20.29 13.38A6.6 6.6 0 0 1 11.45 3.62Z" />
                <circle className="ns-crater" cx="8.6" cy="13.2" r="1.4" />
                <circle className="ns-crater" cx="12.4" cy="17.6" r=".9" />
                <circle className="ns-crater" cx="6.9" cy="9" r=".7" />
              </svg>
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
