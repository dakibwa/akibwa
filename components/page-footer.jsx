"use client";

import { Mail, Instagram } from "lucide-react";
import { SiteImage } from "@/components/site-image";

function IdentitySocialIcon({ kind }) {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      {kind === "instagram" && <>
        <path fill="currentColor" fillRule="evenodd" d="M11 2C4.8 2 2 4.8 2 11v10c0 6.2 2.8 9 9 9h10c6.2 0 9-2.8 9-9V11c0-6.2-2.8-9-9-9H11Zm0 4.5h10c3.4 0 4.5 1.1 4.5 4.5v10c0 3.4-1.1 4.5-4.5 4.5H11c-3.4 0-4.5-1.1-4.5-4.5V11c0-3.4 1.1-4.5 4.5-4.5Z" />
        <circle cx="16" cy="16" r="5.4" stroke="currentColor" strokeWidth="3.6" />
        <circle cx="23" cy="9" r="1.8" fill="currentColor" />
        <path className="identity-social-terminal" d="M30 20.5v.5c0 6.2-2.8 9-9 9h-.5c-.4-2 1.1-3.5 3.3-4.9 2.2-1.4 4.2-2.5 6.2-4.6Z" />
      </>}
      {kind === "x" && <>
        <path d="m25.5 4.5-19 23" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M8 4.5 25 27.5" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        <path className="identity-social-terminal" d="m25.7 22.5 2.1 2.9a3.5 3.5 0 0 1-5.6 4.2l-1.4-1.9c-.4-2.1 2.1-3.8 4.9-5.2Z" />
      </>}
      {kind === "email" && <>
        <path fill="currentColor" fillRule="evenodd" d="M9 5C4 5 1.5 7.5 1.5 12v8C1.5 24.5 4 27 9 27h14c5 0 7.5-2.5 7.5-7v-8C30.5 7.5 28 5 23 5H9Zm-2 5c-.5 0-.8.6-.4.9l7.5 6.2a3 3 0 0 0 3.8 0l7.5-6.2c.4-.3.1-.9-.4-.9h-1.8L16 15.7 8.8 10H7Z" />
        <path className="identity-social-terminal" d="M30.5 17.5V20c0 4.5-2.5 7-7.5 7h-.8c-.9-2.3.8-4.1 3.4-5.6 1.8-1 3.5-2.2 4.9-3.9Z" />
      </>}
    </svg>
  );
}

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
            {embedded && (
              <span className="contact-identity-mark" aria-hidden="true">
                <SiteImage
                  src="/brand-logos/akibwa-a.png"
                  slot="identityMark"
                  sizes="36px"
                  alt=""
                  above
                />
              </span>
            )}
            <a
              className="social-icon"
              href="https://www.instagram.com/dakibwa/"
              aria-label="Instagram — @dakibwa"
              title="Instagram"
              style={{ "--handle-accent": embedded ? "var(--identity-orange)" : "#c05270" }}
            >
              {embedded ? <IdentitySocialIcon kind="instagram" /> : <Instagram size={20} strokeWidth={1.65} aria-hidden="true" />}
            </a>
            <a
              className="social-icon"
              href="https://x.com/dakibwa"
              aria-label="X — @dakibwa"
              title="X"
              style={{ "--handle-accent": embedded ? "var(--identity-orange)" : "#1b947d" }}
            >
              {embedded ? <IdentitySocialIcon kind="x" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.173 2.25H8l4.713 6.231zm-1.161 17.52h1.833L7.004 4.126H5.037z" />
              </svg>}
            </a>
            <button
              className="social-icon"
              type="button"
              onClick={openEmail}
              aria-label="Email Akibwa"
              title="Email"
              style={{ "--handle-accent": embedded ? "var(--identity-orange)" : "#2f88ff" }}
            >
              {embedded ? <IdentitySocialIcon kind="email" /> : <Mail size={20} strokeWidth={1.65} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </Root>
  );
}
