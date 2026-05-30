"use client";

import Image from "next/image";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Database,
  Disc3,
  HeartPulse,
  Headphones,
  LockKeyhole,
  Maximize2,
  Minimize2,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageFooter } from "@/components/page-footer";
import { personalProjects } from "@/components/site-data";

function canUseLocalFrame() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getProjectFrameUrl(project, isLocalHost) {
  if (project.embedUrl) return project.embedUrl;
  if (isLocalHost && project.localUrl) return project.localUrl;
  return "";
}

function PersonalProjectVisual({ project, priority }) {
  if (project.visual === "vitals") {
    return (
      <div className="personal-dashboard-thumb" role="img" aria-label={project.alt}>
        <div className="personal-dashboard-thumb-top">
          <span />
          <i />
          <i />
        </div>
        <div className="personal-dashboard-thumb-main">
          <strong>Vitals</strong>
          <em>source-backed review</em>
          <div>
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="personal-dashboard-thumb-grid">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <Image
      src={project.image}
      alt={project.alt}
      width={620}
      height={380}
      priority={priority}
      sizes="(max-width: 760px) 100vw, (max-width: 1060px) 50vw, 25vw"
    />
  );
}

function PersonalProjectCard({ project, priority, isSelected, onSelect }) {
  const isLive = project.mode === "embed" || project.mode === "preview";

  return (
    <button
      type="button"
      id={project.slug}
      className={`studio-card work-card personal-project-card ${isSelected ? "is-selected" : ""}`}
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      <header>
        <span>{project.number}</span>
        <div>
          <h3>{project.title}</h3>
          <p>{project.type}</p>
        </div>
      </header>
      <PersonalProjectVisual project={project} priority={priority} />
      <div className="personal-card-body">
        <p>{project.summary}</p>
        <div className="personal-card-tags" aria-label={`${project.title} tags`}>
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <footer>
        <span>{isSelected ? "Selected" : project.cta}</span>
        {isLive ? <ArrowRight size={18} strokeWidth={1.8} /> : <LockKeyhole size={17} strokeWidth={1.7} />}
      </footer>
    </button>
  );
}

function SonicShowcase({ project, frameUrl }) {
  const metrics = [
    ["Source", "Last.fm", Radio],
    ["Library", "Taste", Disc3],
    ["Reports", "Charts", Sparkles],
  ];

  return (
    <section className="page-grid vitals-showcase" id={`${project.slug}-preview`} aria-live="polite">
      <div className="vitals-showcase-copy">
        <span>Selected project</span>
        <h2>{project.title}</h2>
        <p>{project.summary}</p>
        <dl>
          <div>
            <dt>
              <Headphones size={15} />
              Listening archive
            </dt>
            <dd>Last.fm history becomes artists, albums, tracks, timelines, and taste reports.</dd>
          </div>
          <div>
            <dt>
              <Database size={15} />
              Product shape
            </dt>
            <dd>A music-data surface that stays here on Personal instead of bouncing into an old work page.</dd>
          </div>
        </dl>
        <div className="vitals-showcase-actions">
          {frameUrl ? (
            <a href={frameUrl} target="_blank" rel="noreferrer">
              Open dashboard
              <ArrowRight size={17} strokeWidth={1.8} />
            </a>
          ) : (
            <span>
              <Headphones size={15} strokeWidth={1.7} />
              Native project preview
            </span>
          )}
        </div>
      </div>

      <div className="vitals-dashboard-preview" aria-label="Sonic FM dashboard preview">
        <header>
          <div>
            <span>Sonic FM</span>
            <strong>Listening intelligence</strong>
          </div>
          <em>Music system</em>
        </header>
        <div className="vitals-preview-grid">
          {metrics.map(([label, value, Icon]) => (
            <article key={label}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
        <div className="vitals-preview-chart">
          <span />
          <i style={{ height: "62%" }} />
          <i style={{ height: "74%" }} />
          <i style={{ height: "48%" }} />
          <i style={{ height: "82%" }} />
          <i style={{ height: "56%" }} />
          <i style={{ height: "69%" }} />
        </div>
        <footer>
          <CheckCircle2 size={16} />
          <span>Built to turn listening history into something readable and useful.</span>
        </footer>
      </div>
    </section>
  );
}

function VitalsShowcase({ project }) {
  const metrics = [
    ["Signals", "Local", Activity],
    ["Sources", "Private", Database],
    ["Review", "Calm", Sparkles],
  ];

  return (
    <section className="page-grid vitals-showcase" id={`${project.slug}-preview`} aria-live="polite">
      <div className="vitals-showcase-copy">
        <span>Selected project</span>
        <h2>{project.title}</h2>
        <p>{project.summary}</p>
        <dl>
          <div>
            <dt>
              <ShieldCheck size={15} />
              Data boundary
            </dt>
            <dd>Private health sources stay local; the public surface shows the product pattern, not raw records.</dd>
          </div>
          <div>
            <dt>
              <HeartPulse size={15} />
              Product shape
            </dt>
            <dd>Source freshness, health signals, trends, and prompts for review conversations.</dd>
          </div>
        </dl>
        <div className="vitals-showcase-actions">
          <span>
            <LockKeyhole size={15} strokeWidth={1.7} />
            Private native preview
          </span>
        </div>
      </div>

      <div className="vitals-dashboard-preview" aria-label="Vitals dashboard preview">
        <header>
          <div>
            <span>Vitals</span>
            <strong>Private health picture</strong>
          </div>
          <em>Local only</em>
        </header>
        <div className="vitals-preview-grid">
          {metrics.map(([label, value, Icon]) => (
            <article key={label}>
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
        <div className="vitals-preview-chart">
          <span />
          <i style={{ height: "46%" }} />
          <i style={{ height: "58%" }} />
          <i style={{ height: "42%" }} />
          <i style={{ height: "68%" }} />
          <i style={{ height: "54%" }} />
          <i style={{ height: "76%" }} />
        </div>
        <footer>
          <CheckCircle2 size={16} />
          <span>Built for tracking and clinician conversations, not diagnosis.</span>
        </footer>
      </div>
    </section>
  );
}

function PersonalPreview({ project, isMaximized, setIsMaximized, frameUrl }) {
  if (project.visual === "sonic") {
    return <SonicShowcase project={project} frameUrl={frameUrl} />;
  }

  if (project.visual === "vitals") {
    return <VitalsShowcase project={project} />;
  }

  if (project.mode !== "embed") {
    return (
      <section className="page-grid featured-case personal-static-case" id={`${project.slug}-preview`} aria-live="polite">
        <div className="case-copy">
          <span>Selected project</span>
          <h2>{project.title}</h2>
          <p>{project.type}</p>
          <dl>
            <div>
              <dt>
                <i />
                Status
              </dt>
              <dd>{project.cta}</dd>
            </div>
            <div>
              <dt>
                <i />
                Summary
              </dt>
              <dd>{project.summary}</dd>
            </div>
          </dl>
        </div>
        <div className="case-art" aria-hidden="true">
          <Image src={project.image} alt="" width={760} height={360} />
          <div className="case-score">
            <strong>{project.number}</strong>
          </div>
          <ul>
            {project.tags.map((tag) => (
              <li key={tag}>
                Tag <span>{tag}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`page-grid featured-case live-case personal-live-case ${isMaximized ? "is-maximized" : ""}`}
      id={`${project.slug}-preview`}
      aria-live="polite"
    >
      <header className="live-case-header">
        <div>
          <span>Selected project</span>
          <h2>{project.title}</h2>
          <p>{project.type}</p>
        </div>
        <button
          type="button"
          className="live-case-toggle"
          aria-pressed={isMaximized}
          onClick={() => setIsMaximized((current) => !current)}
        >
          {isMaximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          <span>{isMaximized ? "Minimise" : "Maximise"}</span>
        </button>
      </header>

      {frameUrl ? (
        <div className="live-frame-shell personal-frame-shell">
          <iframe
            src={frameUrl}
            title={`${project.title} live project`}
            className="live-frame"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="personal-local-note">
          <h3>{project.title} is a local project</h3>
          <p>
            This live preview stays local unless an embed URL is configured. Public visitors see the project summary
            without exposing the private app or source data.
          </p>
          {project.fallbackHref && (
            <a href={project.fallbackHref}>
              View public summary
              <ArrowRight size={17} strokeWidth={1.8} />
            </a>
          )}
        </div>
      )}
    </section>
  );
}

export function PersonalPage() {
  const [selectedSlug, setSelectedSlug] = useState(personalProjects[0]?.slug);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [isLocalHost, setIsLocalHost] = useState(false);

  useEffect(() => {
    setIsLocalHost(canUseLocalFrame());

    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;

      const project = personalProjects.find(
        (item) => item.slug === hash || item.aliases?.includes(hash)
      );
      if (project) setSelectedSlug(project.slug);
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

  const selectedProject = useMemo(
    () => personalProjects.find((project) => project.slug === selectedSlug) ?? personalProjects[0],
    [selectedSlug]
  );
  const frameUrl = getProjectFrameUrl(selectedProject, isLocalHost);

  const selectProject = (project) => {
    setSelectedSlug(project.slug);
    setIsPreviewMaximized(false);
    window.history.replaceState(null, "", `#${project.slug}`);
  };

  return (
    <section className="studio-page personal-page">
      <section className="page-grid studio-hero personal-hero">
        <h1>Personal</h1>
        <p>Projects I build for myself, from live dashboards to taste experiments and private memory.</p>
      </section>

      <section className="page-grid work-board personal-board" aria-labelledby="personal-projects-title">
        <h2 id="personal-projects-title">Personal projects</h2>
        <div className="work-card-grid personal-project-grid">
          {personalProjects.map((project, index) => (
            <PersonalProjectCard
              project={project}
              priority={index < 2}
              isSelected={project.slug === selectedProject.slug}
              onSelect={() => selectProject(project)}
              key={project.slug}
            />
          ))}
        </div>
      </section>

      <PersonalPreview
        project={selectedProject}
        isMaximized={isPreviewMaximized}
        setIsMaximized={setIsPreviewMaximized}
        frameUrl={frameUrl}
      />

      <PageFooter />
    </section>
  );
}
