"use client";

import { useEffect, useRef, useState } from "react";
import { SiteImage } from "@/components/site-image";

const thumbnailSizes =
  "(max-width: 560px) calc(50vw - 30px), (max-width: 900px) calc(50vw - 48px), (max-width: 1358px) 22vw, 240px";
const previewSizes = "(max-width: 1072px) calc(100vw - 34px), 1040px";

export function ClientSitePreviews({ projects }) {
  const [active, setActive] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (active && !dialog.open) {
      dialog.showModal();
      dialog.focus({ preventScroll: true });
    }
    if (!active && dialog.open) dialog.close();
  }, [active]);

  const closePreview = () => setActive(null);

  return (
    <>
      <div className="concept-client-projects" aria-label="Current client projects">
        {projects.map((project) => (
          <button
            className="concept-client-project"
            key={project.name}
            type="button"
            aria-haspopup="dialog"
            aria-label={`Preview the ${project.name} website`}
            onClick={() => setActive(project)}
            style={{ "--client-accent": project.accent, "--client-ground": project.ground }}
          >
            <span
              className={`concept-client-visual ${project.markTreatment}`}
              aria-hidden="true"
            >
              <SiteImage
                src={project.art}
                slot="clientMark"
                sizes={thumbnailSizes}
                alt=""
                above
              />
            </span>
            <span className="concept-client-body">
              <strong>{project.name}</strong>
              <span className="concept-client-open" aria-hidden="true">view ↗</span>
            </span>
          </button>
        ))}
      </div>

      <dialog
        className="concept-client-dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-labelledby={active ? "concept-client-preview-title" : undefined}
        onClose={closePreview}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        {active ? (
          <div className="concept-client-preview" style={{ "--client-accent": active.accent }}>
            <header className="concept-client-preview-head">
              <strong id="concept-client-preview-title">{active.name}</strong>
              <span>Website preview</span>
              <button type="button" onClick={() => dialogRef.current?.close()}>Close</button>
            </header>
            <div className="concept-client-preview-screen">
              <SiteImage
                src={active.preview}
                slot="clientSite"
                sizes={previewSizes}
                alt={`${active.name} homepage preview`}
                priority
              />
            </div>
            <footer className="concept-client-preview-foot">
              <p>{active.summary}</p>
              {active.href ? (
                <a href={active.href} target="_blank" rel="noopener noreferrer">
                  Open full site <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </footer>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
