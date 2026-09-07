"use client";

import { Mail, Instagram } from "lucide-react";

export function PageFooter({ embedded = false }) {
  const Root = embedded ? "div" : "footer";
  const openEmail = () => {
    const local = ["da", "kibwa"].join("");
    const domain = ["gm", "ail", ".com"].join("");
    window.location.assign(`mailto:${local}@${domain}`);
  };

  return (
    <Root
      className={`${embedded ? "concept-hero-footer" : "page-grid"} page-footer`}
      id="site-footer"
      tabIndex={-1}
    >
      <div className="page-footer-panel">
        <div className="page-footer-meta">
          <div className="page-footer-details" aria-label="Contact Akibwa">
            <a
              className="social-icon"
              href="https://www.instagram.com/dakibwa/"
              aria-label="Instagram — @dakibwa"
              title="Instagram"
              style={{ "--handle-accent": "#c05270" }}
            >
              <Instagram size={20} strokeWidth={1.65} aria-hidden="true" />
            </a>
            <a
              className="social-icon"
              href="https://x.com/dakibwa"
              aria-label="X — @dakibwa"
              title="X"
              style={{ "--handle-accent": "#1b947d" }}
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
              style={{ "--handle-accent": "#2f88ff" }}
            >
              <Mail size={20} strokeWidth={1.65} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Root>
  );
}
