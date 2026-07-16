"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PointerResponseLink } from "@/components/pointer-response";
import { areaTiles, isPersonalProjectLaunchable, personalProjects } from "@/components/site-data";
import { getPersonalProjectArt } from "@/components/personal-project-art";

const navArt = Object.fromEntries(areaTiles.map((tile) => [tile.href, tile.navImage ?? tile.image]));

const navItems = [
  { href: "/personal", label: "Personal", match: ["/personal", "/work", "/projects", "/chorus"] },
  { href: "/professional", label: "Professional", match: ["/professional", "/offer", "/services"] },
  { href: "/about", label: "About", match: ["/about"] },
  { href: "/contact", label: "Contact", match: ["/contact", "/book-a-call"] }
];

/* Each project's accent, as used by its artwork on the personal page. */
const projectAccents = {
  chorus: "#ff6f1a",
  "cover-collision": "#e2556b",
  "canta-porto": "#0d5267",
  "one-bag": "#2f7d57",
  meditator: "#3a5a45"
};

/* Light and mid tones from each area's artwork, used by the
   cursor-tracked colour passing through the desktop navigation text. */
const navGlow = {
  "/personal": { light: "143 188 255", mid: "93 157 255" },
  "/professional": { light: "255 177 128", mid: "255 140 71" },
  "/about": { light: "125 191 164", mid: "74 157 125" },
  "/contact": { light: "143 188 255", mid: "93 157 255" }
};

