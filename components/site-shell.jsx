"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { areaTiles, personalProjects } from "@/components/site-data";

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

/* Lightened tints of each area's accent for the label glow (rgb triplets). */
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

function normalize(pathname) {
  if (pathname !== "/" && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function isActive(pathname, match) {
  return match.includes(normalize(pathname));
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
              className="brand"
              onClick={() => setIsMenuOpen(false)}
              onPointerEnter={() => primeRoute("/")}
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                event.currentTarget.style.setProperty("--brand-mx", `${event.clientX - rect.left}px`);
              }}
              onFocus={() => primeRoute("/")}
            >
              AKIBWA
            </Link>

            <nav className="nav-desktop" aria-label="Main navigation">
              {navItems.map((item) => (
                <div className="nav-item" key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    className={`nav-link ${isActive(pathname, item.match) ? "active" : ""}`}
                    aria-current={isActive(pathname, item.match) ? "page" : undefined}
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
                        {personalProjects.map((project) => (
                          <Link
                            key={project.slug}
                            href={`/personal/${project.slug}`}
                            prefetch
                            className="nav-dropdown-link"
                            style={{ "--project-accent": projectAccents[project.slug] }}
                            onPointerEnter={() => primeRoute(`/personal/${project.slug}`)}
                          >
                            <i aria-hidden="true">{project.number}</i>
                            <strong>{project.title}</strong>
                            <em>{project.type}</em>
                          </Link>
                        ))}
                        <Link href="/personal" prefetch className="nav-dropdown-all">
                          All personal projects
                          <ArrowRight size={13} strokeWidth={1.8} />
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
              aria-label="Toggle navigation"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <Menu className="menu-icon menu-icon-open" size={22} />
              <X className="menu-icon menu-icon-close" size={22} />
            </button>
          </div>

          <div className={`nav-mobile ${isMenuOpen ? "is-open" : ""}`} aria-hidden={!isMenuOpen}>
            <div className="site-frame nav-mobile-inner">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`nav-link ${isActive(pathname, item.match) ? "active" : ""}`}
                  aria-current={isActive(pathname, item.match) ? "page" : undefined}
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
        </header>
      )}

      <main className="page-transition">
        {children}
      </main>
    </div>
  );
}
