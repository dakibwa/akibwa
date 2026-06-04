"use client";

import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  ChartNoAxesCombined,
  Database,
  Disc3,
  FileLock2,
  Flag,
  HeartPulse,
  Instagram,
  LockKeyhole,
  Pickaxe,
  Route,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageFooter } from "@/components/page-footer";
import { getPersonalProjectArt, PersonalProjectArt } from "@/components/personal-project-art";
import { ChorusDashboardPreview } from "@/components/chorus-dashboard-preview";
import { VitalsDashboardPreview } from "@/components/vitals-dashboard-preview";
import { coverCollisionPosts, personalProjects } from "@/components/site-data";

const remoteCoverCollisionDataUrl = (
  process.env.NEXT_PUBLIC_COVER_COLLISION_DATA_URL ||
  "https://akibwa-cover-collision-refresh.dakibwa.workers.dev/cover-collision"
).trim();

const knowledgeSources = [
  { name: "Gmail", status: "backfill next", logo: "gmail" },
  { name: "Drive", status: "mapped", logo: "drive" },
  { name: "Calendar", status: "history pass", logo: "calendar" },
  { name: "Finance", status: "aggregate-only", logo: "finance" },
  { name: "Health", status: "local only", logo: "health" },
  { name: "Projects", status: "active", logo: "projects" }
];

const knowledgeRoutes = [
  { label: "Today's priorities", Icon: CalendarCheck, tone: "blue" },
  { label: "Evidence check", Icon: SearchCheck, tone: "teal" },
  { label: "Project obligations", Icon: BriefcaseBusiness, tone: "orange" },
  { label: "Health context", Icon: HeartPulse, tone: "rose" },
  { label: "Finance synthesis", Icon: Wallet, tone: "green" },
  { label: "Source mining", Icon: Pickaxe, tone: "slate" }
];

const knowledgeGuardrails = [
  { label: "Raw records stay local", Icon: FileLock2, tone: "slate" },
  { label: "Claims need source pointers", Icon: BadgeCheck, tone: "blue" },
  { label: "Health is for clinician conversations", Icon: Stethoscope, tone: "rose" },
  { label: "Finance stays aggregate-only", Icon: ChartNoAxesCombined, tone: "green" },
  { label: "Generated claims are leads", Icon: Flag, tone: "orange" }
];

const iconToneStyles = {
  blue: {
    "--icon-accent": "#2f88ff",
    "--icon-bg": "rgba(47, 136, 255, 0.09)",
    "--icon-border": "rgba(47, 136, 255, 0.18)"
  },
  teal: {
    "--icon-accent": "#2c8068",
    "--icon-bg": "rgba(44, 128, 104, 0.1)",
    "--icon-border": "rgba(44, 128, 104, 0.18)"
  },
  orange: {
    "--icon-accent": "#ff6f1a",
    "--icon-bg": "rgba(255, 111, 26, 0.1)",
    "--icon-border": "rgba(255, 111, 26, 0.18)"
  },
  rose: {
    "--icon-accent": "#e2556b",
    "--icon-bg": "rgba(226, 85, 107, 0.1)",
    "--icon-border": "rgba(226, 85, 107, 0.18)"
  },
  green: {
    "--icon-accent": "#218a4f",
    "--icon-bg": "rgba(33, 138, 79, 0.1)",
    "--icon-border": "rgba(33, 138, 79, 0.18)"
  },
  slate: {
    "--icon-accent": "#53606a",
    "--icon-bg": "rgba(83, 96, 106, 0.1)",
    "--icon-border": "rgba(83, 96, 106, 0.16)"
  }
};

function getIconToneStyle(tone, index) {
  return {
    ...(iconToneStyles[tone] ?? iconToneStyles.slate),
    "--row-delay": `${index * 65}ms`
  };
}

