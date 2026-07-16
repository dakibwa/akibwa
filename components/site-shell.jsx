"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
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

const trackNavGlow = (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--nav-mx", `${event.clientX - rect.left}px`);
};

const resetNavGlow = (event) => {
  event.currentTarget.querySelector(":scope > .nav-link")?.style.removeProperty("--nav-mx");
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
  const immersiveRoutes = ["/chorus"];
  const isImmersiveRoute = immersiveRoutes.includes(normalize(pathname));

  const primeRoute = (href) => {
    router.prefetch(href);
  };

  return (
    <div className={`site-shell ${isImmersiveRoute ? "is-immersive" : ""}`}>
      {!isImmersiveRoute && (
        <header className="site-header">
          <div className="site-frame nav-row">
            <Link
              href="/"
              prefetch
              className={`brand ${normalize(pathname) === "/" ? "active" : ""}`}
              aria-current={normalize(pathname) === "/" ? "page" : undefined}
              onClick={() => setIsMenuOpen(false)}
              onPointerEnter={() => primeRoute("/")}
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                event.currentTarget.style.setProperty("--brand-mx", `${event.clientX - rect.left}px`);
              }}
              onPointerLeave={(event) => event.currentTarget.style.removeProperty("--brand-mx")}
              onFocus={() => primeRoute("/")}
            >
              AKIBWA
            </Link>

            <nav className="nav-desktop" aria-label="Main navigation">
              {navItems.map((item) => (
                <div className="nav-item" key={item.href} onPointerLeave={resetNavGlow}>
                  <Link
                    href={item.href}
                    prefetch
                    className={`nav-link ${isActive(pathname, item.match) ? "active" : ""}`}
                    aria-current={navAriaCurrent(pathname, item)}
                    style={{
                      "--nav-glow-light": navGlow[item.href]?.light,
                      "--nav-glow-mid": navGlow[item.href]?.mid
                    }}
                    onPointerEnter={() => primeRoute(item.href)}
                    onPointerMove={trackNavGlow}
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
                  </Link>

                  {item.href === "/personal" ? (
                    <div className="nav-dropdown" aria-label="Personal projects">
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
              ))}
            </nav>

            <button
              type="button"
              className="nav-mobile-toggle"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <span className="nav-mobile-toggle-icon" aria-hidden="true">
                <span className="menu-line menu-line-top" />
                <span className="menu-line menu-line-middle" />
                <span className="menu-line menu-line-bottom" />
              </span>
            </button>
          </div>

          <div className={`nav-mobile ${isMenuOpen ? "is-open" : ""}`} aria-hidden={!isMenuOpen}>
            <div className="nav-mobile-clip">
              <div className="site-frame nav-mobile-inner">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    tabIndex={isMenuOpen ? undefined : -1}
                    className={`nav-link ${isActive(pathname, item.match) ? "active" : ""}`}
                    aria-current={navAriaCurrent(pathname, item)}
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
                  </Link>
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
