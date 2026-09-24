"use client";

import { Instagram, Mail } from "lucide-react";

// The address is assembled only when someone asks for it, so it never sits in
// the static HTML.
const openEmail = () => {
  const local = ["da", "kibwa"].join("");
  const domain = ["gm", "ail", ".com"].join("");
  window.location.assign(`mailto:${local}@${domain}`);
};

export function Contact() {
  return (
    <div className="contact" aria-label="Contact Akibwa" role="group">
      <a className="contact-link" href="https://www.instagram.com/dakibwa/" aria-label="Instagram — @dakibwa" title="Instagram">
        <Instagram size={19} strokeWidth={1.7} aria-hidden="true" />
      </a>
      <a className="contact-link" href="https://x.com/dakibwa" aria-label="X — @dakibwa" title="X">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.173 2.25H8l4.713 6.231zm-1.161 17.52h1.833L7.004 4.126H5.037z" />
        </svg>
      </a>
      <button className="contact-link" type="button" onClick={openEmail} aria-label="Email Akibwa" title="Email">
        <Mail size={19} strokeWidth={1.7} aria-hidden="true" />
      </button>
    </div>
  );
}
