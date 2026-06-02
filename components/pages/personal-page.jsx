"use client";

import Image from "next/image";
import {
  ArrowRight,
  Disc3,
  Instagram,
  LockKeyhole,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageFooter } from "@/components/page-footer";
import { AkibwapediaPreview } from "@/components/akibwapedia-preview";
import { getPersonalProjectArt, PersonalProjectArt } from "@/components/personal-project-art";
import { ChorusDashboardPreview } from "@/components/chorus-dashboard-preview";
import { VitalsDashboardPreview } from "@/components/vitals-dashboard-preview";
import { coverCollisionPosts, personalProjects } from "@/components/site-data";

function canUseLocalFrame() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getProjectFrameUrl(project, isLocalHost) {
  if (project.visual === "chorus") return "";
  if (project.embedUrl) return project.embedUrl;
  if (isLocalHost && project.localUrl) return project.localUrl;
  return "";
}

function PersonalProjectVisual({ project }) {
  return <PersonalProjectArt project={project} className="personal-project-card-art" />;
}

function ProjectExpandedBanner({ project }) {
  const artwork = getPersonalProjectArt(project);

  return (
    <div className={`project-expanded-banner is-${artwork.variant}`} aria-hidden="true">
      <img src={artwork.bannerSrc} alt="" draggable="false" />
    </div>
  );
}

