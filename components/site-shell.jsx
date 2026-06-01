"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useRef, useState } from "react";

const navItems = [
  { href: "/about", label: "About", match: ["/about"] },
  { href: "/personal", label: "Personal", match: ["/personal", "/work", "/projects", "/health", "/chorus", "/sonic-fm"] },
  { href: "/professional", label: "Professional", match: ["/professional", "/offer", "/systems", "/services"] },
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
  const brandRef = useRef(null);
  const immersiveRoutes = ["/health", "/chorus", "/sonic-fm"];
  const isImmersiveRoute = immersiveRoutes.includes(normalize(pathname));

  const primeRoute = (href) => {
    router.prefetch(href);
  };

  const syncBrandPointer = (event) => {
    const brand = brandRef.current;
    if (!brand) return;

    const rect = brand.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));

    brand.style.setProperty("--brand-x", `${x.toFixed(2)}%`);
    brand.style.setProperty("--brand-y", `${y.toFixed(2)}%`);
  };

  const resetBrandPointer = () => {
    const brand = brandRef.current;
    if (!brand) return;

    brand.style.setProperty("--brand-x", "50%");
    brand.style.setProperty("--brand-y", "50%");
  };

  return (
    <div className={`site-shell ${isImmersiveRoute ? "is-immersive" : ""}`}>
      {!isImmersiveRoute && (
        <header className="site-header">
          <div className="site-frame nav-row">
            <Link
              ref={brandRef}
              href="/"
              prefetch
              className="brand"
              onClick={() => setIsMenuOpen(false)}
              onPointerEnter={(event) => {
                primeRoute("/");
                syncBrandPointer(event);
              }}
              onPointerMove={syncBrandPointer}
              onPointerLeave={resetBrandPointer}
              onMouseMove={syncBrandPointer}
              onMouseLeave={resetBrandPointer}
              onFocus={() => {
                primeRoute("/");
                resetBrandPointer();
              }}
              onBlur={resetBrandPointer}
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
