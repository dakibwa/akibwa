"use client";

import Image from "next/image";
import {
  ArrowRight,
  Database,
  Disc3,
  HeartPulse,
  Headphones,
  Instagram,
  LockKeyhole,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageFooter } from "@/components/page-footer";
import { PersonalProjectArt } from "@/components/personal-project-art";
import { SonicFmDashboardPreview } from "@/components/sonic-fm-dashboard-preview";
import { VitalsDashboardPreview } from "@/components/vitals-dashboard-preview";
import { coverCollisionPosts, personalProjects } from "@/components/site-data";

function canUseLocalFrame() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getProjectFrameUrl(project, isLocalHost) {
  if (project.visual === "sonic") return "";
  if (project.embedUrl) return project.embedUrl;
  if (isLocalHost && project.localUrl) return project.localUrl;
  return "";
}

function PersonalProjectVisual({ project }) {
  return <PersonalProjectArt project={project} />;
}

function PersonalProjectCard({ project, priority, isSelected, onSelect }) {
  const isLive = project.mode === "embed" || project.mode === "preview";
  const summaryId = `${project.slug}-summary`;

  return (
    <button
      type="button"
      className={`studio-card work-card personal-project-card ${isSelected ? "is-selected" : ""}`}
      aria-pressed={isSelected}
      aria-describedby={summaryId}
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
      <span className="personal-card-summary-tooltip" id={summaryId} role="tooltip">
        {project.summary}
      </span>
      <div className="personal-card-body">
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

function DashboardShowcase({ project, frameUrl }) {
  const isVitals = project.visual === "vitals";
  const isSonic = project.visual === "sonic";
  const details = isVitals
    ? [
        [ShieldCheck, "Health dashboard", "Vitals is the health dashboard product; the public preview hides personal values and source rows."],
        [HeartPulse, "Product shape", "Source freshness, health signals, trends, and review prompts for clinician conversations."],
      ]
    : [
        [Headphones, "Listening archive", "Last.fm history feeds a dashboard of scrobbles, artists, albums, tracks, timelines, and reports."],
        [Database, "Product shape", "The surface is the real Chorus listening archive preview, drawn from the Last.fm dashboard data."],
      ];

  return (
    <section
      className={`page-grid source-dashboard-showcase ${isVitals ? "is-private" : "is-music"}`}
      id={`${project.slug}-preview`}
      aria-live="polite"
    >
      <div className="vitals-showcase-copy">
        <span>Selected project</span>
        <h2>{project.title}</h2>
        <p>{project.summary}</p>
        <dl>
          {details.map(([Icon, label, body]) => (
            <div key={label}>
              <dt>
                <Icon size={15} />
                {label}
              </dt>
              <dd>{body}</dd>
            </div>
          ))}
        </dl>
        <div className="vitals-showcase-actions">
          {!isSonic && frameUrl ? (
            <a href={frameUrl} target="_blank" rel="noreferrer">
              Open dashboard
              <ArrowRight size={17} strokeWidth={1.8} />
            </a>
          ) : project.fallbackHref ? (
            <a href={project.fallbackHref}>
              Open preview
              <ArrowRight size={17} strokeWidth={1.8} />
            </a>
          ) : (
            <span>
              {isVitals ? <LockKeyhole size={15} strokeWidth={1.7} /> : <Headphones size={15} strokeWidth={1.7} />}
              {project.dashboardStatus}
            </span>
          )}
        </div>
      </div>

      <div className="source-dashboard-art">
        {isSonic ? (
          <SonicFmDashboardPreview compact />
        ) : isVitals ? (
          <VitalsDashboardPreview compact />
        ) : frameUrl ? (
          <iframe
            src={frameUrl}
            title={`${project.title} dashboard`}
            className="source-dashboard-frame"
            loading="lazy"
          />
        ) : (
          <Image
            src={project.dashboardImage}
            alt={project.dashboardImageAlt ?? project.alt}
            width={project.dashboardImageWidth ?? 1440}
            height={project.dashboardImageHeight ?? 900}
            sizes="(max-width: 760px) 100vw, (max-width: 1060px) 100vw, 64vw"
            priority
          />
        )}
        <footer>
          <span>{project.dashboardLabel}</span>
          <em>{project.dashboardStatus}</em>
        </footer>
      </div>
    </section>
  );
}

function CoverCollisionShowcase({ project }) {
  return (
    <section
      className="page-grid cover-collision-showcase"
      id={`${project.slug}-preview`}
      aria-live="polite"
    >
      <div className="vitals-showcase-copy cover-collision-copy">
        <span>Selected project</span>
        <h2>{project.title}</h2>
        <p>{project.summary}</p>
        <dl>
          <div>
            <dt>
              <Disc3 size={15} />
              Source material
            </dt>
            <dd>Album covers are treated as source material: familiar references pulled slightly out of place.</dd>
          </div>
          <div>
            <dt>
              <Sparkles size={15} />
              Project shape
            </dt>
            <dd>A public Instagram series of cover mismatches, collage moves, and visual recombination.</dd>
          </div>
        </dl>
        <div className="vitals-showcase-actions">
          <a href={project.externalHref} target="_blank" rel="noreferrer">
            <Instagram size={15} strokeWidth={1.7} />
            Open Instagram
          </a>
        </div>
      </div>

      <div className="cover-collision-panel" aria-label="Cover Collision Instagram posts">
        <header>
          <div>
            <span>Cover Collision</span>
            <strong>Album art, recombined into a visual series.</strong>
          </div>
          <em>{coverCollisionPosts.length} posts</em>
        </header>

        <div className="cover-collision-grid" aria-label="Cover Collision posts from Instagram">
          {coverCollisionPosts.map((post) => (
            <a
              className="cover-collision-post"
              href={post.href}
              target="_blank"
              rel="noreferrer"
              key={post.href}
            >
              <Image
                src={post.image}
                alt={post.alt}
                width={180}
                height={180}
                sizes="(max-width: 760px) 44vw, (max-width: 1100px) 22vw, 210px"
              />
              <span>No. {post.number}</span>
              <strong>{post.title}</strong>
              <em>{post.date}</em>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonalPreview({ project, isMaximized, setIsMaximized, frameUrl }) {
  if (project.visual === "sonic" || project.visual === "vitals") {
    return <DashboardShowcase project={project} frameUrl={frameUrl} />;
  }

  if (project.visual === "cover-collision") {
    return <CoverCollisionShowcase project={project} />;
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
        <p>Projects that interested me to build them.</p>
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
