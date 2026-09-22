"use client";

import { Mail, Instagram, ArrowUp } from "lucide-react";
import { SiteImage } from "./site-image";
import { useSpotlight } from "./spotlight";

const chapters = [
  ["projects", "Projects", "var(--concept-projects)"],
  ["career", "Career", "var(--concept-career)"],
  ["taste", "Taste Library", "var(--concept-archive)"],
];

/* The masthead variant (`embedded`) carries the chapter links and is the skip
   link's target. The plain variant closes the page: the Akibwa mark, the same
   contact icons and a way back to the top. */
export function PageFooter({ embedded = false }) {
  const Root = embedded ? "div" : "footer";
  const { spotlight, setSpotlight } = useSpotlight();
  // In the masthead the icons repeat the chapter colours in the links' order.
  const accents = embedded ? chapters.map(([, , accent]) => accent) : ["#c05270", "#1b947d", "#2f88ff"];
  const openEmail = () => {
    const local = ["da", "kibwa"].join("");
    const domain = ["gm", "ail", ".com"].join("");
    window.location.assign(`mailto:${local}@${domain}`);
  };
  // Scroll rather than follow a #hash: a hash change would leave a spotlit
  // chapter. Focus returns to the page so Tab starts from the masthead again.
  const backToTop = () => {
    const instant = matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: instant ? "instant" : "smooth" });
    document.getElementById("main-content")?.focus({ preventScroll: true });
  };

  return (
    <Root
      className={`${embedded ? "concept-hero-footer" : "page-grid site-signoff"} page-footer`}
      id={embedded ? "site-footer" : undefined}
      tabIndex={embedded ? -1 : undefined}
    >
      <div className="page-footer-panel">
        <div className="page-footer-meta">
          {embedded ? null : (
            <p className="site-signoff-mark">
              <SiteImage src="/brand-logos/akibwa-a.png" slot="identityMark" sizes="22px" alt="" />
              Akibwa
            </p>
          )}
          {embedded ? (
            <nav className={`concept-section-links${spotlight ? " has-spotlight" : ""}`} aria-label="Explore the page">
              {chapters.map(([id, label, accent]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  style={{ "--section-accent": accent }}
                  aria-current={spotlight === id ? "true" : undefined}
                  onClick={(event) => {
                    // Plain clicks bring the chapter forward; the anchor still
                    // serves new tabs and pages without JavaScript.
                    if (!setSpotlight || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    setSpotlight(spotlight === id ? null : id);
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>
          ) : null}
          <div className="page-footer-details" aria-label="Contact Akibwa">
            <a
              className="social-icon"
              href="https://www.instagram.com/dakibwa/"
              aria-label="Instagram — @dakibwa"
              title="Instagram"
              style={{ "--handle-accent": accents[0] }}
            >
              <Instagram size={20} strokeWidth={1.65} aria-hidden="true" />
            </a>
            <a
              className="social-icon"
              href="https://x.com/dakibwa"
              aria-label="X — @dakibwa"
              title="X"
              style={{ "--handle-accent": accents[1] }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.173 2.25H8l4.713 6.231zm-1.161 17.52h1.833L7.004 4.126H5.037z" />
              </svg>
            </a>
            <button
              className="social-icon"
              type="button"
              onClick={openEmail}
              aria-label="Email Akibwa"
              title="Email"
              style={{ "--handle-accent": accents[2] }}
            >
              <Mail size={20} strokeWidth={1.65} aria-hidden="true" />
            </button>
          </div>
          {embedded ? null : (
            <button className="site-signoff-top" type="button" onClick={backToTop}>
              Back to top
              <ArrowUp size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </Root>
  );
}
