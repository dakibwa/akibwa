"use client";

import Image from "next/image";
import {
  ArrowRight,
  Instagram,
  LockKeyhole,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { PageFooter } from "@/components/page-footer";
import { fetchSessionJson, readSessionJson } from "@/components/remote-data-cache";
import { getPersonalProjectArt, PersonalProjectArt } from "@/components/personal-project-art";
import {
  chorusAppUrl,
  coverCollisionDataUrl,
  coverCollisionPosts,
  isPersonalProjectLaunchable,
  personalProjects
} from "@/components/site-data";
import fallbackChorusData from "@/data/chorus-data.json";

// The dashboard mock only ever appears inside the overlay, so it loads when a
// card is opened rather than with the index.
const ChorusDashboardPreview = dynamic(
  () => import("@/components/chorus-dashboard-preview").then((m) => m.ChorusDashboardPreview),
  { ssr: false }
);

const chorusSummaryDataUrl = (
  process.env.NEXT_PUBLIC_CHORUS_DATA_URL || "https://akibwa-chorus-refresh.dakibwa.workers.dev/chorus"
).trim();

function formatScrobbleCount(value) {
  const numeric = Number(value);
  return new Intl.NumberFormat("en-GB").format(Number.isFinite(numeric) ? numeric : 0);
}

function useChorusScrobbleTotal(enabled) {
  const [total, setTotal] = useState(fallbackChorusData?.summary?.totalScrobbles ?? null);

  useEffect(() => {
    if (!enabled || !chorusSummaryDataUrl) return undefined;

    let cancelled = false;
    const apply = (data) => {
      const numeric = Number(data?.summary?.totalScrobbles);
      if (!cancelled && Number.isFinite(numeric) && numeric > 0) setTotal(numeric);
    };

    apply(readSessionJson(chorusSummaryDataUrl));
    fetchSessionJson(chorusSummaryDataUrl).then(apply).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return total;
}

const PROJECT_OVERLAY_EXIT_MS = 180;
const PROJECT_OVERLAY_CONTENT_DELAY_MS = 90;
const PROJECT_OVERLAY_RESIZE_MS = 220;

function canUseLocalFrame() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getProjectFrameUrl(project, isLocalHost) {
  if (!isPersonalProjectLaunchable(project)) return "";
  if (isLocalHost && project.localUrl && project.useLocalFrame !== false) return project.localUrl;
  if (project.embedUrl) return project.embedUrl;
  if (project.visual === "chorus") return chorusAppUrl;
  return "";
}

function findPersonalProjectBySlug(slug) {
  if (!slug) return null;
  return personalProjects.find((project) => project.slug === slug || project.aliases?.includes(slug)) ?? null;
}

function ProjectExpandedBanner({ project }) {
  const artwork = getPersonalProjectArt(project);
  const style = getProjectArtVariables(artwork);

  return (
    <div className={`project-expanded-banner is-${artwork.variant}`} style={style} aria-hidden="true">
      <img src={artwork.bannerSrc} alt="" draggable="false" />
    </div>
  );
}

const ACCENT_BY_SLUG = {
  chorus: "#ff6f1a",
  "cover-collision": "#e2556b",
  "one-bag": "#2f7d57",
  meditator: "#3a5a45",
  "portuguese-with-ines": "#1f4f9c",
  fellrun: "#2f7fa8",
  fellblade: "#6b7a3a"
};

function accentForSlug(slug) {
  return ACCENT_BY_SLUG[slug] ?? "#2f88ff";
}

const STATUS_BY_SLUG = {
  chorus: "live",
  "cover-collision": "live",
  "one-bag": "dev",
  meditator: "live",
  "portuguese-with-ines": "live",
  fellrun: "dev",
  fellblade: "dev"
};

const STATUS_LABELS = { live: "Live", dev: "Dev" };

function statusForSlug(slug) {
  return STATUS_BY_SLUG[slug] ?? "dev";
}

function getProjectArtVariables(artwork, extras = {}) {
  return {
    "--project-detail-banner-position": artwork.detailBannerPosition,
    "--project-selector-banner-position": artwork.selectorBannerPosition,
    "--project-selector-subject-position": artwork.selectorSubjectPosition,
    "--project-expanded-banner-position": artwork.expandedBannerPosition,
    ...extras
  };
}

function ProjectCard({ project, isArrived, onOpen }) {
  const status = statusForSlug(project.slug);
  const artwork = getPersonalProjectArt(project);
  const launchable = isPersonalProjectLaunchable(project);

  return (
    <article
      className={`project-card${isArrived ? " is-arrived" : ""}`}
      id={project.slug}
      style={{ "--area-accent": accentForSlug(project.slug) }}
      aria-labelledby={`${project.slug}-card-title`}
    >
      <div className={`project-card-art is-${artwork.variant}`}>
        <img
          src={artwork.bannerSrc ?? artwork.src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <span className={`personal-story-status is-${status} project-card-status`}>
          <span className="personal-story-status-dot" aria-hidden="true" />
          {project.statusLabel ?? STATUS_LABELS[status]}
        </span>
      </div>
      <div className="project-card-body">
        <div className="project-card-head">
          <h2 id={`${project.slug}-card-title`} className="project-card-title">
            {launchable ? (
              /* The button carries an ::after covering the card, so the whole
                 tile is the target while the heading stays a real heading. */
              <button type="button" className="project-card-open" onClick={onOpen}>
                {project.title}
              </button>
            ) : (
              project.title
            )}
          </h2>
          {launchable ? (
            <span className="project-card-cue" aria-hidden="true">
              <ArrowRight size={16} strokeWidth={2} />
            </span>
          ) : null}
        </div>
        <p className="project-card-summary">{project.summary}</p>
      </div>
    </article>
  );
}

function DashboardShowcase({ project, immersive = false }) {
  return (
    <section
      className={`${immersive ? "" : "page-grid"} personal-full-app-showcase is-chorus ${
        immersive ? "is-expanded" : ""
      }`}
      id={`${project.slug}-preview`}
      aria-label={`${project.title} app preview`}
      aria-live="polite"
    >
      <ChorusDashboardPreview />
    </section>
  );
}

function getCoverCollisionGalleryLayout(postCount) {
  if (postCount <= 1) return { columns: 1, rows: 1 };
  if (postCount <= 4) return { columns: 2, rows: Math.ceil(postCount / 2) };
  if (postCount <= 12) return { columns: 3, rows: Math.ceil(postCount / 3) };
  if (postCount <= 20) return { columns: 4, rows: Math.ceil(postCount / 4) };
  if (postCount <= 30) return { columns: 5, rows: Math.ceil(postCount / 5) };

  const columns = 6;
  return { columns, rows: Math.ceil(postCount / columns) };
}

function isCoverCollisionData(data) {
  return data?.profileUrl && Array.isArray(data?.posts);
}

function latestCoverCollisionDate(data) {
  return data?.posts?.[0]?.date || data?.snapshotDate || "";
}

function formatCoverCollisionDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function mergeCoverCollisionSeedImages(posts, fallbackPosts) {
  const fallbackByHref = new Map((fallbackPosts || []).map((post) => [post.href, post]));
  const fallbackByNumber = new Map((fallbackPosts || []).map((post) => [post.number, post]));

  return posts.map((post) => {
    const fallback = fallbackByHref.get(post.href) || fallbackByNumber.get(post.number);
    if (!fallback?.image) return post;

    return {
      ...post,
      image: fallback.image,
      alt: fallback.alt || post.alt
    };
  });
}

function preferredCoverCollisionData(remoteData, fallbackData) {
  if (!isCoverCollisionData(remoteData)) return fallbackData;

  const remoteDate = latestCoverCollisionDate(remoteData);
  const fallbackDate = latestCoverCollisionDate(fallbackData);
  if (remoteDate && fallbackDate && remoteDate < fallbackDate) return fallbackData;

  const remotePosts = remoteData.posts.length
    ? mergeCoverCollisionSeedImages(remoteData.posts, fallbackData.posts)
    : fallbackData.posts;
  if (remoteDate === fallbackDate && remotePosts.length < fallbackData.posts.length) return fallbackData;

  return {
    profileUrl: remoteData.profileUrl || fallbackData.profileUrl,
    posts: remotePosts
  };
}

function useCoverCollisionData(dataUrl = coverCollisionDataUrl) {
  const fallbackData = {
    profileUrl: "https://www.instagram.com/dakibwa/",
    posts: coverCollisionPosts
  };
  const [runtimeData, setRuntimeData] = useState(fallbackData);

  useEffect(() => {
    const url = String(dataUrl || "").trim();
    if (!url) return undefined;

    let cancelled = false;

    const applyCoverCollisionData = (data) => {
      if (!cancelled && isCoverCollisionData(data)) {
        setRuntimeData(preferredCoverCollisionData(data, fallbackData));
      }
    };

    applyCoverCollisionData(readSessionJson(url));
    fetchSessionJson(url).then(applyCoverCollisionData).catch(() => {});

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
  const fittedRows = Math.min(galleryLayout.rows, 3);
  const galleryStyle = galleryOnly
    ? {
        "--cover-collision-columns": String(galleryLayout.columns),
        "--cover-collision-rows": String(fittedRows),
        "--cover-collision-panel-width": `min(100%, ${galleryLayout.columns * 244}px)`,
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
            <strong>The covers don&apos;t match. That&apos;s the point.</strong>
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
                    ? `(max-width: 360px) 100vw, (max-width: 760px) 50vw, ${Math.ceil(100 / galleryLayout.columns)}vw`
                    : "(max-width: 760px) 44vw, (max-width: 1100px) 22vw, 210px"
                }
              />
            </span>
            {galleryOnly ? (
              <span className="cover-collision-post-caption" aria-hidden="true">
                <span>
                  <span>No. {post.number}</span>
                  <time dateTime={post.date}>{formatCoverCollisionDate(post.date)}</time>
                </span>
                <strong>{post.title}</strong>
              </span>
            ) : (
              <>
                <span>No. {post.number}</span>
                <strong>{post.title}</strong>
                <em>{formatCoverCollisionDate(post.date)}</em>
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
        <div className="project-showcase-copy cover-collision-copy">
          <span>Project</span>
          <h2>{project.title}</h2>
          <p>{project.summary} I make a new one whenever a pair suggests itself.</p>
          <div className="project-showcase-actions">
            <a href={profileUrl || project.externalHref} target="_blank" rel="noreferrer">
              <Instagram size={15} strokeWidth={1.7} />
              See them on Instagram
            </a>
          </div>
        </div>
      )}

      {immersive ? (
        <div className="cover-collision-exhibition">
          <aside className="cover-collision-exhibition-note">
            <span>Album art series</span>
            <h3>Two covers, spliced into one.</h3>
            <p>A new one whenever a pair suggests itself.</p>
            <div>
              <strong>{posts.length}</strong>
              <span>so far</span>
            </div>
            <a href={profileUrl || project.externalHref} target="_blank" rel="noreferrer">
              <Instagram size={15} strokeWidth={1.7} />
              See them on Instagram
            </a>
          </aside>
          <CoverCollisionPanel project={project} posts={posts} galleryOnly />
        </div>
      ) : (
        <CoverCollisionPanel project={project} posts={posts} />
      )}
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

function ProjectExpandedContent({ project, frameUrl, frameNonce = 0 }) {
  if (project.visual === "chorus" && frameUrl) {
    return <LiveProjectFrame project={project} frameUrl={frameUrl} frameNonce={frameNonce} />;
  }

  if (project.visual === "chorus") {
    return <DashboardShowcase project={project} immersive />;
  }

  if (project.visual === "cover-collision") {
    return <CoverCollisionShowcase project={project} immersive />;
  }

  if (project.mode !== "embed") {
    return <StaticProjectSurface project={project} />;
  }

  return <LiveProjectFrame project={project} frameUrl={frameUrl} frameNonce={frameNonce} />;
}

function LiveProjectFrame({ project, frameUrl, frameNonce = 0 }) {
  const [isFrameLoaded, setIsFrameLoaded] = useState(false);

  useEffect(() => {
    setIsFrameLoaded(false);
  }, [frameUrl, frameNonce]);

  return (
    <section className="project-expanded-frame" id={`${project.slug}-preview`} aria-live="polite">
      {frameUrl ? (
        <div className={`project-expanded-frame-shell ${isFrameLoaded ? "is-loaded" : "is-loading"}`}>
          <div className="project-frame-loading" aria-hidden="true">
            <strong>{project.title}</strong>
            <span>Loading the live app…</span>
          </div>
          <iframe
            key={frameNonce}
            src={frameUrl}
            title={`${project.title} live project`}
            className="live-frame"
            allow="clipboard-read; clipboard-write; screen-wake-lock"
            loading="eager"
            onLoad={() => setIsFrameLoaded(true)}
          />
        </div>
      ) : (
        <div className="personal-local-note">
          <h3>{project.title} runs on my machine</h3>
          <p>
            There&apos;s no public URL to embed yet, so this stays a summary — the app and its data stay off the
            open web.
          </p>
          {project.fallbackHref && (
            <a href={project.fallbackHref}>
              Open on Akibwa
              <ArrowRight size={17} strokeWidth={1.8} />
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function ProjectExpandedOverlay({ project, frameUrl, isMaximized, isVisible, onClose, onToggleMaximized }) {
  const [contentReady, setContentReady] = useState(false);
  const [frameNonce, setFrameNonce] = useState(0);
  const isChorusSurface = project.visual === "chorus";
  const scrobbleTotal = useChorusScrobbleTotal(isChorusSurface);
  const shellRef = useRef(null);
  const shellResizeAnimationRef = useRef(null);
  const shellResizeStartRef = useRef(null);

  useEffect(() => {
    if (!isVisible) return undefined;

    setContentReady(false);
    let timerId;
    const frameId = window.requestAnimationFrame(() => {
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      timerId = window.setTimeout(
        () => setContentReady(true),
        prefersReducedMotion ? 0 : PROJECT_OVERLAY_CONTENT_DELAY_MS
      );
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, [isVisible, project.slug]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const startRect = shellResizeStartRef.current;
    shellResizeStartRef.current = null;

    if (!shell || !startRect || !isVisible) return undefined;

    const endRect = shell.getBoundingClientRect();
    const deltaX = startRect.left + startRect.width / 2 - (endRect.left + endRect.width / 2);
    const deltaY = startRect.top + startRect.height / 2 - (endRect.top + endRect.height / 2);
    const scaleX = startRect.width / endRect.width;
    const scaleY = startRect.height / endRect.height;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const hasMeaningfulChange =
      Math.abs(deltaX) > 1 ||
      Math.abs(deltaY) > 1 ||
      Math.abs(1 - scaleX) > 0.01 ||
      Math.abs(1 - scaleY) > 0.01;

    shellResizeAnimationRef.current?.();
    shellResizeAnimationRef.current = null;

    if (prefersReducedMotion || !hasMeaningfulChange) return undefined;

    const previousTransition = shell.style.transition;
    const previousTransform = shell.style.transform;
    const previousBorderRadius = shell.style.borderRadius;
    const previousWillChange = shell.style.willChange;
    let frameId;
    let timerId;

    const cleanup = () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timerId);
      shell.style.transition = previousTransition;
      shell.style.transform = previousTransform;
      shell.style.borderRadius = previousBorderRadius;
      shell.style.willChange = previousWillChange;
      if (shellResizeAnimationRef.current === cleanup) {
        shellResizeAnimationRef.current = null;
      }
    };

    shellResizeAnimationRef.current = cleanup;
    shell.style.transition = "none";
    shell.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`;
    shell.style.borderRadius = isMaximized ? "12px" : "10px";
    shell.style.willChange = "transform, border-radius";
    shell.getBoundingClientRect();

    frameId = window.requestAnimationFrame(() => {
      shell.style.transition =
        `transform ${PROJECT_OVERLAY_RESIZE_MS}ms cubic-bezier(0.22, 1, 0.36, 1), border-radius ${PROJECT_OVERLAY_RESIZE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      shell.style.transform = "translate3d(0, 0, 0) scale(1, 1)";
      shell.style.borderRadius = isMaximized ? "10px" : "12px";
      timerId = window.setTimeout(cleanup, PROJECT_OVERLAY_RESIZE_MS + 40);
    });

    return () => {
      cleanup();
    };
  }, [isMaximized, isVisible]);

  useEffect(() => {
    return () => {
      shellResizeAnimationRef.current?.();
    };
  }, []);

  const postToChorus = useCallback(
    (message) => {
      const frame = shellRef.current?.querySelector("iframe.live-frame");
      if (!frame?.contentWindow || !frameUrl) return false;
      try {
        frame.contentWindow.postMessage(message, new URL(frameUrl, window.location.href).origin);
        return true;
      } catch {
        return false;
      }
    },
    [frameUrl]
  );

  const toggleMaximized = useCallback(() => {
    if (shellRef.current) {
      shellResizeStartRef.current = shellRef.current.getBoundingClientRect();
      shellResizeAnimationRef.current?.();
      shellResizeAnimationRef.current = null;
    }
    onToggleMaximized();
  }, [onToggleMaximized]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`project-expanded-layer is-${project.visual ?? "static"} ${isVisible ? "is-open" : "is-closing"} ${
        isMaximized ? "is-maximized" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${project.slug}-expanded-title`}
    >
      <div className="project-expanded-backdrop" onClick={onClose} aria-hidden="true" />
      <article className="project-expanded-shell" ref={shellRef}>
        <header className="project-expanded-toolbar">
          <ProjectExpandedBanner project={project} />
          <h2 id={`${project.slug}-expanded-title`} className="project-expanded-accessible-title">
            {project.title}
          </h2>
          <div className="project-expanded-banner-meta" aria-hidden="true">
            <strong>{project.title}</strong>
            {(() => {
              const sublabel = [project.type, project.dashboardLabel, project.dashboardStatus].find(
                (label) => label && label !== project.title,
              );
              return sublabel ? <em>{sublabel}</em> : null;
            })()}
          </div>
          {isChorusSurface && scrobbleTotal ? (
            <span className="project-expanded-banner-stat">
              <strong>{formatScrobbleCount(scrobbleTotal)}</strong>
              <small>total scrobbles</small>
            </span>
          ) : null}
          <div className="project-expanded-actions">
            {frameUrl || project.visual === "chorus" ? (
              <button
                type="button"
                className="project-expanded-refresh"
                aria-label={`Refresh ${project.title}`}
                onClick={() => {
                  // Chorus refreshes its data in place; reloading the iframe
                  // is the fallback for everything else.
                  if (isChorusSurface && postToChorus({ type: "chorus:refresh" })) return;
                  setFrameNonce((nonce) => nonce + 1);
                }}
              >
                <RefreshCw size={16} strokeWidth={1.9} />
              </button>
            ) : null}
            <button
              type="button"
              className="project-expanded-maximize"
              aria-label={`${isMaximized ? "Minimise" : "Maximise"} ${project.title}`}
              aria-pressed={isMaximized}
              onClick={toggleMaximized}
            >
              {isMaximized ? <Minimize2 size={17} strokeWidth={1.9} /> : <Maximize2 size={17} strokeWidth={1.9} />}
            </button>
            <button
              type="button"
              className="project-expanded-close"
              aria-label={`Close ${project.title}`}
              onClick={onClose}
            >
              <X size={18} strokeWidth={1.9} />
            </button>
          </div>
        </header>
        <div className="project-expanded-body">
          {contentReady ? (
            <ProjectExpandedContent
              project={project}
              frameUrl={frameUrl}
              frameNonce={frameNonce}
              key={frameNonce}
            />
          ) : (
            <div className="project-expanded-content-placeholder" aria-hidden="true" />
          )}
        </div>
      </article>
    </div>,
    document.body
  );
}

export function PersonalPage({ initialSlug = null }) {
  const [expandedSlug, setExpandedSlug] = useState(null);
  const [overlaySlug, setOverlaySlug] = useState(null);
  const [isOverlayMaximized, setIsOverlayMaximized] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isLocalHost, setIsLocalHost] = useState(false);
  const [arrivedSlug, setArrivedSlug] = useState(null);
  const storyboardRef = useRef(null);

  useEffect(() => {
    setIsLocalHost(canUseLocalFrame());

    // Projects live at /projects/<slug>/; legacy #slug links upgrade to the
    // path form (aliases normalise to the canonical slug the same way). A
    // deep link lands on the project's storyboard section and opens the
    // app overlay on top — closing it leaves you on the section.
    const legacyHash = window.location.hash.replace("#", "");
    const requested = legacyHash || initialSlug;
    if (!requested) return undefined;

    const project = findPersonalProjectBySlug(requested);
    if (!project) {
      window.history.replaceState(null, "", "/projects/");
      return undefined;
    }

    if (!isPersonalProjectLaunchable(project)) {
      window.history.replaceState(null, "", `/projects/#${project.slug}`);
      setArrivedSlug(project.slug);
      document.getElementById(project.slug)?.scrollIntoView({ behavior: "instant", block: "start" });
      return undefined;
    }

    window.history.replaceState(null, "", `/projects/${project.slug}/`);
    setArrivedSlug(project.slug);
    document.getElementById(project.slug)?.scrollIntoView({ behavior: "instant", block: "start" });
    setIsOverlayMaximized(false);
    setExpandedSlug(project.slug);
    return undefined;
  }, [initialSlug]);

  // Sections fade up as they enter the viewport. The storyboard only opts
  // into the hidden starting state once the observer exists, so reduced
  // motion and no-JS both keep every section visible from the start.
  useEffect(() => {
    const storyboard = storyboardRef.current;
    if (!storyboard) return undefined;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") return undefined;

    storyboard.classList.add("has-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    storyboard.querySelectorAll(".project-card").forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  const overlayProject = useMemo(
    () => personalProjects.find((project) => project.slug === overlaySlug) ?? null,
    [overlaySlug]
  );

  useEffect(() => {
    if (expandedSlug) {
      setOverlaySlug(expandedSlug);
      const frameId = window.requestAnimationFrame(() => setIsOverlayVisible(true));
      return () => window.cancelAnimationFrame(frameId);
    }

    setIsOverlayVisible(false);
    if (!overlaySlug) return undefined;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const timerId = window.setTimeout(
      () => setOverlaySlug(null),
      prefersReducedMotion ? 0 : PROJECT_OVERLAY_EXIT_MS
    );
    return () => window.clearTimeout(timerId);
  }, [expandedSlug, overlaySlug]);

  const closeExpandedProject = useCallback(() => {
    setExpandedSlug(null);
    setIsOverlayMaximized(false);
  }, []);

  useEffect(() => {
    if (!overlayProject) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        closeExpandedProject();
      }
    };
    const previousOverflow = document.body.style.overflow;
    const previousScrollbarGutter = document.documentElement.style.scrollbarGutter;
    document.body.style.overflow = "hidden";
    document.documentElement.style.scrollbarGutter = "stable";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.scrollbarGutter = previousScrollbarGutter;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeExpandedProject, overlayProject]);

  const selectProject = (project) => {
    if (!isPersonalProjectLaunchable(project)) return;

    setIsOverlayMaximized(false);
    setExpandedSlug(project.slug);
    window.history.replaceState(null, "", `/projects/${project.slug}/`);
  };
  const toggleOverlayMaximized = useCallback(() => {
    setIsOverlayMaximized((current) => !current);
  }, []);
  const frameUrl = overlayProject ? getProjectFrameUrl(overlayProject, isLocalHost) : "";

  return (
    <section className="studio-page personal-page">
      <section className="page-grid studio-hero personal-hero">
        <div className="personal-hero-copy">
          <h1>Things I've been building.</h1>
          <p>
            Curiosity, mostly — an idea I wanted to see working. They're also where I try
            things out before they turn up in someone else's work.
          </p>
        </div>
        <div className="personal-hero-art">
          <div className="page-art-panel" style={{ "--page-art-position": "50% 16%" }} aria-hidden="true">
            <img
              src="/area-art/about-reflection.webp"
              alt=""
              loading="eager"
              decoding="async"
              draggable="false"
            />
          </div>
        </div>
      </section>

      <div className="page-grid projects-grid" ref={storyboardRef}>
        {personalProjects.map((project) => (
          <ProjectCard
            key={project.slug}
            project={project}
            isArrived={project.slug === arrivedSlug}
            onOpen={() => selectProject(project)}
          />
        ))}
      </div>

      {overlayProject && (
        <ProjectExpandedOverlay
          project={overlayProject}
          frameUrl={frameUrl}
          isMaximized={isOverlayMaximized}
          isVisible={isOverlayVisible && overlayProject.slug === expandedSlug}
          onClose={closeExpandedProject}
          onToggleMaximized={toggleOverlayMaximized}
        />
      )}

      <PageFooter />
    </section>
  );
}