function normalize(pathname) {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function isActive(pathname, match) {
  const current = normalize(pathname);

  return match.includes(current) || (match.includes("/personal") && current.startsWith("/personal/"));
}

function navAriaCurrent(pathname, item) {
  const current = normalize(pathname);

  if (current === item.href) {
    return "page";
  }

  return isActive(pathname, item.match) ? "location" : undefined;
}

export function SiteShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPersonalMenuOpen, setIsPersonalMenuOpen] = useState(false);
  const [navigationInteractionCycle, setNavigationInteractionCycle] = useState(0);
  const mobileToggleRef = useRef(null);
  const immersiveRoutes = ["/chorus"];
  const isImmersiveRoute = immersiveRoutes.includes(normalize(pathname));
  const pointerResetSignal = `${normalize(pathname)}:${navigationInteractionCycle}`;

  useEffect(() => {
    setIsMenuOpen(false);
    setIsPersonalMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeMenusOnEscape = (event) => {
      if (event.key !== "Escape") return;

      setIsMenuOpen(false);
      setIsPersonalMenuOpen(false);
      mobileToggleRef.current?.focus();
    };

    window.addEventListener("keydown", closeMenusOnEscape);
    return () => window.removeEventListener("keydown", closeMenusOnEscape);
  }, []);

  const primeRoute = (href) => {
    router.prefetch(href);
  };

  return (
    <div className={`site-shell ${isImmersiveRoute ? "is-immersive" : ""}`}>
      {!isImmersiveRoute && (
        <header
          className="site-header"
          onClickCapture={() => setNavigationInteractionCycle((cycle) => cycle + 1)}
        >
          <div className="site-frame nav-row">
            <PointerResponseLink
              href="/"
              prefetch
              className={`brand ${normalize(pathname) === "/" ? "active" : ""}`}
              aria-current={normalize(pathname) === "/" ? "page" : undefined}
              pointerXProperty="--brand-mx"
              pointerResetSignal={pointerResetSignal}
              onClick={() => {
                setIsMenuOpen(false);
                setIsPersonalMenuOpen(false);
              }}
              onPointerEnter={() => primeRoute("/")}
              onFocus={() => primeRoute("/")}
            >
              AKIBWA
            </PointerResponseLink>

            <nav className="nav-desktop" aria-label="Main navigation">
              {navItems.map((item) => {
                const hasDropdown = item.href === "/personal";
                const syncPersonalMenuToPointer = (event) => {
                  setIsPersonalMenuOpen(hasDropdown && event.pointerType !== "touch");
                };

                return (
                  <div
                    className={`nav-item ${hasDropdown && isPersonalMenuOpen ? "is-dropdown-open" : ""}`}
                    key={item.href}
                    onPointerEnter={syncPersonalMenuToPointer}
                    onPointerMove={syncPersonalMenuToPointer}
                    onPointerLeave={() => {
                      if (hasDropdown) {
                        setIsPersonalMenuOpen(false);
                      }
                    }}
                    onFocusCapture={() => setIsPersonalMenuOpen(hasDropdown)}
                    onBlurCapture={(event) => {
                      if (hasDropdown && !event.currentTarget.contains(event.relatedTarget)) {
                        setIsPersonalMenuOpen(false);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (hasDropdown && event.key === "Escape") {
                        event.preventDefault();
                        setIsPersonalMenuOpen(false);
                        event.currentTarget.querySelector(":scope > .nav-link")?.focus();
                      }
                    }}
                  >
                  <PointerResponseLink
                    href={item.href}
                    prefetch
                    className={`nav-link ${isActive(pathname, item.match) ? "active" : ""}`}
                    aria-current={navAriaCurrent(pathname, item)}
                    aria-expanded={hasDropdown ? isPersonalMenuOpen : undefined}
                    aria-haspopup={hasDropdown ? "true" : undefined}
                    pointerXProperty="--nav-mx"
                    pointerResetSignal={pointerResetSignal}
                    style={{
                      "--nav-glow-light": navGlow[item.href]?.light,
                      "--nav-glow-mid": navGlow[item.href]?.mid
                    }}
                    onClick={() => setIsPersonalMenuOpen(false)}
                    onPointerEnter={(event) => {
                      syncPersonalMenuToPointer(event);
                      primeRoute(item.href);
                    }}
                    onFocus={() => primeRoute(item.href)}
                  >
                    {navArt[item.href] ? (
                      <span
                        className="nav-link__art"
                        style={{ backgroundImage: `url(${navArt[item.href]})` }}
                        aria-hidden="true"
                      />
                    ) : null}
                    {item.label}
                  </PointerResponseLink>

                  {hasDropdown ? (
                    <div
                      className="nav-dropdown"
                      aria-label="Personal projects"
                      aria-hidden={!isPersonalMenuOpen}
                    >
                      <div className="nav-dropdown-panel">
                        {personalProjects.map((project) => {
                          const artwork = getPersonalProjectArt(project);
                          const content = (
                            <>
                              <span
                                className="nav-dropdown-link-art"
                                style={{
                                  backgroundImage: `url(${artwork.navBannerSrc})`,
                                  backgroundPosition: artwork.selectorBannerPosition
                                }}
                                aria-hidden="true"
                              />
                              <strong>{project.title}</strong>
                              <em>{project.statusLabel ?? project.type}</em>
                            </>
                          );

                          if (!isPersonalProjectLaunchable(project)) {
                            return (
                              <div
                                key={project.slug}
                                className="nav-dropdown-link is-unavailable"
                                aria-disabled="true"
                                style={{ "--project-accent": projectAccents[project.slug] }}
                              >
                                {content}
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={project.slug}
                              href={`/personal/${project.slug}`}
                              prefetch
                              className={`nav-dropdown-link ${normalize(pathname) === `/personal/${project.slug}` ? "is-active" : ""}`}
                              aria-current={normalize(pathname) === `/personal/${project.slug}` ? "page" : undefined}
                              style={{ "--project-accent": projectAccents[project.slug] }}
                              onPointerEnter={() => primeRoute(`/personal/${project.slug}`)}
                            >
                              {content}
                              <ArrowRight className="nav-dropdown-link-arrow" size={13} strokeWidth={1.8} aria-hidden="true" />
                            </Link>
                          );
                        })}
                        <Link href="/personal" prefetch className="nav-dropdown-all">
                          View all projects
                          <ArrowRight size={13} strokeWidth={1.8} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  </div>
                );
              })}
            </nav>

            <button
              type="button"
              className="nav-mobile-toggle"
              ref={mobileToggleRef}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => {
                setIsPersonalMenuOpen(false);
                setIsMenuOpen((open) => !open);
              }}
            >
              <span className="nav-mobile-toggle-icon" aria-hidden="true">
                <span className="menu-line menu-line-top" />
                <span className="menu-line menu-line-middle" />
                <span className="menu-line menu-line-bottom" />
              </span>
            </button>
          </div>

          <div
            id="mobile-navigation"
            className={`nav-mobile ${isMenuOpen ? "is-open" : ""}`}
            aria-hidden={!isMenuOpen}
            inert={!isMenuOpen}
          >
            <div className="nav-mobile-clip">
              <div className="site-frame nav-mobile-inner">
                {navItems.map((item) => (
                  <PointerResponseLink
                    key={item.href}
                    href={item.href}
                    prefetch
                    tabIndex={isMenuOpen ? undefined : -1}
                    className={`nav-link ${isActive(pathname, item.match) ? "active" : ""}`}
                    aria-current={navAriaCurrent(pathname, item)}
                    pointerResetSignal={`${pointerResetSignal}:${isMenuOpen ? "open" : "closed"}`}
                    onClick={() => setIsMenuOpen(false)}
                    onPointerEnter={() => primeRoute(item.href)}
                    onFocus={() => primeRoute(item.href)}
                  >
                    {navArt[item.href] ? (
                      <span
                        className="nav-link__art"
                        style={{ backgroundImage: `url(${navArt[item.href]})` }}
                        aria-hidden="true"
                      />
                    ) : null}
                    {item.label}
                  </PointerResponseLink>
                ))}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="page-transition">
        {children}
      </main>
    </div>
  );
}
