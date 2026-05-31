"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const accentBlue = "47, 136, 255";
const accentGreen = "125, 154, 146";
const accentOrange = "255, 111, 26";
const accents = [accentBlue, accentGreen, accentOrange];

const heroSourcePhrases = [
  { label: "messy workflows", accent: accentBlue },
  { label: "listening history", accent: accentOrange },
  { label: "health signals", accent: accentGreen },
  { label: "private context", accent: accentBlue },
  { label: "scattered sources", accent: accentOrange },
  { label: "rough ideas", accent: accentGreen }
];

const heroOutcomePhrases = [
  { label: "useful tools", accent: accentOrange },
  { label: "clear dashboards", accent: accentBlue },
  { label: "calm review surfaces", accent: accentGreen },
  { label: "listening reports", accent: accentBlue },
  { label: "source-backed briefs", accent: accentOrange },
  { label: "working prototypes", accent: accentGreen }
];

function nextDifferentAccentIndex(phrases, currentIndex) {
  const currentAccent = phrases[currentIndex].accent;

  for (let step = 1; step <= phrases.length; step += 1) {
    const nextIndex = (currentIndex + step) % phrases.length;
    if (phrases[nextIndex].accent !== currentAccent) return nextIndex;
  }

  return (currentIndex + 1) % phrases.length;
}

function alternateAccent(accent) {
  return accents.find((candidate) => candidate !== accent) ?? accentBlue;
}

function HeroWordCycle({
  phrases,
  label,
  index,
  isActive,
  isPeerFlick,
  underlineAccent,
  onActivate,
  onAdvance,
  onReset
}) {
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
      className={`hero-word-cycle ${isActive ? "is-cycling" : ""} ${isPeerFlick ? "is-peer-flick" : ""}`}
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
        "--cycle-underline-rgb": underlineAccent ?? currentPhrase.accent
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
  const [sourceUnderlineAccent, setSourceUnderlineAccent] = useState(null);
  const [outcomeUnderlineAccent, setOutcomeUnderlineAccent] = useState(null);
  const sourceIndexRef = useRef(0);
  const outcomeIndexRef = useRef(0);
  const sourceFlickTimer = useRef(null);
  const outcomeFlickTimer = useRef(null);

  useEffect(() => {
    return () => {
      window.clearTimeout(sourceFlickTimer.current);
      window.clearTimeout(outcomeFlickTimer.current);
    };
  }, []);

  const flickPeerUnderline = useCallback((peer, matchingAccent) => {
    const flickAccent = alternateAccent(matchingAccent);

    if (peer === "source") {
      window.clearTimeout(sourceFlickTimer.current);
      setSourceUnderlineAccent(flickAccent);
      sourceFlickTimer.current = window.setTimeout(() => setSourceUnderlineAccent(null), 520);
      return;
    }

    window.clearTimeout(outcomeFlickTimer.current);
    setOutcomeUnderlineAccent(flickAccent);
    outcomeFlickTimer.current = window.setTimeout(() => setOutcomeUnderlineAccent(null), 520);
  }, []);

  const advanceSource = useCallback(() => {
    const nextIndex = nextDifferentAccentIndex(heroSourcePhrases, sourceIndexRef.current);
    const nextAccent = heroSourcePhrases[nextIndex].accent;

    sourceIndexRef.current = nextIndex;
    setSourceIndex(nextIndex);

    if (nextAccent === heroOutcomePhrases[outcomeIndexRef.current].accent) {
      flickPeerUnderline("outcome", nextAccent);
    }
  }, [flickPeerUnderline]);

  const advanceOutcome = useCallback(() => {
    const nextIndex = nextDifferentAccentIndex(heroOutcomePhrases, outcomeIndexRef.current);
    const nextAccent = heroOutcomePhrases[nextIndex].accent;

    outcomeIndexRef.current = nextIndex;
    setOutcomeIndex(nextIndex);

    if (nextAccent === heroSourcePhrases[sourceIndexRef.current].accent) {
      flickPeerUnderline("source", nextAccent);
    }
  }, [flickPeerUnderline]);

  const resetSource = useCallback(() => {
    sourceIndexRef.current = 0;
    setSourceIndex(0);
    setSourceActive(false);
  }, []);

  const resetOutcome = useCallback(() => {
    outcomeIndexRef.current = 0;
    setOutcomeIndex(0);
    setOutcomeActive(false);
  }, []);

  return (
    <span className="hero-dynamic-phrase">
      <span>that turn </span>
      <HeroWordCycle
        phrases={heroSourcePhrases}
        label="Cycle source material"
        index={sourceIndex}
        isActive={sourceActive}
        isPeerFlick={Boolean(sourceUnderlineAccent)}
        underlineAccent={sourceUnderlineAccent}
        onActivate={() => setSourceActive(true)}
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
          isPeerFlick={Boolean(outcomeUnderlineAccent)}
          underlineAccent={outcomeUnderlineAccent}
          onActivate={() => setOutcomeActive(true)}
          onAdvance={advanceOutcome}
          onReset={resetOutcome}
        />
        <span>.</span>
      </span>
    </span>
  );
}
