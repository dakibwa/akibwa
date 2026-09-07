"use client";

import { useEffect, useRef, useState } from "react";
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
    description:
      "Ten small networks to untangle each day, with shapes to discover along the way. Free to play.",
    action: "Play features",
    src: "/project-art/personal/features-discoveries.svg",
    alt: "Features wordmark beside colourful house, cup, heart and leaf stamps",
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
    description:
      "Inês’s European Portuguese lessons, with availability and booking in one place.",
    action: "Visit the lesson site",
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
    description:
      "Paris to Sofia on foot, told through the route, photographs and notes.",
    action: "Explore the trek",
    src: "/project-art/personal/trek-paris-sofia-project.png",
    alt: "An illustrated seven-colour walking route crossing faceted European terrain, with a lone walker at its centre",
    accent: "#d96b32",
  },
];

function ProjectShowcase() {
  const [preview, setPreview] = useState(null);
  const [held, setHeld] = useState(null);
  const [lastProject, setLastProject] = useState(projects[0]);
  const [detailOffset, setDetailOffset] = useState(0);
  const rail = useRef(null);
  const cards = useRef({});
  const active = held ?? preview;
  // Keep the last detail mounted so its height can animate closed as well.
  const detail = active ?? lastProject;
  const dismiss = () => { setHeld(null); setPreview(null); };
  useEffect(() => {
    const shelf = rail.current;
    const positionDetail = () => {
      const card = cards.current[detail.id];
      if (!card) return;
      setDetailOffset(Math.max(0, card.getBoundingClientRect().left - shelf.getBoundingClientRect().left));
    };
    positionDetail();
    const observer = new ResizeObserver(positionDetail);
    observer.observe(shelf);
    shelf.addEventListener("scroll", positionDetail, { passive: true });
    return () => {
      observer.disconnect();
      shelf.removeEventListener("scroll", positionDetail);
    };
  }, [detail.id]);
  return (
    <div
      className="concept-project-showcase"
      onMouseLeave={() => setPreview(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
      onKeyDown={(event) => { if (event.key === "Escape") dismiss(); }}
    >
    <div
      className="concept-project-grid concept-project-swipe"
      ref={rail}
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
          <button
            className="concept-project-card"
            ref={(element) => { cards.current[project.id] = element; }}
            id={project.id === "features" ? "work" : undefined}
            type="button"
            aria-label={`Find out more about ${project.title}`}
            aria-expanded={active?.id === project.id}
            aria-controls="project-detail"
            onMouseEnter={() => {
              if (matchMedia("(hover: hover)").matches) {
                setPreview(project);
                if (!held) setLastProject(project);
              }
            }}
            onFocus={() => { setHeld(null); setPreview(project); setLastProject(project); }}
            onClick={() => {
              setHeld(held?.id === project.id ? null : project);
              setPreview(null);
              setLastProject(project);
            }}
          >
            <SiteImage
              src={project.src}
              slot="conceptProject"
              sizes="(max-width:480px) 88vw, (max-width:1050px) 400px, (max-width:1358px) calc(32vw - 16px), 418px"
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
          </button>
        </div>
      ))}
    </div>
      <div
        className={`concept-project-detail-shell${active ? " is-open" : ""}`}
        id="project-detail"
        role="region"
        aria-label={`${detail.title} details`}
        aria-hidden={!active}
        inert={!active}
        style={{
          "--project-detail-accent": detail.accent,
          "--hover-detail-accent": detail.accent,
          "--project-detail-offset": `${detailOffset}px`,
        }}
      >
        <div className="concept-project-detail-clip">
          <div className={`index-hover-detail concept-project-detail${active ? " is-open" : ""}`}>
            <p>{detail.description}</p>
            <a className="concept-project-open" href={detail.href}>
              {detail.action} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditorialHomeConcept({ initialCatalogue, refreshedAt, podcasts }) {
  return (
    <div className="concept-page">
      <header className="page-grid concept-hero">
        <h1 className="concept-identity">
          <HeroBrandName />
        </h1>
        <div className="concept-hero-copy">
          <p className="concept-lede">
            Building in the age of AI
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
      <TasteLibrary initialCatalogue={initialCatalogue} refreshedAt={refreshedAt} podcasts={podcasts} />
    </div>
  );
}
