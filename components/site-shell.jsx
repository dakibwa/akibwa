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

                  {item.href === "/personal" ? (
                    <div className="nav-dropdown" aria-label="Personal projects">
                      <div className="nav-dropdown-panel">
                        {personalProjects.map((project) => (
                          <Link
                            key={project.slug}
                            href={`/personal/${project.slug}`}
                            prefetch
                            className={`nav-dropdown-link ${normalize(pathname) === `/personal/${project.slug}` ? "is-active" : ""}`}
                            aria-current={normalize(pathname) === `/personal/${project.slug}` ? "page" : undefined}
                            style={{ "--project-accent": projectAccents[project.slug] }}
                            onPointerEnter={() => primeRoute(`/personal/${project.slug}`)}
                          >
                            <i aria-hidden="true">{project.number}</i>
                            <strong>{project.title}</strong>
                            <em>{project.statusLabel ?? project.type}</em>
                            <ArrowRight className="nav-dropdown-link-arrow" size={13} strokeWidth={1.8} aria-hidden="true" />
                          </Link>
                        ))}
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
