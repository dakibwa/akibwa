"use client";

import { useRef, useState } from "react";
import { SiteImage } from "./site-image";
import { IndexReveal } from "./index-reveal";
import { RailControls } from "./rail-controls";
import curation from "@/data/taste-curation.json";

const { career } = curation;

function CareerStatement({ statement, emphasis = [] }) {
  const escaped = emphasis.map((text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!escaped.length) return statement;
  return statement.split(new RegExp(`(${escaped.join("|")})`, "g")).map((part, index) =>
    emphasis.includes(part) ? <strong key={index}>{part}</strong> : part,
  );
}

export function CareerBar() {
  const [preview, setPreview] = useState(null);
  const [held, setHeld] = useState(null);
  const [lastRole, setLastRole] = useState(0);
  const rail = useRef(null);
  const cards = useRef([]);
  const active = held ?? preview;
  const detailIndex = active ?? lastRole;
  const detail = career[detailIndex];
  const dismiss = () => { setHeld(null); setPreview(null); };
  return (
    <section
      className={`page-grid concept-career-section personal-career${active !== null ? " is-open" : ""}`}
      id="career"
      aria-labelledby="career-title"
      onKeyDown={(event) => { if (event.key === "Escape") dismiss(); }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
      onMouseLeave={(event) => {
        const focused = cards.current.indexOf(event.currentTarget.ownerDocument.activeElement);
        setPreview(active === null || focused < 0 ? null : focused);
        if (active !== null && held === null && focused >= 0) setLastRole(focused);
      }}
    >
      <header className="concept-career-head index-section-head">
        <h2 id="career-title">Career</h2>
        <RailControls rail={rail} label="Career" controls="career-rail" />
      </header>
      <div className="career-reveal-stage">
      <ol className="concept-career-timeline" id="career-rail" ref={rail} style={{ "--career-count": career.length }}>
        {career.map((job, index) => (
          <li key={job.name} style={{ "--company-accent": job.accent }}>
            <button
              className="concept-career-stop"
              ref={(element) => { cards.current[index] = element; }}
              type="button"
              aria-label={`${job.name}, ${job.role}, ${job.span}`}
              aria-expanded={active === index}
              aria-controls="career-detail"
              onMouseEnter={() => {
                if (matchMedia("(hover: hover)").matches) {
                  setPreview(index);
                  if (held === null) setLastRole(index);
                }
              }}
              onFocus={() => { setHeld(null); setPreview(index); setLastRole(index); }}
              onClick={() => { setHeld(held === index ? null : index); setPreview(null); setLastRole(index); }}
            >
              <span className="concept-career-node" aria-hidden="true" />
              <span className="concept-career-card">
                <span className={`concept-career-logo${job.tile ? " is-tile" : ""}${job.logo === "/favicon.svg" ? " is-akibwa" : ""}${job.logo.includes("national-wealth-fund") ? " is-nwf" : ""}${job.logo.includes("lloyds-horse") ? " is-lloyds" : ""}`}>
                  <SiteImage src={job.logo} slot="logo" sizes="32px" alt="" />
                </span>
              </span>
              <span className="concept-career-year" aria-hidden="true">{job.span.replace(/ — /g, "–")}</span>
            </button>
          </li>
        ))}
      </ol>
      <IndexReveal
        open={active !== null}
        itemKey={detail.name}
        rail={rail}
        getAnchor={() => cards.current[detailIndex]}
        onUnavailable={dismiss}
        accent={detail.accent}
        id="career-detail"
        className="concept-career-detail-lane"
        panelClassName="concept-career-popover"
        floating
        reserveAbove
        reserveBelow
        avoid=".concept-career-head h2, .concept-career-head button, .concept-career-stop"
        placementIndex={detailIndex}
      >
        <strong>{detail.name}</strong>
        <span>{detail.role} · {detail.span}</span>
        <p className="concept-career-statement">
          <CareerStatement {...detail} />
        </p>
      </IndexReveal>
      </div>
    </section>
  );
}
