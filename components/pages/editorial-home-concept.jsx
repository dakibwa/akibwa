"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { HeroBrandName } from "@/components/hero-brand-name";
import { PageFooter } from "@/components/page-footer";
import { SiteImage } from "@/components/site-image";
import { CareerBar } from "@/components/career-bar";
import { TasteLibrary } from "@/components/taste-library";
import { RailControls } from "@/components/rail-controls";

const projects = [
  {
    id: "features",
    className: "concept-feature",
    href: "/features/",
    title: "features",
    subtitle: "daily untangling puzzle",
    description:
      "Ten small networks to untangle each day, with shapes to discover along the way. Free to play.",
    src: "/project-art/personal/features-discoveries.svg",
    alt: "Features wordmark beside colourful house, cup, heart and leaf stamps",
    above: true,
    aboveSync: true,
    accent: "#1b947d",
  },
  {
    id: "portuguese",
    className: "concept-portuguese",
    href: "https://portuguesewithines.com/",
    title: "Português com a Inês",
    subtitle: "European Portuguese lessons",
    description:
      "Inês’s European Portuguese lessons, with availability and booking in one place.",
    src: "/project-art/personal/portuguese-with-ines-conversation.png",
    imageRevision: "left-crop",
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
    src: "/project-art/personal/trek-paper-landscape.png",
    alt: "A red walking route winding through a miniature paper landscape of villages, woodland and rolling fields",
    accent: "#d96b32",
  },
];

function ProjectShowcase() {
  const [preview, setPreview] = useState(null);
  const [lastProject, setLastProject] = useState(projects[0]);
  const [detailOffset, setDetailOffset] = useState(0);
  const [detailWidth, setDetailWidth] = useState(null);
  const [detailAvailable, setDetailAvailable] = useState(false);
  const rail = useRef(null);
  const cards = useRef({});
  const active = detailAvailable ? preview : null;
  // Keep the last detail mounted so its height can animate closed as well.
  const detail = preview ?? lastProject;
  const dismiss = () => setPreview(null);
  useLayoutEffect(() => {
    const shelf = rail.current;
    const card = cards.current[detail.id];
    if (!shelf || !card) return;
    const positionDetail = () => {
      const bounds = card.getBoundingClientRect();
      const shelfBounds = shelf.getBoundingClientRect();
      const left = Math.max(bounds.left, shelfBounds.left);
      const width = Math.max(0, Math.min(bounds.right, shelfBounds.right) - left);
      // A sliver of a card cannot support a readable description box.
      const available = width >= Math.min(200, bounds.width);
      setDetailAvailable(available);
      if (!available) return;
      setDetailOffset(left - shelfBounds.left);
      setDetailWidth(width);
    };
    positionDetail();
    const observer = new ResizeObserver(positionDetail);
    observer.observe(shelf);
    observer.observe(card);
    shelf.addEventListener("scroll", positionDetail, { passive: true });
    return () => {
      observer.disconnect();
      shelf.removeEventListener("scroll", positionDetail);
    };
  }, [detail.id]);
  return (
    <div
      className="concept-project-showcase"
      onMouseLeave={(event) => {
        const focused = projects.find((project) => cards.current[project.id] === event.currentTarget.ownerDocument.activeElement);
        setPreview(focused ?? null);
        if (focused) setLastProject(focused);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
      onKeyDown={(event) => { if (event.key === "Escape") dismiss(); }}
    >
    <header className="concept-projects-head index-section-head">
      <h2 id="projects-title">Projects</h2>
      <RailControls rail={rail} label="Projects" controls="project-rail" />
    </header>
    <div
      className="concept-project-grid concept-project-swipe"
      id="project-rail"
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
          <a
            className="concept-project-card"
            ref={(element) => { cards.current[project.id] = element; }}
            id={project.id === "features" ? "work" : undefined}
            href={project.href}
            aria-label={project.title}
            aria-describedby={active?.id === project.id ? "project-description" : undefined}
            onMouseEnter={() => {
              if (matchMedia("(hover: hover)").matches) {
                setPreview(project);
                setLastProject(project);
              }
            }}
            onFocus={() => { setPreview(project); setLastProject(project); }}
          >
            <SiteImage
              src={project.src}
              revision={project.imageRevision}
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
          </a>
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
          "--hover-detail-accent": detail.accent,
          "--project-detail-offset": `${detailOffset}px`,
        }}
      >
        <div className="concept-project-detail-clip">
          <div
            className={`index-hover-detail concept-project-detail${active ? " is-open" : ""}`}
            style={{ "--hover-detail-width": detailWidth ? `${detailWidth}px` : undefined }}
          >
            <p id="project-description">{detail.description}</p>
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
        <ProjectShowcase />
      </section>

      <CareerBar />
      <TasteLibrary initialCatalogue={initialCatalogue} refreshedAt={refreshedAt} podcasts={podcasts} />
    </div>
  );
}
