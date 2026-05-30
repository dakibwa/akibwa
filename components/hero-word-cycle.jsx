"use client";

import { useEffect, useMemo, useState } from "react";

const heroWordSets = [
  {
    original: "messy workflows",
    words: ["manual handoffs", "client handoffs", "admin workflows", "repeatable work"]
  },
  {
    original: "data",
    words: ["KPIs", "risk", "cost", "docs", "flow"]
  },
  {
    original: "music",
    words: ["taste", "audio", "demos", "ideas", "loops"]
  },
  {
    original: "private knowledge",
    words: ["personal archives", "evidence archives", "document archives", "research archives"]
  }
];

function letterCount(value) {
  return value.replace(/[^a-z]/gi, "").length;
}

heroWordSets.forEach(({ original, words }) => {
  const expected = letterCount(original);
  const mismatched = words.find((word) => letterCount(word) !== expected);

  if (mismatched) {
    throw new Error(`Hero word cycle mismatch: "${mismatched}" does not match "${original}" length.`);
  }
});

function HeroWordCycle({ original, words }) {
  const [isActive, setIsActive] = useState(false);
  const [index, setIndex] = useState(0);
  const labels = useMemo(() => [original, ...words], [original, words]);
  const currentLabel = isActive ? labels[index] : original;

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
      aria-label={`${original}: ${words.join(", ")}`}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onPointerEnter={() => setIsActive(true)}
      onPointerLeave={() => setIsActive(false)}
      onClick={() => setIsActive(true)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      style={{ "--cycle-width": `${original.length}ch` }}
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
      <HeroWordCycle {...heroWordSets[0]} />
      <span>, </span>
      <HeroWordCycle {...heroWordSets[1]} />
      <span>, </span>
      <HeroWordCycle {...heroWordSets[2]} />
      <span>, and </span>
      <HeroWordCycle {...heroWordSets[3]} />
      <span>.</span>
    </span>
  );
}
