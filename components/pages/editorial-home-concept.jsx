"use client";

import { HeroBrandName } from "@/components/hero-brand-name";
import { PageFooter } from "@/components/page-footer";
import { SiteImage } from "@/components/site-image";
import { CareerBar } from "@/components/career-bar";
import { TasteLibrary } from "@/components/taste-library";

const projects = [
  {
    id: "features",
    className: "concept-feature",
    href: "/features/?from=akibwa",
    title: "features",
    subtitle: "daily untangling puzzle",
    kind: "Daily game",
    description:
      "Untangle ten small networks each day and discover shapes in the threads. The daily game is free.",
    action: "Open features",
    src: "/features/home-card-bright-v4.png",
    alt: "Colourful threads and neurons on a Features puzzle board",
    above: true,
    aboveSync: true,
    accent: "#1b947d",
  },
  {
    id: "portuguese",
    className: "concept-portuguese",
    href: "https://portuguesewithines.com/?from=akibwa",
    title: "Português com a Inês",
    subtitle: "European Portuguese lessons",
    kind: "Lessons and booking",
    description:
      "A website for Inês’s European Portuguese lessons, bringing her teaching, availability and booking into one place.",
    action: "Open Português com a Inês",
    src: "/project-art/personal/portuguese-with-ines-conversation.png",
    alt: "Two people talking over coffee as colourful speech shapes meet between them",
    above: true,
    aboveSync: true,
    accent: "#7faaff",
  },
  {
    id: "trek",
    className: "concept-trek",
    href: "/trek/",
    title: "The Trek",
    subtitle: "Paris → Sofia · 1,982 km",
    kind: "Interactive journey",
    description:
      "A walk from Paris to Sofia, told through the route, photographs and notes from along the way.",
    action: "Open The Trek",
    src: "/project-art/personal/trek-paris-sofia-project.png",
    alt: "An illustrated seven-colour walking route crossing faceted European terrain, with a lone walker at its centre",
    accent: "#d96b32",
  },
];

/* Captions stay in normal flow: every input mode gets the same description,
   and the following Career chapter never competes with an overlay. */
function ProjectShowcase() {
  return (
    <div
      className="concept-project-grid concept-project-swipe"
      role="list"
      aria-label="Projects"
    >
      {projects.map((project) => (
        <div
          className={`concept-project-stop ${project.className}`}
          role="listitem"
          key={project.id}
          style={{ "--project-card-accent": project.accent }}
        >
          <a
            className="concept-project-card"
            id={project.id === "features" ? "work" : undefined}
            href={project.href}
            aria-label={`${project.title}, ${project.kind.toLowerCase()}. ${project.description}`}
          >
            <SiteImage
              src={project.src}
              slot="conceptProject"
              sizes="(max-width:800px) 88vw, (max-width:1358px) calc(32vw - 16px), 418px"
              alt={project.alt}
              above={project.above}
              aboveSync={project.aboveSync}
            />
            <span className="concept-project-foot">
              <span className="concept-project-label">
                <strong>{project.title}</strong>
                <span>{project.subtitle}</span>
              </span>
            </span>
          </a>
          <div className="concept-project-popover">
            <p>{project.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EditorialHomeConcept({ albumPreview, albumCount }) {
  return (
    <div className="concept-page">
      <header className="page-grid concept-hero">
        <h1 className="concept-identity">
          <HeroBrandName />
        </h1>
        <div className="concept-hero-copy">
          <p className="concept-lede">
            Building in the AI age
          </p>
          <PageFooter embedded />
        </div>
      </header>

      <section
        className="page-grid concept-projects"
        id="projects"
        aria-labelledby="projects-title"
      >
        <header className="concept-projects-head">
          <h2 id="projects-title">Projects</h2>
        </header>
        <ProjectShowcase />
      </section>

      <CareerBar />
      <TasteLibrary albumPreview={albumPreview} albumCount={albumCount} />
    </div>
  );
}
