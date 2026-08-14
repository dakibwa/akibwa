"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const sourceAccents = [
  "47, 136, 255",
  "27, 148, 125",
  "115, 112, 255",
  "0, 154, 205",
  "94, 142, 103",
  "101, 118, 139"
];

const outcomeAccents = [
  "235, 92, 8",
  "186, 121, 15",
  "197, 92, 61",
  "186, 124, 40"
];

const heroSourcePhrases = [
  { label: "messy work", accent: sourceAccents[0] },
  { label: "listening history", accent: sourceAccents[1] },
  { label: "health signals", accent: sourceAccents[2] },
  { label: "private context", accent: sourceAccents[3] },
  { label: "twelve open tabs", accent: sourceAccents[4] },
  { label: "rough ideas", accent: sourceAccents[5] }
];

const heroOutcomePhrases = [
  { label: "tools people use", accent: outcomeAccents[0] },
  { label: "dashboards worth opening", accent: outcomeAccents[1] },
  { label: "listening reports", accent: outcomeAccents[2] },
  { label: "working prototypes", accent: outcomeAccents[3] }
];

const REST_INTERVAL = 4200;
const HOVER_INTERVAL = 1500;
const REST_SOURCE_INITIAL_DELAY = 1200;
const REST_OUTCOME_INITIAL_DELAY = 2200;
const HOVER_SOURCE_INITIAL_DELAY = 250;
const HOVER_OUTCOME_INITIAL_DELAY = 850;

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

/* Whether every phrase combination wraps the heading to the same height at the
   current width — i.e. whether cycling is free.

   Measured on the live site: it is free on desktop, where the line count never
   changes, and expensive on a phone, where "messy work" against "dashboards
   worth opening" swings the heading by 96px at 320px wide and 64px at 390px.
   Those swaps fire at 1.2s and 2.2s, so they land squarely in the CLS window
   and were the homepage's mobile score.

   Reserving the tallest combination instead would hold the layout, but it buys
   that with two to three empty lines under the heading on the widths that need
   it most, and the reservation itself moves the page when it is applied after
   hydration. Not animating where animating would reflow costs nothing on the
   widths that were already stable, and leaves a complete, still headline on the
   ones that were not. */
function phraseCyclingHoldsLayout(h1) {
  const width = h1.getBoundingClientRect().width;
  if (!width) return false;

  const clone = h1.cloneNode(true);
  const values = clone.querySelectorAll(".hero-word-cycle-value");
  if (values.length < 2) return false;

  clone.setAttribute("aria-hidden", "true");
  clone.style.position = "absolute";
  clone.style.top = "0";
  clone.style.left = "0";
  clone.style.width = `${width}px`;
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  h1.parentElement.appendChild(clone);

  let tallest = 0;
  let shortest = Infinity;
  for (const source of heroSourcePhrases) {
    for (const outcome of heroOutcomePhrases) {
      values[0].textContent = source.label;
      values[1].textContent = outcome.label;
      const { height } = clone.getBoundingClientRect();
      tallest = Math.max(tallest, height);
      shortest = Math.min(shortest, height);
    }
  }

  clone.remove();
  /* Sub-pixel rounding, not a reflow. */
  return tallest - shortest < 1;
}

function startOffsetCycle(advance, initialDelay, interval) {
  let intervalId = null;

  const timeoutId = window.setTimeout(() => {
    advance();
    intervalId = window.setInterval(advance, interval);
  }, initialDelay);

  return () => {
    window.clearTimeout(timeoutId);
    if (intervalId) window.clearInterval(intervalId);
  };
}

function HeroWordCycle({ phrases, label, index, onEngage, onRelease, onStep }) {
  const currentPhrase = phrases[index];

  return (
    <button
      type="button"
      className="hero-word-cycle"
      aria-label={`${label}: ${currentPhrase.label}. Activate to change.`}
      onMouseEnter={onEngage}
      onMouseLeave={onRelease}
      onFocus={onEngage}
      onBlur={onRelease}
      onClick={onStep}
      style={{ "--cycle-accent-rgb": currentPhrase.accent }}
    >
      <span key={currentPhrase.label} className="hero-word-cycle-value">
        {currentPhrase.label}
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
  const phraseRef = useRef(null);
  const [layoutHolds, setLayoutHolds] = useState(false);
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

  const engage = useCallback(() => setEngaged(true), []);
  const release = useCallback(() => setEngaged(false), []);

  useEffect(() => {
    const h1 = phraseRef.current?.closest("h1");
    if (!h1) return undefined;

    const measure = () => setLayoutHolds(phraseCyclingHoldsLayout(h1));
    measure();

    /* Webfonts land after first paint and change the metrics underneath us. */
    document.fonts?.ready.then(measure).catch(() => {});

    const observer = new ResizeObserver(measure);
    observer.observe(h1.parentElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || !layoutHolds) return undefined;

    const interval = engaged ? HOVER_INTERVAL : REST_INTERVAL;
    const sourceDelay = engaged ? HOVER_SOURCE_INITIAL_DELAY : REST_SOURCE_INITIAL_DELAY;
    const outcomeDelay = engaged ? HOVER_OUTCOME_INITIAL_DELAY : REST_OUTCOME_INITIAL_DELAY;
    const cleanupSource = startOffsetCycle(advanceSource, sourceDelay, interval);
    const cleanupOutcome = startOffsetCycle(advanceOutcome, outcomeDelay, interval);

    return () => {
      cleanupSource();
      cleanupOutcome();
    };
  }, [engaged, reducedMotion, layoutHolds, advanceSource, advanceOutcome]);

  return (
    <span className="hero-dynamic-phrase" ref={phraseRef}>
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
