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

const AUTO_CYCLE_INITIAL_DELAY_MS = 12000;
const AUTO_CYCLE_DURATION_MS = 3800;
const AUTO_CYCLE_OUTCOME_STAGGER_MS = 475;

function nextDifferentAccentIndex(phrases, currentIndex) {
  const currentAccent = phrases[currentIndex].accent;

  for (let step = 1; step <= phrases.length; step += 1) {
    const nextIndex = (currentIndex + step) % phrases.length;
    if (phrases[nextIndex].accent !== currentAccent) return nextIndex;
  }

  return (currentIndex + 1) % phrases.length;
}

function HeroWordCycle({ phrases, label, index, isActive, onActivate, onAdvance, onReset }) {
  const currentPhrase = phrases[index];
  const currentLabel = currentPhrase.label;

  useEffect(() => {
    if (!isActive) return undefined;

    const timer = window.setInterval(() => {
      onAdvance();
    }, 950);

    return () => window.clearInterval(timer);
  }, [isActive, onAdvance]);

  return (
    <button
      type="button"
      className={`hero-word-cycle ${isActive ? "is-cycling" : ""}`}
      aria-label={`${label}: ${phrases.map((phrase) => phrase.label).join(", ")}`}
      onMouseEnter={onActivate}
      onMouseLeave={onReset}
      onPointerEnter={onActivate}
      onPointerLeave={onReset}
      onClick={() => {
        onActivate();
        onAdvance();
      }}
      onFocus={onActivate}
      onBlur={onReset}
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
  const [sourceActive, setSourceActive] = useState(false);
  const [outcomeActive, setOutcomeActive] = useState(false);
  const phraseRef = useRef(null);
  const userInteractedRef = useRef(false);
  const autoCycleActiveRef = useRef(false);
  const autoStopTimerRef = useRef(null);
  const sourceIndexRef = useRef(0);
  const outcomeIndexRef = useRef(0);

  const clearAutoStopTimer = useCallback(() => {
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  const markUserInteracted = useCallback(() => {
    userInteractedRef.current = true;

    if (autoCycleActiveRef.current) {
      clearAutoStopTimer();
      autoCycleActiveRef.current = false;
      setSourceActive(false);
      setOutcomeActive(false);
    }
  }, [clearAutoStopTimer]);

  const activateSource = useCallback(() => {
    markUserInteracted();
    setSourceActive(true);
  }, [markUserInteracted]);

  const activateOutcome = useCallback(() => {
    markUserInteracted();
    setOutcomeActive(true);
  }, [markUserInteracted]);

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

  const resetSource = useCallback(() => {
    clearAutoStopTimer();
    autoCycleActiveRef.current = false;
    sourceIndexRef.current = 0;
    setSourceIndex(0);
    setSourceActive(false);
  }, [clearAutoStopTimer]);

  const resetOutcome = useCallback(() => {
    clearAutoStopTimer();
    autoCycleActiveRef.current = false;
    outcomeIndexRef.current = 0;
    setOutcomeIndex(0);
    setOutcomeActive(false);
  }, [clearAutoStopTimer]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    if (prefersReducedMotion?.matches) return undefined;

    let visibilityCleanup = null;

    const shouldRunAutoCycle = () => {
      if (userInteractedRef.current || autoCycleActiveRef.current) return false;
      const bounds = phraseRef.current?.getBoundingClientRect();

      return Boolean(bounds && bounds.bottom > 0 && bounds.top < window.innerHeight);
    };

    const endAutoCycle = () => {
      autoCycleActiveRef.current = false;
      autoStopTimerRef.current = null;
      setSourceActive(false);
      setOutcomeActive(false);
    };

    const startAutoCycle = () => {
      if (!shouldRunAutoCycle()) return;

      autoCycleActiveRef.current = true;
      setSourceActive(true);
      setOutcomeActive(true);
      advanceSource();

      window.setTimeout(() => {
        if (autoCycleActiveRef.current) advanceOutcome();
      }, AUTO_CYCLE_OUTCOME_STAGGER_MS);

      autoStopTimerRef.current = window.setTimeout(endAutoCycle, AUTO_CYCLE_DURATION_MS);
    };

    const initialTimer = window.setTimeout(() => {
      if (document.visibilityState === "hidden") {
        const handleVisible = () => {
          if (document.visibilityState !== "visible") return;

          document.removeEventListener("visibilitychange", handleVisible);
          visibilityCleanup = null;
          startAutoCycle();
        };

        document.addEventListener("visibilitychange", handleVisible);
        visibilityCleanup = () => document.removeEventListener("visibilitychange", handleVisible);
        return;
      }

      startAutoCycle();
    }, AUTO_CYCLE_INITIAL_DELAY_MS);

    return () => {
      window.clearTimeout(initialTimer);
      visibilityCleanup?.();
      clearAutoStopTimer();
      autoCycleActiveRef.current = false;
    };
  }, [advanceOutcome, advanceSource, clearAutoStopTimer]);

  return (
    <span className="hero-dynamic-phrase" ref={phraseRef}>
      <span>that turn </span>
      <HeroWordCycle
        phrases={heroSourcePhrases}
        label="Cycle source material"
        index={sourceIndex}
        isActive={sourceActive}
        onActivate={activateSource}
        onAdvance={advanceSource}
        onReset={resetSource}
      />
      <span className="hero-outcome">
        <span> into </span>
        <HeroWordCycle
          phrases={heroOutcomePhrases}
          label="Cycle output type"
          index={outcomeIndex}
          isActive={outcomeActive}
          onActivate={activateOutcome}
          onAdvance={advanceOutcome}
          onReset={resetOutcome}
        />
        <span>.</span>
      </span>
    </span>
  );
}
