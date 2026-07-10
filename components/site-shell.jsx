"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { areaTiles } from "@/components/site-data";

const navArt = Object.fromEntries(areaTiles.map((tile) => [tile.href, tile.navImage ?? tile.image]));

const navItems = [
  { href: "/personal", label: "Personal", match: ["/personal", "/work", "/projects", "/chorus"] },
  { href: "/professional", label: "Professional", match: ["/professional", "/offer", "/systems", "/services"] },
  { href: "/about", label: "About", match: ["/about"] },
  { href: "/contact", label: "Contact", match: ["/contact", "/book-a-call"] }
];

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
                <Link
                  key={item.href}
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
