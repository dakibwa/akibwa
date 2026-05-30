"use client";

import { useEffect, useState } from "react";

const heroSourcePhrases = [
  { label: "messy workflows", accent: "47, 136, 255" },
  { label: "listening history", accent: "47, 136, 255" },
  { label: "health signals", accent: "125, 154, 146" },
  { label: "private context", accent: "255, 111, 26" },
  { label: "scattered sources", accent: "125, 154, 146" },
  { label: "rough ideas", accent: "255, 111, 26" }
];

const heroOutcomePhrases = [
  { label: "useful tools", accent: "47, 136, 255" },
  { label: "clear dashboards", accent: "255, 111, 26" },
  { label: "calm review surfaces", accent: "125, 154, 146" },
  { label: "taste reports", accent: "47, 136, 255" },
  { label: "source-backed briefs", accent: "255, 111, 26" },
  { label: "working prototypes", accent: "125, 154, 146" }
];

function HeroWordCycle({ phrases, label }) {
  const [isActive, setIsActive] = useState(false);
  const [index, setIndex] = useState(0);
  const currentPhrase = phrases[index];
  const currentLabel = currentPhrase.label;

  useEffect(() => {
    if (!isActive) {
      setIndex(0);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % phrases.length);
    }, 950);

    return () => window.clearInterval(timer);
  }, [isActive, phrases.length]);

  return (
    <button
      type="button"
      className={`hero-word-cycle ${isActive ? "is-cycling" : ""}`}
      aria-label={`${label}: ${phrases.map((phrase) => phrase.label).join(", ")}`}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onPointerEnter={() => setIsActive(true)}
      onPointerLeave={() => setIsActive(false)}
      onClick={() => {
        setIsActive(true);
        setIndex((current) => (current + 1) % phrases.length);
      }}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      style={{ "--cycle-accent-rgb": currentPhrase.accent }}
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
      <HeroWordCycle phrases={heroSourcePhrases} label="Cycle source material" />
      <span className="hero-outcome">
        <span>into </span>
        <HeroWordCycle phrases={heroOutcomePhrases} label="Cycle output type" />
        <span>.</span>
      </span>
    </span>
  );
}
