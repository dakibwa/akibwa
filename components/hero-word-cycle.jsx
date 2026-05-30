"use client";

import { useEffect, useState } from "react";

const heroPhrases = [
  "messy workflows",
  "listening history",
  "health signals",
  "private context",
  "scattered sources",
  "rough ideas"
];

function HeroWordCycle() {
  const [isActive, setIsActive] = useState(false);
  const [index, setIndex] = useState(0);
  const labels = heroPhrases;
  const currentLabel = labels[index];

  useEffect(() => {
    if (!isActive) {
      setIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % labels.length);
    }, 950);

    return () => window.clearInterval(timer);
  }, [isActive, labels.length]);

  return (
    <button
      type="button"
      className={`hero-word-cycle ${isActive ? "is-cycling" : ""}`}
      aria-label={`Cycle focus: ${labels.join(", ")}`}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onPointerEnter={() => setIsActive(true)}
      onPointerLeave={() => setIsActive(false)}
      onClick={() => {
        setIsActive(true);
        setIndex((current) => (current + 1) % labels.length);
      }}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
    >
      <span key={currentLabel} className="hero-word-cycle-value">
        {currentLabel}
      </span>
    </button>
  );
}

export function HeroDynamicPhrase() {
  return (
    <span className="hero-dynamic-phrase">
      <span>that turn </span>
      <HeroWordCycle />
      <span className="hero-outcome">into useful tools.</span>
    </span>
  );
}
