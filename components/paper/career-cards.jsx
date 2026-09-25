"use client";

import { SiteImage } from "../site-image";
import { career, CareerStatement, logoClass, logoImage } from "../career-bar";

/*
 * Career: every role on its own card, the most recent first, three to a row
 * on a wide sheet (then two, then one, as it narrows) — logo, name, role and
 * years, and the statement — so the whole career reads at once. The cards
 * arrive one after another when the room opens. Dan first had them on a
 * railway line and then asked for the line to go (25 September 2026). The
 * roles, logos and statements are the career timeline's own
 * (components/career-bar.jsx).
 */
export function CareerCards() {
  return (
    <ol className="room-body career-cards" aria-label="Career, the most recent first">
      {career.map((job, index) => (
        <li key={job.name} className="career-card" style={{ "--company-accent": job.accent, "--n": index }}>
          <span className="career-logo">
            <span className={logoClass(job)}>
              <SiteImage {...logoImage(job)} sizes="34px" alt="" fetchPriority="low" />
            </span>
          </span>
          <h3 className="career-name">{job.name}</h3>
          <p className="career-role">
            {job.role} · {job.span.replace(/ — /g, "–")}
          </p>
          <p className="career-statement">
            <CareerStatement {...job} />
          </p>
        </li>
      ))}
    </ol>
  );
}
