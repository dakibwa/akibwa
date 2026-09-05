"use client";

import { useEffect, useState } from "react";

const names = [
  { label: "Daniel", accent: "47, 136, 255" },
  { label: "Akibwa", accent: "235, 92, 8" },
];

// The original 220ms word flick: first at 3.2s, then every 4.2s.
// Both invisible sizers reserve the wider name before hydration.
export function HeroBrandName() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let timer;
    const advance = () => {
      setIndex((value) => (value + 1) % names.length);
      timer = setTimeout(advance, 4200);
    };
    const reset = () => {
      clearTimeout(timer);
      if (media.matches) setIndex(0);
      else if (!document.hidden) timer = setTimeout(advance, 3200);
    };
    reset();
    media.addEventListener("change", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      clearTimeout(timer);
      media.removeEventListener("change", reset);
      document.removeEventListener("visibilitychange", reset);
    };
  }, []);
  const current = names[index];
  return (
    <span className="personal-intro">
      <span className="visually-hidden">I'm Daniel. Online as Akibwa.</span>
      <span aria-hidden="true">
        {"I’m "}
        <span className="hero-name" style={{ "--name-accent-rgb": current.accent }}>
          <span className="hero-name-stack">
            {names.map((name) => (
              <span key={name.label} className="hero-name-sizer">{name.label}</span>
            ))}
            <span key={current.label} className="hero-name-value">{current.label}</span>
          </span>
        </span>
      </span>
    </span>
  );
}
