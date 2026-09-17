"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { HeroBrandName } from "@/components/hero-brand-name";
import { PageFooter } from "@/components/page-footer";
import { SiteImage } from "@/components/site-image";
import { CareerBar } from "@/components/career-bar";
import { TasteLibrary } from "@/components/taste-library";
import { RailControls } from "@/components/rail-controls";
import { SpotlightContext, useSpotlight } from "@/components/spotlight";

const chapters = ["projects", "career", "taste"];

const projects = [
  {
    id: "features",
    className: "concept-feature",
    href: "https://features.games/",
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
    subtitle: "Portuguese lessons",
    description:
      "Inês’s Portuguese lessons, with availability and booking in one place.",
    src: "/project-art/personal/portuguese-with-ines-conversation.png",
    imageRevision: "left-crop",
    alt: "Two people talking over coffee as colourful speech shapes meet between them",
    above: true,
    aboveSync: true,
    accent: "#7faaff",
    previewFirst: true,
  },
  {
    id: "trek",
    className: "concept-trek",
    href: "/trek/",
    title: "The Trek",
    subtitle: "Paris → Sofia · 2,237 km",
    description:
      "Paris to Sofia on foot, told through the route, photographs and notes.",
    src: "/project-art/personal/trek-paper-landscape.png",
    alt: "A red walking route winding through a miniature paper landscape of villages, woodland and rolling fields",
    accent: "#d96b32",
  },
];

function ProjectShowcase() {
  const { spotlight } = useSpotlight();
  const spotlit = spotlight === "projects";
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
      <h2 id="projects-title">Projects</h2>
      {spotlit ? null : <RailControls rail={rail} label="Projects" controls="project-rail" />}
    </header>
    <div
      className="concept-project-grid concept-project-swipe"
      id="project-rail"
      ref={rail}
      role="list"
      aria-label="Projects"
    >
      {projects.map((project) => {
        const open = active?.id === project.id;
        return (
        <div
          className={`concept-project-stop ${project.className}`}
          role="listitem"
          key={project.id}
          data-preview={open}
          style={{ "--project-card-accent": project.accent }}
        >
          <a
            className="concept-project-card"
            ref={(element) => { cards.current[project.id] = element; }}
            id={project.id === "features" ? "work" : undefined}
            href={project.href}
            aria-label={project.title}
            aria-describedby={spotlit ? `project-copy-${project.id}` : open ? "project-description" : undefined}
            onMouseEnter={() => {
              if (matchMedia("(hover: hover)").matches) {
                if (armed !== project.id) setArmed(null);
                setPreview(project);
              }
            }}
            onFocus={() => { if (armed !== project.id) setArmed(null); setPreview(project); }}
            onClick={(event) => {
              if (spotlit || !project.previewFirst || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              if (armed === project.id) return;
              // A pointer that can hover has already seen the preview, so its
              // first click navigates; only touch needs the preview-first tap.
              if (matchMedia("(hover: hover)").matches) return;
              event.preventDefault();
              setArmed(project.id);
              setPreview(project);
            }}
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
          </a>
        </div>
        );
      })}
    </div>
    </div>
  );
}

export function EditorialHomeConcept({ initialCatalogue, refreshedAt, podcasts }) {
  const [spotlight, setSpotlightState] = useState(null);
  const shown = useRef(null);
  const show = useCallback((next) => {
    if (next === shown.current) return;
    shown.current = next;
    const apply = () => {
      flushSync(() => setSpotlightState(next));
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
    const root = document.documentElement;
    root.dataset.spotlightTransition = "";
    document.startViewTransition(apply).finished.finally(() => delete root.dataset.spotlightTransition);
  }, []);
  // Each spotlight is one history entry, so Back returns to the whole page.
  const setSpotlight = useCallback((next) => {
    const ours = chapters.includes(history.state?.akibwaSpotlight);
    if (next) history[ours ? "replaceState" : "pushState"]({ ...(ours ? history.state : {}), akibwaSpotlight: next }, "", `#${next}`);
    else if (ours) return history.back();
    show(next);
  }, [show]);
  useEffect(() => {
    const restore = () => show(chapters.includes(history.state?.akibwaSpotlight) ? history.state.akibwaSpotlight : null);
    // Escape closes an open detail first; a later press leaves the spotlight.
    const escape = (event) => {
      if (event.key === "Escape" && shown.current) setTimeout(() => { if (!event.defaultPrevented) setSpotlight(null); });
    };
    window.addEventListener("popstate", restore);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("keydown", escape);
    };
  }, [show, setSpotlight]);
  const context = useMemo(() => ({ spotlight, setSpotlight }), [spotlight, setSpotlight]);
  return (
    <SpotlightContext.Provider value={context}>
    <div className="concept-page" data-spotlight={spotlight ?? undefined}>
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
      <TasteLibrary initialCatalogue={initialCatalogue} refreshedAt={refreshedAt} podcasts={podcasts} expanded={spotlight === "taste"} />
    </div>
    </SpotlightContext.Provider>
  );
}
