"use client";

import { HeroBrandName } from "@/components/hero-brand-name";
import { PageFooter } from "@/components/page-footer";
import { SiteImage } from "@/components/site-image";

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
    href: "/trek/",
    title: "The Trek",
    subtitle: "Paris → Sofia · 1,982 km",
    kind: "Interactive journey",
    description:
      "An interactive atlas tracing 1,982 kilometres from Paris to Sofia through route geometry, landscapes and records across seven countries.",
    action: "Open The Trek",
    src: "/project-art/personal/trek-paris-sofia-project.png",
    alt: "An illustrated seven-colour walking route crossing faceted European terrain, with a lone walker at its centre",
    accent: "#d96b32"
  }
];

const capabilities = [
  {
    label: "Data",
    title: "Make the mess legible.",
    copy: "Turn scattered reporting and brittle processes into a model people can understand and trust.",
    accent: "#1b947d"
  },
  {
    label: "Systems",
    title: "Build the useful thing.",
    copy: "Create small AI-assisted tools and automations around the real job, without unnecessary machinery.",
    accent: "#2f88ff"
  },
  {
    label: "Delivery",
    title: "Leave it in good hands.",
    copy: "Ship something operable, documented and owned by the people who will keep using it.",
    accent: "#c05212"
  }
];

/* Projects use the Career interaction: the card is the link, and hover or
   focus opens a small popover beneath it with the kind, the description and
   the open cue. Nothing else on the page moves except the section's bottom
   space, which the CSS grows so the rose Career rule steps down with it. */
function ProjectShowcase() {
  return (
    <div className="concept-project-grid concept-project-swipe" role="list" aria-label="Projects">
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
          <div className="concept-project-popover" aria-hidden="true">
            <span className="concept-project-popover-kind">{project.kind}</span>
            <strong>{project.title}</strong>
            <p>{project.description}</p>
            <span className="concept-project-popover-open">
              {project.action} <span>↗</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EditorialHomeConcept() {
  return (
    <div className="concept-page">
      <header className="page-grid concept-hero">
        <h1 className="concept-identity">
          <HeroBrandName />
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

      <section className="page-grid concept-capabilities" id="capabilities" aria-labelledby="capabilities-title">
        <header className="concept-capabilities-head">
          <h2 id="capabilities-title">What Akibwa does</h2>
          <p>Small enough to understand. Solid enough to use.</p>
        </header>

        <ol className="concept-capability-list">
          {capabilities.map((capability, index) => (
            <li key={capability.label} style={{ "--capability-accent": capability.accent }}>
              <span className="concept-capability-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="concept-capability-label">{capability.label}</span>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