function SourceLogo({ type }) {
  if (type === "gmail") {
    return (
      <svg className="knowledge-source-logo is-gmail" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="4" y="7" width="24" height="18" rx="4" fill="#fff" />
        <path d="M7.5 11.2v11.1" stroke="#4285f4" strokeWidth="3" strokeLinecap="round" />
        <path d="M24.5 11.2v11.1" stroke="#34a853" strokeWidth="3" strokeLinecap="round" />
        <path d="M8 10.7 16 16.9l8-6.2" fill="none" stroke="#ea4335" strokeWidth="3.1" strokeLinejoin="round" />
        <path d="M6.4 12.8 16 20.1l9.6-7.3" fill="none" stroke="#fbbc04" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "drive") {
    return (
      <svg className="knowledge-source-logo is-drive" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M12.2 5.5h7.6l8.2 14.2h-7.7z" fill="#0f9d58" />
        <path d="M12.2 5.5 4 19.7l3.9 6.8 8.2-14.2z" fill="#f4b400" />
        <path d="M7.9 26.5h16.2l3.9-6.8H11.8z" fill="#4285f4" />
        <path d="M12.2 5.5 16.1 12.3 11.8 19.7H4z" fill="#ffd45c" opacity="0.65" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg className="knowledge-source-logo is-calendar" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="5" y="5" width="22" height="22" rx="5" fill="#fff" />
        <path d="M5 11h22V10a5 5 0 0 0-5-5H10a5 5 0 0 0-5 5z" fill="#4285f4" />
        <path d="M9 14h14" stroke="#e8eaed" strokeWidth="1.5" />
        <text x="16" y="23" textAnchor="middle" fontSize="9" fontWeight="700" fill="#3c4043">31</text>
      </svg>
    );
  }

  if (type === "finance") {
    return (
      <svg className="knowledge-source-logo is-finance" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="5" y="7" width="22" height="18" rx="5" fill="#132026" />
        <path d="M9 12h14" stroke="#8fd6c0" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 18h4m4 0h4" stroke="#ff8b4a" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "health") {
    return (
      <svg className="knowledge-source-logo is-health" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="5" y="5" width="22" height="22" rx="6" fill="#fff" />
        <path
          d="M16 24.2s-7-4.5-7-9.6c0-2.7 1.8-4.6 4.2-4.6 1.4 0 2.4.7 2.8 1.6.4-.9 1.4-1.6 2.8-1.6 2.4 0 4.2 1.9 4.2 4.6 0 5.1-7 9.6-7 9.6z"
          fill="#e2556b"
        />
      </svg>
    );
  }

  return (
    <svg className="knowledge-source-logo is-projects" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="5" y="7" width="22" height="18" rx="5" fill="#fff" />
      <path d="M10 13h4l2 2h6" fill="none" stroke="#2f88ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19h12" stroke="#59616b" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function canUseLocalFrame() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getProjectFrameUrl(project, isLocalHost) {
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

function isCoverCollisionData(data) {
  return data?.profileUrl && Array.isArray(data?.posts);
}

function useCoverCollisionData(dataUrl = remoteCoverCollisionDataUrl) {
  const [runtimeData, setRuntimeData] = useState({
    profileUrl: "https://www.instagram.com/dakibwa/",
    posts: coverCollisionPosts
  });

  useEffect(() => {
    const url = String(dataUrl || "").trim();
    if (!url) return undefined;

    let cancelled = false;

    fetch(url, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && isCoverCollisionData(data)) {
          setRuntimeData({
            profileUrl: data.profileUrl,
            posts: data.posts.length ? data.posts : coverCollisionPosts
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  return runtimeData;
}

function CoverCollisionImage({ post, priority, sizes }) {
  if (/^https?:\/\//.test(post.image || "")) {
    return <img src={post.image} alt={post.alt} loading={priority ? "eager" : "lazy"} />;
  }

  return (
    <Image
      src={post.image}
      alt={post.alt}
      width={180}
      height={180}
      priority={priority}
      sizes={sizes}
    />
  );
}

function CoverCollisionPanel({ project, posts, galleryOnly = false }) {
  const galleryLayout = getCoverCollisionGalleryLayout(posts.length);
  const fittedRows = Math.min(galleryLayout.rows, 4);
  const panelAspect = galleryLayout.columns / fittedRows;
  const verticalReserve = 174 + fittedRows * 32 + Math.max(0, fittedRows - 1) * 22;
  const galleryStyle = galleryOnly
    ? {
        "--cover-collision-columns": String(galleryLayout.columns),
        "--cover-collision-rows": String(fittedRows),
        "--cover-collision-panel-width": `min(100%, ${galleryLayout.columns * 240}px, max(320px, calc((100dvh - ${verticalReserve}px) * ${panelAspect.toFixed(4)})))`,
      }
    : undefined;

  return (
    <div
      className={`cover-collision-panel ${galleryOnly ? "is-gallery-only" : ""}`}
      aria-label={`${project.title} Instagram posts`}
      data-gallery-count={galleryOnly ? posts.length : undefined}
      data-gallery-scrollable={galleryOnly && galleryLayout.rows > fittedRows ? "true" : undefined}
      style={galleryStyle}
    >
      {!galleryOnly && (
        <header>
          <div>
            <span>{project.title}</span>
            <strong>Album art, recombined into a visual series.</strong>
          </div>
          <em>{posts.length} posts</em>
        </header>
      )}

      <div className="cover-collision-grid" aria-label={`${project.title} posts from Instagram`}>
        {posts.map((post, index) => (
          <a
            className="cover-collision-post"
            href={post.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${post.title} on Instagram`}
            key={post.href}
          >
            <span className="cover-collision-post-image">
              <CoverCollisionImage
                post={post}
                priority={galleryOnly && index < galleryLayout.columns}
                sizes={
                  galleryOnly
                    ? `(max-width: 760px) ${Math.ceil(100 / Math.min(galleryLayout.columns, 3))}vw, ${Math.ceil(100 / galleryLayout.columns)}vw`
                    : "(max-width: 760px) 44vw, (max-width: 1100px) 22vw, 210px"
                }
              />
            </span>
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
  const { posts, profileUrl } = useCoverCollisionData();

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
            <a href={profileUrl || project.externalHref} target="_blank" rel="noreferrer">
              <Instagram size={15} strokeWidth={1.7} />
              Open Instagram
            </a>
          </div>
        </div>
      )}

      <CoverCollisionPanel project={project} posts={posts} galleryOnly={immersive} />
    </section>
  );
}

function KnowledgeBaseShowcase({ project }) {
  const artwork = getPersonalProjectArt(project);

  return (
    <section className="knowledge-system-showcase" id={`${project.slug}-preview`} aria-live="polite">
      <div className="knowledge-system-hero">
        <div className="knowledge-system-copy">
          <span>{project.number}</span>
          <h2>{project.title}</h2>
          <p>
            A local, source-backed context system that helps Codex use personal records without exposing the records
            themselves.
          </p>
          <div className="knowledge-system-tags" aria-label={`${project.title} tags`}>
            {project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>

        <figure className="knowledge-system-art">
          <img src={artwork.src} alt="" draggable="false" />
          <figcaption>
            <span>Local memory</span>
            <strong>Public-safe project view</strong>
          </figcaption>
        </figure>
      </div>

      <div className="knowledge-system-console" aria-label="Private knowledge system preview">
        <section className="knowledge-console-panel is-source-map">
          <header>
            <Database size={18} strokeWidth={1.7} />
            <h3>Source map</h3>
          </header>
          <div className="knowledge-source-list">
            {knowledgeSources.map(({ name, status, logo }, index) => (
              <div key={name} className="knowledge-source-row" style={{ "--row-delay": `${index * 65}ms` }}>
                <SourceLogo type={logo} />
                <strong>{name}</strong>
                <span>{status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="knowledge-console-panel is-routes">
          <header>
            <Route size={18} strokeWidth={1.7} />
            <h3>Codex retrieval routes</h3>
          </header>
          <ol>
            {knowledgeRoutes.map(({ label, Icon, tone }, index) => (
              <li key={label} className="knowledge-route-row" style={getIconToneStyle(tone, index)}>
                <span className="knowledge-row-icon is-route" aria-hidden="true">
                  <Icon size={15} strokeWidth={1.8} />
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="knowledge-console-panel is-guardrails">
          <header>
            <ShieldCheck size={18} strokeWidth={1.7} />
            <h3>Guardrails</h3>
          </header>
          <ul>
            {knowledgeGuardrails.map(({ label, Icon, tone }, index) => (
              <li key={label} className="knowledge-rule-row" style={getIconToneStyle(tone, index)}>
                <span className="knowledge-row-icon is-rule" aria-hidden="true">
                  <Icon size={15} strokeWidth={1.8} />
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
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
  if ((project.visual === "chorus" || project.visual === "vitals") && frameUrl) {
    return <LiveProjectFrame project={project} frameUrl={frameUrl} />;
  }

  if (project.visual === "chorus" || project.visual === "vitals") {
    return <DashboardShowcase project={project} frameUrl={frameUrl} immersive />;
  }

  if (project.visual === "cover-collision") {
    return <CoverCollisionShowcase project={project} immersive />;
  }

  if (project.slug === "personal-knowledge-base") {
    return <KnowledgeBaseShowcase project={project} />;
  }

  if (project.mode !== "embed") {
    return <StaticProjectSurface project={project} />;
  }

  return <LiveProjectFrame project={project} frameUrl={frameUrl} />;
}

function LiveProjectFrame({ project, frameUrl }) {
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
