"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const sourceAccents = [
  "47, 136, 255",
  "32, 164, 139",
  "115, 112, 255",
  "0, 154, 205",
  "94, 142, 103",
  "101, 118, 139"
];

const outcomeAccents = [
  "255, 111, 26",
  "224, 154, 42",
  "226, 82, 118",
  "197, 92, 61",
  "164, 104, 217",
  "186, 124, 40"
];

const heroSourcePhrases = [
  { label: "messy workflows", accent: sourceAccents[0] },
  { label: "listening history", accent: sourceAccents[1] },
  { label: "health signals", accent: sourceAccents[2] },
  { label: "private context", accent: sourceAccents[3] },
  { label: "scattered sources", accent: sourceAccents[4] },
  { label: "rough ideas", accent: sourceAccents[5] }
];

const heroOutcomePhrases = [
  { label: "useful tools", accent: outcomeAccents[0] },
  { label: "clear dashboards", accent: outcomeAccents[1] },
  { label: "calm review surfaces", accent: outcomeAccents[2] },
  { label: "listening reports", accent: outcomeAccents[3] },
  { label: "source-backed briefs", accent: outcomeAccents[4] },
  { label: "working prototypes", accent: outcomeAccents[5] }
];

// Calm ambient pace at rest; quicker while the reader is hovering/focusing
// either word, so curiosity is rewarded with a faster run through the range.
const REST_INTERVAL = 2600;
const HOVER_INTERVAL = 1000;

function nextDifferentAccentIndex(phrases, currentIndex) {
  const currentAccent = phrases[currentIndex].accent;

  for (let step = 1; step <= phrases.length; step += 1) {
    const nextIndex = (currentIndex + step) % phrases.length;
    if (phrases[nextIndex].accent !== currentAccent) return nextIndex;
  }

  return (currentIndex + 1) % phrases.length;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function HeroWordCycle({ phrases, label, index, onEngage, onRelease, onStep }) {
  const currentPhrase = phrases[index];
  const currentLabel = currentPhrase.label;

  return (
    <button
      type="button"
      className="hero-word-cycle"
      aria-label={`${label}: ${currentLabel}. Activate to change.`}
      onMouseEnter={onEngage}
      onMouseLeave={onRelease}
      onFocus={onEngage}
      onBlur={onRelease}
      onClick={onStep}
      style={{
        "--cycle-accent-rgb": currentPhrase.accent,
        "--cycle-underline-rgb": currentPhrase.accent
      }}
    >
      <span key={currentLabel} className="hero-word-cycle-value">
        {currentLabel}
      </span>
    </button>
  );
}

export function HeroDynamicPhrase() {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const sourceIndexRef = useRef(0);
  const outcomeIndexRef = useRef(0);
  const reducedMotion = usePrefersReducedMotion();

  const advanceSource = useCallback(() => {
    const nextIndex = nextDifferentAccentIndex(heroSourcePhrases, sourceIndexRef.current);
    sourceIndexRef.current = nextIndex;
    setSourceIndex(nextIndex);
  }, []);

  const advanceOutcome = useCallback(() => {
    const nextIndex = nextDifferentAccentIndex(heroOutcomePhrases, outcomeIndexRef.current);
    outcomeIndexRef.current = nextIndex;
    setOutcomeIndex(nextIndex);
  }, []);

  const advanceBoth = useCallback(() => {
    advanceSource();
    advanceOutcome();
  }, [advanceSource, advanceOutcome]);

  const engage = useCallback(() => setEngaged(true), []);
  const release = useCallback(() => setEngaged(false), []);

  // Auto-cycle the whole line together so it reads as one composed phrase
  // breathing, not two words flickering independently. Honour reduced motion
  // by staying still until the reader clicks.
  useEffect(() => {
    if (reducedMotion) return undefined;

    const interval = engaged ? HOVER_INTERVAL : REST_INTERVAL;
    const timer = window.setInterval(advanceBoth, interval);

    return () => window.clearInterval(timer);
  }, [engaged, reducedMotion, advanceBoth]);

  return (
    <span className="hero-dynamic-phrase">
      <span>that turn </span>
      <HeroWordCycle
        phrases={heroSourcePhrases}
        label="Source material"
        index={sourceIndex}
        onEngage={engage}
        onRelease={release}
        onStep={advanceSource}
      />
      <span className="hero-outcome">
        <span> into </span>
        <HeroWordCycle
          phrases={heroOutcomePhrases}
          label="Output type"
          index={outcomeIndex}
          onEngage={engage}
          onRelease={release}
          onStep={advanceOutcome}
        />
        <span>.</span>
      </span>
    </span>
  );
}
