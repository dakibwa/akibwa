"use client";

import { useEffect, useState } from "react";
import { deck } from "@/components/deck-data";
import { HeroFlipName } from "@/components/hero-word-cycle";
import { PageFooter } from "@/components/page-footer";
import { HomePage } from "@/components/pages/home-page";
import { SiteImage } from "@/components/site-image";

/* Keep the whole working history in sequence, including the two stretches on
   the tools between office roles. Details stay inside the compact interaction
   so Career keeps the original horizontal rhythm. */
const careerNames = [
  "Freelance",
  "National Wealth Fund",
  "Leeds Building Society",
  "Electrical Work",
  "Sky Betting & Gaming",
  "Joinery Work",
  "Vanquis Bank",
  "Lloyds Banking Group"
];
const career = careerNames
  .map((name) => deck.jobs.find((job) => job.name === name))
  .filter(Boolean);

const projects = [
  {
    id: "features",
    className: "concept-feature",
    href: "/features/?from=akibwa",
    title: "features",
    subtitle: "daily untangling puzzle",
    kind: "Daily game",
    description:
      "Pull apart the features tangled through a neural net. Ten fresh puzzles a day turn interpretability into something you can play.",
    action: "Open features",
    src: "/features/home-card-bright-v4.png",
    alt: "A bright Features puzzle board with five sweeping tangled threads, crossings, neurons, the Features wordmark and a vertical column of five feature symbols",
    above: true,
    aboveSync: true,
    accent: "#1b947d"
  },
  {
    id: "portuguese",
    className: "concept-portuguese",
    href: "https://portuguesewithines.com/?from=akibwa",
    title: "Português com a Inês",
    subtitle: "European Portuguese lessons",
    kind: "Lessons and booking",
    description:
      "European Portuguese lessons in Porto and online, with prices, availability and booking brought together in one simple place.",
    action: "Open Português com a Inês",
    src: "/project-art/personal/portuguese-with-ines-conversation.png",
    alt: "Two people talking over coffee as colourful speech shapes meet between them",
    above: true,
    aboveSync: true,
    accent: "#7faaff"
  },
  {
    id: "trek",
    className: "concept-trek",
    href: "/trek/?from=akibwa",
    title: "The Trek",
    subtitle: "Paris → Sofia · 1,982 km",
    kind: "Interactive journey",
    description:
      "The 2019 walk from Paris to Sofia, told day by day through the real route, journal, records and 1,982 kilometres across seven countries.",
    action: "Open The Trek",
    src: "/project-art/personal/trek-paris-sofia-project.png",
    alt: "An illustrated seven-colour walking route crossing faceted European terrain, with a lone walker at its centre",
    accent: "#d96b32"
  }
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function CareerStatement({ statement, emphasis }) {
  if (!emphasis?.length) return statement;

  const terms = new Set(emphasis);
  const matcher = new RegExp(`(${emphasis.map(escapeRegExp).join("|")})`, "g");

  return statement.split(matcher).map((part, index) =>
    terms.has(part) ? <strong key={`${part}-${index}`}>{part}</strong> : part
  );
}

function ProjectShowcase() {
  const [previewProject, setPreviewProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const activeProject = selectedProject ?? previewProject;

  useEffect(() => {
    if (!selectedProject) return undefined;
    const close = (event) => {
      if (event.key === "Escape") {
        setSelectedProject(null);
        setPreviewProject(null);
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selectedProject]);

  return (
    <>
      <div
        className="concept-project-grid concept-project-swipe"
        role="group"
        aria-label="Project carousel"
        onMouseLeave={() => setPreviewProject(null)}
      >
        {projects.map((project) => {
          const active = activeProject?.id === project.id;
          return (
            <button
              className={`concept-project-card ${project.className}${active ? " is-active" : ""}`}
              id={project.id === "features" ? "work" : undefined}
              key={project.id}
              type="button"
              aria-label={`Find out more about ${project.title}`}
              aria-controls="project-detail"
              aria-expanded={active}
              onMouseEnter={() => setPreviewProject(project)}
              onFocus={() => setPreviewProject(project)}
              onBlur={() => setPreviewProject(null)}
              onClick={() => setSelectedProject(project)}
            >
              <SiteImage
                src={project.src}
                slot="conceptProject"
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
          );
        })}
      </div>

      <div
        className={`concept-project-detail-shell${activeProject ? " is-open" : ""}`}
        id="project-detail"
        aria-hidden={!activeProject}
        style={{ "--project-detail-accent": activeProject?.accent }}
      >
        <div className="concept-project-detail-clip">
          {activeProject ? (
            <div className="concept-project-detail">
              <div>
                <span className="concept-project-detail-kind">{activeProject.kind}</span>
                <h3>{activeProject.title}</h3>
              </div>
              <p>{activeProject.description}</p>
              <a className="concept-project-open" href={activeProject.href}>
                {activeProject.action}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function EditorialHomeConcept() {
  return (
    <div className="concept-page">
      <header className="page-grid concept-hero">
        <h1 className="concept-identity">
          <HeroFlipName />
        </h1>
        <div className="concept-hero-copy">
          <p className="concept-lede">
            Building in the age of AI.
          </p>
          <PageFooter embedded />
        </div>
      </header>

      <section className="page-grid concept-projects" id="projects" aria-labelledby="projects-title">
        <header className="concept-projects-head">
          <h2 id="projects-title">Projects</h2>
        </header>
        <ProjectShowcase />
      </section>

      <section className="page-grid concept-career-section" id="career" aria-labelledby="career-title">
        <header className="concept-career-head">
          <h2 id="career-title">Career</h2>
        </header>

        <ol
          className="concept-career-timeline"
          style={{ "--career-count": career.length }}
        >
          {career.map((job) => (
            <li
              className="concept-career-stop"
              key={job.name}
              style={{ "--company-accent": job.accent }}
              tabIndex={0}
              aria-label={`${job.name}, ${job.role}, ${job.span}. ${job.statement}`}
            >
              <span className="concept-career-node" aria-hidden="true" />
              <div className="concept-career-card">
                <span
                  className={`concept-career-logo${job.tile ? " is-tile" : ""}${job.logo === "/favicon.svg" ? " is-akibwa" : ""}${job.logo === "/brand-logos/national-wealth-fund-icon.png" ? " is-nwf" : ""}${job.logo === "/brand-logos/lloyds-horse-icon.png" ? " is-lloyds" : ""}`}
                  aria-hidden="true"
                >
                  {job.logo ? <SiteImage src={job.logo} slot="logo" sizes="32px" alt="" /> : null}
                </span>
              </div>
              <div className="concept-career-popover" aria-hidden="true">
                <strong>{job.name}</strong>
                <span>{job.role} · {job.span}</span>
                <p className="concept-career-statement">
                  <CareerStatement statement={job.statement} emphasis={job.emphasis} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="concept-archive" id="taste" aria-labelledby="taste-title">
        <div className="page-grid concept-taste-head">
          <header className="concept-archive-head">
            <h2 id="taste-title">Taste Library</h2>
          </header>
        </div>

        <div className="concept-archive-wall">
          <HomePage tasteOnly />
        </div>
      </section>
    </div>
  );
}
