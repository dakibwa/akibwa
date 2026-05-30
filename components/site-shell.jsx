"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useMemo, useState } from "react";

const navItems = [
  { href: "/work", label: "Work", match: ["/work", "/projects"] },
  { href: "/systems", label: "Systems", match: ["/systems", "/about"] },
  { href: "/offer", label: "Offer", match: ["/offer", "/services"] },
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const nav = useMemo(() => navItems, []);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-frame nav-row">
          <Link href="/" className="brand" onClick={() => setIsMenuOpen(false)}>
            AKIBWA
          </Link>

          <nav className="nav-desktop" aria-label="Main navigation">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive(pathname, item.match) ? "active" : ""}`}
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
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive(pathname, item.match) ? "active" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main key={pathname} className="page-transition">
        {children}
      </main>
    </div>
  );
}
