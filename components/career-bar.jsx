"use client";

import { useState } from "react";
import { SiteImage } from "./site-image";
import curation from "@/data/taste-curation.json";

const { career } = curation;

export function CareerBar() {
  const [preview, setPreview] = useState(null);
  const [held, setHeld] = useState(null);
  const active = held ?? preview;
  const dismiss = () => { setHeld(null); setPreview(null); };
  return (
    <section
      className="page-grid concept-career-section personal-career"
      id="career"
      aria-labelledby="career-title"
      onKeyDown={(event) => { if (event.key === "Escape") dismiss(); }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
      onMouseLeave={() => setPreview(null)}
    >
      <header className="concept-career-head">
        <h2 id="career-title">Career</h2>
      </header>
      <ol className="concept-career-timeline" style={{ "--career-count": career.length }}>
        {career.map((job, index) => (
          <li key={job.name} style={{ "--company-accent": job.accent }}>
            <button
              className="concept-career-stop"
              type="button"
              aria-label={`${job.name}, ${job.role}, ${job.span}`}
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
                <span className={`concept-career-logo${job.tile ? " is-tile" : ""}${job.logo === "/favicon.svg" ? " is-akibwa" : ""}${job.logo.includes("national-wealth-fund") ? " is-nwf" : ""}${job.logo.includes("lloyds-horse") ? " is-lloyds" : ""}`}>
                  <SiteImage src={job.logo} slot="logo" sizes="32px" alt="" />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="concept-career-detail-lane">
        <div
          className={`concept-career-popover${active !== null ? " is-open" : ""}`}
          id="career-detail"
          aria-live="polite"
          style={active !== null ? {
            "--company-accent": career[active].accent,
            "--career-detail-offset": `${active * 100 / career.length}%`,
          } : undefined}
        >
          {active !== null ? <>
            <strong>{career[active].name}</strong>
            <span>{career[active].role} · {career[active].span}</span>
          </> : null}
        </div>
      </div>
    </section>
  );
}