function PersonalProjectCard({ project, priority, isSelected, onSelect }) {
  const isLive = project.mode === "embed" || project.mode === "preview";
  const isDirectRoute = project.visual === "akibwapedia" && project.fallbackHref;
  const cardClass = `studio-card work-card personal-project-card ${isSelected ? "is-selected" : ""}`;
  const cardContent = (
    <>
      <PersonalProjectVisual project={project} priority={priority} />
      <header>
        <div>
          <h3>{project.title}</h3>
          <p>{project.type}</p>
        </div>
        {isLive ? <ArrowRight size={19} strokeWidth={1.8} /> : <LockKeyhole size={17} strokeWidth={1.7} />}
      </header>
    </>
  );

  if (isDirectRoute) {
    return (
      <a className={cardClass} href={project.fallbackHref}>
        {cardContent}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={cardClass}
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      {cardContent}
    </button>
  );
}

function DashboardShowcase({ project, immersive = false }) {
  const isVitals = project.visual === "vitals";
  const isChorus = project.visual === "chorus";

  return (
    <section
      className={`${immersive ? "" : "page-grid"} personal-full-app-showcase ${
        isVitals ? "is-vitals" : "is-chorus"
      } ${immersive ? "is-expanded" : ""}`}
      id={`${project.slug}-preview`}
      aria-label={`${project.title} app preview`}
      aria-live="polite"
    >
      {isChorus ? <ChorusDashboardPreview /> : <VitalsDashboardPreview />}
    </section>
  );
}

function getCoverCollisionGalleryLayout(postCount) {
  if (postCount <= 1) return { columns: 1, rows: 1 };
  if (postCount <= 4) return { columns: 2, rows: Math.ceil(postCount / 2) };
  if (postCount <= 9) return { columns: 3, rows: Math.ceil(postCount / 3) };
  if (postCount <= 16) return { columns: 4, rows: Math.ceil(postCount / 4) };
  if (postCount <= 25) return { columns: 5, rows: Math.ceil(postCount / 5) };

  const columns = 6;
  return { columns, rows: Math.ceil(postCount / columns) };
}

function CoverCollisionPanel({ project, galleryOnly = false }) {
  const galleryLayout = getCoverCollisionGalleryLayout(coverCollisionPosts.length);
  const fittedRows = Math.min(galleryLayout.rows, 5);
  const panelAspect = galleryLayout.columns / fittedRows;
  const galleryStyle = galleryOnly
    ? {
        "--cover-collision-columns": String(galleryLayout.columns),
        "--cover-collision-rows": String(fittedRows),
        "--cover-collision-panel-width": `min(100%, ${galleryLayout.columns * 290}px, calc((100dvh - 156px) * ${panelAspect.toFixed(4)}))`,
      }
    : undefined;

  return (
    <div
      className={`cover-collision-panel ${galleryOnly ? "is-gallery-only" : ""}`}
      aria-label={`${project.title} Instagram posts`}
      data-gallery-count={galleryOnly ? coverCollisionPosts.length : undefined}
      data-gallery-scrollable={galleryOnly && galleryLayout.rows > fittedRows ? "true" : undefined}
      style={galleryStyle}
    >
      {!galleryOnly && (
        <header>
          <div>
            <span>{project.title}</span>
            <strong>Album art, recombined into a visual series.</strong>
          </div>
          <em>{coverCollisionPosts.length} posts</em>
        </header>
      )}

      <div className="cover-collision-grid" aria-label={`${project.title} posts from Instagram`}>
        {coverCollisionPosts.map((post, index) => (
          <a
            className="cover-collision-post"
            href={post.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${post.title} on Instagram`}
            key={post.href}
          >
            <Image
              src={post.image}
              alt={post.alt}
              width={180}
              height={180}
              priority={galleryOnly && index < galleryLayout.columns}
              sizes={
                galleryOnly
                  ? `(max-width: 760px) ${Math.ceil(100 / Math.min(galleryLayout.columns, 3))}vw, ${Math.ceil(100 / galleryLayout.columns)}vw`
                  : "(max-width: 760px) 44vw, (max-width: 1100px) 22vw, 210px"
              }
            />
            {galleryOnly ? (
              <strong className="cover-collision-post-caption">{post.title}</strong>
            ) : (
              <>
                <span>No. {post.number}</span>
                <strong>{post.title}</strong>
                <em>{post.date}</em>
              </>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function CoverCollisionShowcase({ project, immersive = false }) {
  return (
    <section
      className={`${immersive ? "" : "page-grid"} cover-collision-showcase ${immersive ? "is-expanded" : ""}`}
      id={`${project.slug}-preview`}
      aria-live="polite"
    >
      {!immersive && (
        <div className="vitals-showcase-copy cover-collision-copy">
          <span>Project</span>
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
      )}

      <CoverCollisionPanel project={project} galleryOnly={immersive} />
    </section>
  );
}

function AkibwapediaShowcase({ project, immersive = false }) {
  return (
    <section
      className={`${immersive ? "" : "page-grid"} akibwapedia-project-showcase ${
        immersive ? "is-expanded" : ""
      }`}
      id={`${project.slug}-preview`}
      aria-live="polite"
    >
      {!immersive && (
        <div className="vitals-showcase-copy akibwapedia-project-copy">
          <span>Project</span>
          <h2>{project.title}</h2>
          <p>{project.summary}</p>
          <div className="vitals-showcase-actions">
            <a href={project.fallbackHref}>
              Open Akibwapedia
              <ArrowRight size={16} strokeWidth={1.8} />
            </a>
          </div>
        </div>
      )}
      <AkibwapediaPreview compact={!immersive} />
    </section>
  );
}

function StaticProjectSurface({ project }) {
  const href = project.externalHref ?? project.fallbackHref;

  return (
    <section className="project-static-surface" id={`${project.slug}-preview`} aria-live="polite">
      <div className="project-static-copy">
        <span>{project.number}</span>
        <h2>{project.title}</h2>
        <p>{project.summary}</p>
        <div className="project-static-tags" aria-label={`${project.title} tags`}>
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {href ? (
          <a
            href={href}
            target={project.externalHref ? "_blank" : undefined}
            rel={project.externalHref ? "noreferrer" : undefined}
          >
            {project.cta}
            <ArrowRight size={17} strokeWidth={1.8} />
          </a>
        ) : (
          <span className="project-static-private">
            <LockKeyhole size={16} strokeWidth={1.7} />
            {project.cta}
          </span>
        )}
      </div>
      <div className="project-static-art">
        <PersonalProjectArt project={project} className="project-static-artwork" />
      </div>
    </section>
  );
}

function ProjectExpandedContent({ project, frameUrl }) {
  if (project.visual === "chorus" || project.visual === "vitals") {
    return <DashboardShowcase project={project} frameUrl={frameUrl} immersive />;
  }

  if (project.visual === "cover-collision") {
    return <CoverCollisionShowcase project={project} immersive />;
  }

  if (project.visual === "akibwapedia") {
    return <AkibwapediaShowcase project={project} immersive />;
  }

  if (project.mode !== "embed") {
    return <StaticProjectSurface project={project} />;
  }

  return (
    <section className="project-expanded-frame" id={`${project.slug}-preview`} aria-live="polite">
      {frameUrl ? (
        <div className="project-expanded-frame-shell">
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

function ProjectExpandedOverlay({ project, frameUrl, onClose }) {
  return (
    <div
      className={`project-expanded-layer is-${project.visual ?? "static"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${project.slug}-expanded-title`}
    >
      <div className="project-expanded-backdrop" onClick={onClose} aria-hidden="true" />
      <article className="project-expanded-shell">
        <header className="project-expanded-toolbar">
          <ProjectExpandedBanner project={project} />
          <h2 id={`${project.slug}-expanded-title`} className="project-expanded-accessible-title">
            {project.title}
          </h2>
          <button
            type="button"
            className="project-expanded-close"
            aria-label={`Close ${project.title}`}
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.9} />
          </button>
        </header>
        <div className="project-expanded-body">
          <ProjectExpandedContent project={project} frameUrl={frameUrl} />
        </div>
      </article>
    </div>
  );
}

export function PersonalPage() {
  const [expandedSlug, setExpandedSlug] = useState(null);
  const [isLocalHost, setIsLocalHost] = useState(false);

  useEffect(() => {
    setIsLocalHost(canUseLocalFrame());

    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) {
        setExpandedSlug(null);
        return;
      }

      const project = personalProjects.find(
        (item) => item.slug === hash || item.aliases?.includes(hash)
      );
      if (project) {
        setExpandedSlug(project.slug);
      } else {
        setExpandedSlug(null);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const expandedProject = useMemo(
    () => personalProjects.find((project) => project.slug === expandedSlug) ?? null,
    [expandedSlug]
  );

  const closeExpandedProject = useCallback(() => {
    setExpandedSlug(null);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, []);

  useEffect(() => {
    if (!expandedProject) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        closeExpandedProject();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeExpandedProject, expandedProject]);

  const selectProject = (project) => {
    setExpandedSlug(project.slug);
    window.history.replaceState(null, "", `#${project.slug}`);
  };
  const frameUrl = expandedProject ? getProjectFrameUrl(expandedProject, isLocalHost) : "";

  return (
    <section className="studio-page personal-page">
      <section className="page-grid studio-hero personal-hero">
        <h1>Personal</h1>
        <p>Projects that interested me to build them.</p>
      </section>

      <section className="page-grid work-board personal-board" aria-label="Personal projects">
        <div className="work-card-grid personal-project-grid">
          {personalProjects.map((project, index) => (
            <PersonalProjectCard
              project={project}
              priority={index < 2}
              isSelected={project.slug === expandedProject?.slug}
              onSelect={() => selectProject(project)}
              key={project.slug}
            />
          ))}
        </div>
      </section>

      {expandedProject && (
        <ProjectExpandedOverlay project={expandedProject} frameUrl={frameUrl} onClose={closeExpandedProject} />
      )}

      <PageFooter />
    </section>
  );
}
