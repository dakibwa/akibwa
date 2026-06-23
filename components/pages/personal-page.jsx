"use client";

import Image from "next/image";
import {
  ArrowRight,
  Disc3,
  Instagram,
  LockKeyhole,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PageFooter } from "@/components/page-footer";
import { fetchSessionJson, readSessionJson } from "@/components/remote-data-cache";
import { getPersonalProjectArt, PersonalProjectArt } from "@/components/personal-project-art";
import { ChorusDashboardPreview } from "@/components/chorus-dashboard-preview";
import {
  chorusAppUrl,
  coverCollisionDataUrl,
  coverCollisionPosts,
  personalProjects
} from "@/components/site-data";
import fallbackChorusData from "@/data/chorus-data.json";

const chorusSummaryDataUrl = (
  process.env.NEXT_PUBLIC_CHORUS_DATA_URL || "https://akibwa-chorus-refresh.dakibwa.workers.dev/chorus"
).trim();

function formatScrobbleCount(value) {
  const numeric = Number(value);
  return new Intl.NumberFormat("en").format(Number.isFinite(numeric) ? numeric : 0);
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

function canUseLocalFrame() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getProjectFrameUrl(project, isLocalHost) {
  if (isLocalHost && project.localUrl) return project.localUrl;
  if (project.embedUrl) return project.embedUrl;
  if (project.visual === "chorus") return chorusAppUrl;
  return "";
}

function shouldOpenProjectRoute(project) {
  return project.mode !== "preview" && project.visual === "vitals" && Boolean(project.fallbackHref);
}

function ProjectExpandedBanner({ project }) {
  const artwork = getPersonalProjectArt(project);

  return (
    <div className={`project-expanded-banner is-${artwork.variant}`} aria-hidden="true">
      <img src={artwork.bannerSrc} alt="" draggable="false" />
    </div>
  );
}

const ACCENT_BY_SLUG = {
  chorus: "#2f88ff",
  "cover-collision": "#e2556b",
  "canta-porto": "#1f6f6b"
};

function accentForSlug(slug) {
  return ACCENT_BY_SLUG[slug] ?? "#2f88ff";
}

function PersonalDetailPanel({ project, onOpen }) {
  const { posts: collisionPosts } = useCoverCollisionData();
  if (!project) return null;

  const artwork = getPersonalProjectArt(project);
  const isCoverCollision = project.visual === "cover-collision";

  return (
    <article className="personal-detail-card" style={{ "--area-accent": accentForSlug(project.slug) }}>
      {isCoverCollision ? (
        <div className="personal-detail-collision" aria-label={`${project.title} album-art series`}>
          {collisionPosts.slice(0, 8).map((post) => (
            <a
              className="cover-collision-post"
              href={post.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${post.title} on Instagram`}
              key={post.href}
            >
              <span className="cover-collision-post-image">
                <CoverCollisionImage post={post} sizes="(max-width: 760px) 30vw, 190px" />
              </span>
            </a>
          ))}
        </div>
      ) : project.shot ? (
        <div className="personal-detail-shot">
          <span className="personal-detail-chrome" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className="personal-detail-shot-frame">
            <img src={project.shot} alt={`${project.title} interface`} decoding="async" draggable="false" />
          </div>
        </div>
      ) : (
        <div className="personal-detail-art">
          <img src={artwork.src} alt="" decoding="async" draggable="false" />
        </div>
      )}
      <div className="personal-detail-foot">
        {project.summary ? <p>{project.summary}</p> : null}
        <button type="button" className="personal-detail-open" onClick={onOpen}>
          {project.cta || "Open"}
          <ArrowRight size={16} strokeWidth={1.8} />
        </button>
      </div>
    </article>
  );
}

function PersonalSelectorBar({ project, isActive, onPreview, onOpen }) {
  return (
    <button
      type="button"
      className={`personal-selector-bar ${isActive ? "is-active" : ""}`}
      aria-pressed={isActive}
      style={{ "--area-accent": accentForSlug(project.slug) }}
      onPointerEnter={onPreview}
      onFocus={onPreview}
      onClick={onOpen}
    >
      <span className="personal-selector-num">{project.number}</span>
      <span className="personal-selector-copy">
        <strong>{project.title}</strong>
        <em>{project.type}</em>
      </span>
      <ArrowRight size={15} strokeWidth={1.8} />
    </button>
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
  if (postCount <= 9) return { columns: 3, rows: Math.ceil(postCount / 3) };
  if (postCount <= 16) return { columns: 4, rows: Math.ceil(postCount / 4) };
  if (postCount <= 25) return { columns: 5, rows: Math.ceil(postCount / 5) };

  const columns = 6;
  return { columns, rows: Math.ceil(postCount / columns) };
}

function isCoverCollisionData(data) {
  return data?.profileUrl && Array.isArray(data?.posts);
}

function latestCoverCollisionDate(data) {
  return data?.posts?.[0]?.date || data?.snapshotDate || "";
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
                    ? `(max-width: 360px) 100vw, (max-width: 760px) 50vw, ${Math.ceil(100 / galleryLayout.columns)}vw`
                    : "(max-width: 760px) 44vw, (max-width: 1100px) 22vw, 210px"
                }
              />
              {galleryOnly && (
                <span className="cover-collision-post-caption" aria-hidden="true">
                  <strong>{post.title}</strong>
                </span>
              )}
            </span>
            {!galleryOnly && (
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
            <span>{project.title}</span>
            <strong>{project.dashboardLabel ?? "Live project"}</strong>
            <i className="project-frame-loading-bar" />
          </div>
          <iframe
            key={frameNonce}
            src={frameUrl}
            title={`${project.title} live project`}
            className="live-frame"
            allow="clipboard-read; clipboard-write"
            loading="eager"
            onLoad={() => setIsFrameLoaded(true)}
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
        "transform 520ms cubic-bezier(0.4, 0, 0.2, 1), border-radius 520ms cubic-bezier(0.4, 0, 0.2, 1)";
      shell.style.transform = "translate3d(0, 0, 0) scale(1, 1)";
      shell.style.borderRadius = isMaximized ? "10px" : "12px";
      timerId = window.setTimeout(cleanup, 560);
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
              aria-label={`${isMaximized ? "Minimize" : "Maximize"} ${project.title}`}
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
  const [previewSlug, setPreviewSlug] = useState(personalProjects[0]?.slug ?? null);

  useEffect(() => {
    setIsLocalHost(canUseLocalFrame());

    // Projects live at /personal/<slug>/; legacy #slug links upgrade to the
    // path form (aliases normalise to the canonical slug the same way).
    const legacyHash = window.location.hash.replace("#", "");
    const requested = legacyHash || initialSlug;
    if (!requested) return;

    const project = personalProjects.find(
      (item) => item.slug === requested || item.aliases?.includes(requested)
    );
    if (!project) {
      window.history.replaceState(null, "", "/personal/");
      return;
    }

    if (shouldOpenProjectRoute(project)) {
      window.location.assign(project.fallbackHref);
      return;
    }

    const hasInlineFrame = Boolean(getProjectFrameUrl(project, canUseLocalFrame()));
    if (
      project.mode !== "preview" &&
      project.fallbackHref &&
      (project.visual === "chorus" || project.visual === "vitals") &&
      !hasInlineFrame
    ) {
      window.location.assign(project.fallbackHref);
      return;
    }

    setExpandedSlug(project.slug);
    window.history.replaceState(null, "", `/personal/${project.slug}/`);
  }, [initialSlug]);

  const overlayProject = useMemo(
    () => personalProjects.find((project) => project.slug === overlaySlug) ?? null,
    [overlaySlug]
  );
  const previewProject = useMemo(
    () => personalProjects.find((project) => project.slug === previewSlug) ?? personalProjects[0] ?? null,
    [previewSlug]
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
    window.history.replaceState(null, "", `/personal/${window.location.search}`);
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
    if (shouldOpenProjectRoute(project)) {
      window.location.assign(project.fallbackHref);
      return;
    }

    setIsOverlayMaximized(false);
    setExpandedSlug(project.slug);
    window.history.replaceState(null, "", `/personal/${project.slug}/`);
  };
  const toggleOverlayMaximized = useCallback(() => {
    setIsOverlayMaximized((current) => !current);
  }, []);
  const frameUrl = overlayProject ? getProjectFrameUrl(overlayProject, isLocalHost) : "";

  return (
    <section className="studio-page personal-page">
      <section className="page-grid studio-hero personal-hero">
        <h1>Personal</h1>
        <p>Things I wanted to exist — so I built them.</p>
      </section>

      <section className="page-grid personal-explorer" aria-label="Personal projects">
        <div className="personal-detail" aria-live="polite">
          <PersonalDetailPanel
            project={previewProject}
            onOpen={() => previewProject && selectProject(previewProject)}
          />
        </div>
        <ol className="personal-selector" aria-label="Choose a project">
          {personalProjects.map((project) => (
            <li key={project.slug}>
              <PersonalSelectorBar
                project={project}
                isActive={project.slug === previewSlug}
                onPreview={() => setPreviewSlug(project.slug)}
                onOpen={() => {
                  if (project.slug === previewSlug) selectProject(project);
                  else setPreviewSlug(project.slug);
                }}
              />
            </li>
          ))}
        </ol>
      </section>

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
