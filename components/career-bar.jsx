"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { SiteImage } from "./site-image";
import { RailControls } from "./rail-controls";
import { useSpotlight } from "./spotlight";
import curation from "@/data/taste-curation.json";

export const { career } = curation;
// SVG originals do not get the image manifest's automatic content version.
const logoRevisions = {
  "/brand-logos/electrical.svg": "plug-2",
  "/brand-logos/joinery.svg": "backsaw-2",
  "/brand-logos/leeds-building-society-icon.svg": "contrast",
};

// The Freelance card shows the bare Akibwa a rather than the favicon's tile.
// Logos load eagerly but at low priority: React would otherwise preload the SVG
// ones in <head>, ahead of the stylesheet, although Career sits below the fold
// on phones.
export const logoImage = (job) => job.logo === "/favicon.svg"
  ? { src: "/brand-logos/akibwa-a.png", slot: "identityMark" }
  : { src: job.logo, revision: logoRevisions[job.logo], slot: "logo" };
export const logoClass = (job) => `concept-career-logo${job.tile ? " is-tile" : ""}${job.logo === "/favicon.svg" ? " is-akibwa" : ""}${job.logo.includes("national-wealth-fund") ? " is-nwf" : ""}${job.logo.includes("leeds-building-society") ? " is-lbs" : ""}${job.logo.includes("lloyds-horse") ? " is-lloyds" : ""}`;

export function CareerStatement({ statement, emphasis = [] }) {
  const escaped = emphasis.map((text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return statement;
  return statement.split(new RegExp(`(${escaped.join("|")})`, "g")).map((part, index) =>
    emphasis.includes(part) ? <strong key={index}>{part}</strong> : part,
  );
}

export function CareerBar() {
  const { spotlight } = useSpotlight();
  return spotlight === "career" ? <CareerSpotlight /> : <CareerTimeline />;
}

// The spotlight lays every role out at once, statements included.
function CareerSpotlight() {
  return (
    <section className="page-grid concept-career-section personal-career is-spotlit" id="career" aria-labelledby="career-title">
      <header className="concept-career-head index-section-head">
        <h2 id="career-title">Career</h2>
      </header>
      <ol className="career-spotlight">
        {career.map((job) => (
          <li className="career-spotlight-role" key={job.name} style={{ "--company-accent": job.accent }}>
            <span className={`career-spotlight-mark${job.logo === "/favicon.svg" ? " is-dark" : ""}`}>
              <span className={logoClass(job)}>
                <SiteImage {...logoImage(job)} sizes="32px" alt="" above fetchPriority="low" />
              </span>
            </span>
            <span className="career-spotlight-title">
              <strong>{job.name}</strong>
              <span>{job.role} · {job.span.replace(/ — /g, "–")}</span>
            </span>
            <p className="concept-career-statement">
              <CareerStatement {...job} />
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/*
 * The current role's statement rests beneath the timeline, so a visitor sees
 * what Dan does without hovering. Hover, focus or a tap moves it under another
 * role; leaving, blurring or Escape returns it to the current role. Every
 * statement shares one grid cell, so the lane is as tall as the longest from
 * the first paint and choosing a role never moves anything below it.
 */
export function CareerTimeline() {
  const [preview, setPreview] = useState(null);
  const [held, setHeld] = useState(null);
  const [place, setPlace] = useState({ x: 0, anchored: true });
  const rail = useRef(null);
  const track = useRef(null);
  const cards = useRef([]);
  const active = held ?? preview ?? 0;
  const dismiss = () => { setHeld(null); setPreview(null); };

  // Sit under the chosen role, alternating edges as the original popover did,
  // and follow the rail as it scrolls. A role scrolled out of the rail's view
  // hides the statement rather than leave it under the wrong logo.
  useLayoutEffect(() => {
    const shelf = rail.current;
    const box = track.current;
    if (!shelf || !box) return undefined;
    const measure = () => {
      const card = cards.current[active];
      if (!card) return;
      const bounds = shelf.getBoundingClientRect();
      const anchor = card.getBoundingClientRect();
      const width = box.offsetWidth;
      const wanted = (active % 2 ? anchor.right - width : anchor.left) - bounds.left;
      const x = Math.round(Math.max(0, Math.min(wanted, bounds.width - width)));
      const anchored = anchor.right > bounds.left + 24 && anchor.left < bounds.right - 24;
      setPlace((before) => (before.x === x && before.anchored === anchored ? before : { x, anchored }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shelf);
    shelf.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      shelf.removeEventListener("scroll", measure);
    };
  }, [active]);

  return (
    <section
      className="page-grid concept-career-section personal-career is-open"
      id="career-timeline"
      aria-labelledby="career-title"
      onKeyDown={(event) => { if (event.key === "Escape") dismiss(); }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
      onMouseLeave={(event) => {
        // Keyboard focus keeps its role when the pointer leaves.
        const focused = cards.current.indexOf(event.currentTarget.ownerDocument.activeElement);
        setPreview(focused >= 0 ? focused : null);
      }}
    >
      <header className="concept-career-head index-section-head">
        <h2 id="career-title">Career</h2>
        <RailControls rail={rail} label="Career" controls="career-rail" />
      </header>
      <ol className="concept-career-timeline" id="career-rail" ref={rail} style={{ "--career-count": career.length }}>
        {career.map((job, index) => (
          <li key={job.name} style={{ "--company-accent": job.accent }}>
            <button
              className="concept-career-stop"
              ref={(element) => { cards.current[index] = element; }}
              type="button"
              aria-label={`${job.name}, ${job.role}, ${job.span}`}
              aria-describedby={`career-detail-${index}`}
              aria-expanded={active === index}
              aria-controls="career-detail"
              onMouseEnter={() => {
                if (matchMedia("(hover: hover)").matches) setPreview(index);
              }}
              onFocus={() => { setHeld(null); setPreview(index); }}
              onClick={() => { setHeld(held === index ? null : index); setPreview(null); }}
            >
              <span className="concept-career-node" aria-hidden="true" />
              <span className="concept-career-card">
                <span className={logoClass(job)}>
                  <SiteImage {...logoImage(job)} sizes="32px" alt="" above fetchPriority="low" />
                </span>
              </span>
              <span className="concept-career-year" aria-hidden="true">{job.span.replace(/ — /g, "–")}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="career-detail-lane" id="career-detail">
        <div
          className="career-detail-track"
          ref={track}
          data-anchored={place.anchored}
          style={{ "--career-detail-x": `${place.x}px` }}
        >
          {career.map((job, index) => (
            <div
              className="career-detail"
              id={`career-detail-${index}`}
              key={job.name}
              data-active={index === active}
              style={{ "--company-accent": job.accent }}
            >
              <strong>{job.name}</strong>
              <span>{job.role} · {job.span.replace(/ — /g, "–")}</span>
              <p className="concept-career-statement">
                <CareerStatement {...job} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
