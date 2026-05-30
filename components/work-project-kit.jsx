"use client";

import Image from "next/image";
import { ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { workProjects } from "@/components/site-data";

export function WorkProjectKit() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const selectedProject = workProjects[selectedIndex] ?? workProjects[0];

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;

      const index = workProjects.findIndex(
        (project) => project.slug === hash || project.aliases?.includes(hash)
      );
      if (index >= 0) setSelectedIndex(index);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (!isPreviewMaximized) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPreviewMaximized]);

  const selectProject = (index) => {
    setSelectedIndex(index);
    setIsPreviewMaximized(false);
    const slug = workProjects[index].slug;
    if (slug) window.history.replaceState(null, "", `#${slug}`);
  };

  const aliases = selectedProject.aliases?.map((alias) => (
    <span className="anchor-alias" id={alias} aria-hidden="true" key={alias} />
  ));

  return (
    <>
      <section className="page-grid work-board" aria-labelledby="featured-projects-title">
        <h2 id="featured-projects-title">Featured projects</h2>
        <div className="work-card-grid">
          {workProjects.map((project, index) => (
            <button
              type="button"
              className={`studio-card work-card ${index === selectedIndex ? "is-selected" : ""}`}
              key={project.title}
              aria-pressed={index === selectedIndex}
              onClick={() => selectProject(index)}
            >
              <header>
                <span>{project.number}</span>
                <div>
                  <h3>{project.title}</h3>
                  <p>{project.type}</p>
                </div>
              </header>
              <Image
                src={project.image}
                alt={project.alt}
                width={620}
                height={380}
                priority={index === 0}
                sizes="(max-width: 900px) 100vw, 25vw"
              />
              <footer>
                <span>{index === selectedIndex ? "Selected" : "View project"}</span>
                <ArrowRight size={18} strokeWidth={1.8} />
              </footer>
            </button>
          ))}
        </div>
      </section>

      {selectedProject.embedUrl ? (
        <section
          className={`page-grid featured-case live-case ${isPreviewMaximized ? "is-maximized" : ""}`}
          id={selectedProject.slug}
          aria-live="polite"
        >
          {aliases}
          <header className="live-case-header">
            <div>
              <span>Selected project</span>
              <h2>{selectedProject.title}</h2>
              <p>{selectedProject.type}</p>
            </div>
            <button
              type="button"
              className="live-case-toggle"
              aria-pressed={isPreviewMaximized}
              onClick={() => setIsPreviewMaximized((current) => !current)}
            >
              {isPreviewMaximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              <span>{isPreviewMaximized ? "Minimise" : "Maximise"}</span>
            </button>
          </header>
          <div className="live-frame-shell">
            <iframe
              src={selectedProject.embedUrl}
              title={`${selectedProject.title} live dashboard`}
              className="live-frame"
            />
          </div>
        </section>
      ) : (
        <section className="page-grid featured-case" id={selectedProject.slug} aria-live="polite">
          {aliases}
          <div className="case-copy">
            <span>Selected project</span>
            <h2>{selectedProject.title}</h2>
            <p>{selectedProject.type}</p>
            <dl>
              {selectedProject.rows.map(([term, description]) => (
                <div key={term}>
                  <dt>
                    <i />
                    {term}
                  </dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="case-art" aria-hidden="true">
            <Image src={selectedProject.image} alt="" width={760} height={360} />
            <div className="case-score">
              <strong>{selectedProject.score}</strong>
            </div>
            <ul>
              {selectedProject.metrics.map(([label, value]) => (
                <li key={label}>
                  {label} <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
