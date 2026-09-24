"use client";

import { useRef, useState } from "react";
import { SiteImage } from "./site-image";
import { RailControls } from "./rail-controls";

/*
 * The project cards from the previous homepage, unchanged in behaviour: a 5:2
 * artwork above a caption, a short serif description that slides in from the
 * right on hover or focus (or prints beneath every card when spotlit), and a
 * preview-first tap on touch screens for cards that ask for it. A project
 * without an address yet is the same card, unlinked.
 */
export function ProjectShowcase({ projects, spotlit = false, label = "Projects" }) {
  const [preview, setPreview] = useState(null);
  const rail = useRef(null);
  const cards = useRef({});
  const [armed, setArmed] = useState(null);
  // The spotlight prints every description, so nothing needs previewing.
  const active = spotlit ? null : preview;
  const dismiss = () => { setPreview(null); setArmed(null); };
  return (
    <div
      className={`concept-project-showcase${spotlit ? " is-spotlit" : ""}`}
      onMouseLeave={(event) => {
        const focused = projects.find((project) => cards.current[project.id] === event.currentTarget.ownerDocument.activeElement);
        setPreview(focused ?? null);
        if (!focused) setArmed(null);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
      onKeyDown={(event) => { if (event.key === "Escape" && active) { event.preventDefault(); dismiss(); } }}
    >
    <header className="concept-projects-head index-section-head">
      <h2 id="projects-title">{label}</h2>
      {spotlit ? null : <RailControls rail={rail} label={label} controls="project-rail" />}
    </header>
    <div
      className="concept-project-grid concept-project-swipe"
      id="project-rail"
      ref={rail}
      role="list"
      aria-label={label}
    >
      {projects.map((project) => {
        const open = active?.id === project.id;
        // A site not yet public is shown without a link.
        const Card = project.href ? "a" : "div";
        return (
        <div
          className={`concept-project-stop ${project.className}`}
          role="listitem"
          key={project.id}
          data-preview={open}
          style={{ "--project-card-accent": project.accent }}
        >
          <Card
            className={`concept-project-card${project.href ? "" : " is-unlinked"}`}
            ref={(element) => { cards.current[project.id] = element; }}
            {...(project.href ? {
              href: project.href,
              "aria-label": project.title,
              "aria-describedby": spotlit ? `project-copy-${project.id}` : open ? "project-description" : undefined,
              onMouseEnter: () => {
                if (matchMedia("(hover: hover)").matches) {
                  if (armed !== project.id) setArmed(null);
                  setPreview(project);
                }
              },
              onFocus: () => { if (armed !== project.id) setArmed(null); setPreview(project); },
              onClick: (event) => {
                if (spotlit || !project.previewFirst || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                if (armed === project.id) return;
                // A pointer that can hover has already seen the preview, so its
                // first click navigates; only touch needs the preview-first tap.
                if (matchMedia("(hover: hover)").matches) return;
                event.preventDefault();
                setArmed(project.id);
                setPreview(project);
              }
            } : {})}
          >
            {/* The description slides in from the card's right edge and moves
                the artwork aside, so the card never changes size. */}
            <span className="concept-project-media">
              <SiteImage
                src={project.src}
                revision={project.imageRevision}
                slot="conceptProject"
                sizes="(max-width:480px) 88vw, (max-width:1050px) and (orientation:portrait) 400px, (max-width:1358px) calc(30vw - 12px), 418px"
                alt={project.alt}
                above={project.above}
                aboveSync={project.aboveSync}
              />
              {spotlit ? null : (
                <span className="concept-project-aside" id={open ? "project-description" : undefined} aria-hidden={!open}>
                  <span>{project.description}</span>
                </span>
              )}
            </span>
            <span className="concept-project-foot">
              <span className="concept-project-label">
                <strong>{project.title}</strong>
                <span>{project.subtitle}</span>
              </span>
            </span>
            {spotlit ? <span className="concept-project-copy" id={`project-copy-${project.id}`}>{project.description}</span> : null}
          </Card>
        </div>
        );
      })}
    </div>
    </div>
  );
}
