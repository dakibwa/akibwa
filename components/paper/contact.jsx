"use client";

import { useId } from "react";

// The address is assembled only when someone asks for it, so it never sits in
// the static HTML.
const openEmail = () => {
  const local = ["da", "kibwa"].join("");
  const domain = ["gm", "ail", ".com"].join("");
  window.location.assign(`mailto:${local}@${domain}`);
};

/*
 * Each way to reach Dan is a small paper object outlined in ink over its
 * shadow, beside the night switch (Dan, 19 October 2026: “they can get colour
 * and a bit of some interesting design”): a camera in Instagram's warm
 * gradient whose lens snaps under the pointer, X's dark tile whose mark spins,
 * and an envelope sealed in ember whose flap opens on a letter. Each lifts
 * under the pointer and presses into its shadow (globals.css).
 */
function Camera() {
  const id = `ig-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg className="contact-art contact-camera" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd36e" />
          <stop offset=".32" stopColor="#fb8a3c" />
          <stop offset=".64" stopColor="#e3367a" />
          <stop offset="1" stopColor="#8a3fd1" />
        </linearGradient>
      </defs>
      <rect className="contact-shadow" x="3" y="4" width="30" height="30" rx="9" />
      <g className="contact-face">
        <rect className="contact-outline" x="3" y="2" width="30" height="30" rx="9" fill={`url(#${id})`} />
        <rect className="camera-flash" x="3" y="2" width="30" height="30" rx="9" />
        <circle className="camera-lens" cx="18" cy="17" r="6.3" />
        <circle className="camera-finder" cx="25.4" cy="9.6" r="1.7" />
      </g>
    </svg>
  );
}

function XTile() {
  return (
    <svg className="contact-art contact-x" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <rect className="contact-shadow" x="3" y="4" width="30" height="30" rx="8" />
      <g className="contact-face">
        <rect className="contact-outline x-tile" x="3" y="2" width="30" height="30" rx="8" />
        <g className="x-mark">
          <path transform="translate(10.6 9.6) scale(.62)" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.173 2.25H8l4.713 6.231zm-1.161 17.52h1.833L7.004 4.126H5.037z" />
        </g>
      </g>
    </svg>
  );
}

function Envelope() {
  return (
    <svg className="contact-art contact-envelope" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <rect className="contact-shadow" x="2.5" y="9.5" width="31" height="21" rx="3" />
      <g className="contact-face">
        {/* Open, the flap stands behind the letter; closed, in front of it. */}
        <g className="envelope-open">
          <path className="envelope-paper" d="M4.2 7.5h27.6L18-3.6z" />
          <path className="envelope-crease" d="M4.2 7.5L18-3.6l13.8 11.1" />
        </g>
        <rect className="contact-outline envelope-back" x="2.5" y="7.5" width="31" height="21" rx="3" />
        <g className="envelope-letter">
          <rect x="7" y="9.5" width="22" height="15" rx="1.5" />
          <path d="M10.5 14h15M10.5 17.5h11" />
        </g>
        <path className="envelope-pocket" d="M3.3 13.9L18 22.4l14.7-8.5V25.5a2.3 2.3 0 0 1-2.3 2.3H5.6a2.3 2.3 0 0 1-2.3-2.3z" />
        <path className="envelope-crease" d="M3.3 13.9L18 22.4l14.7-8.5" />
        <g className="envelope-flap">
          <path className="envelope-paper" d="M4.2 7.5h27.6L18 19.2z" />
          <path className="envelope-crease" d="M4.2 7.5L18 19.2l13.8-11.7" />
          <circle className="envelope-seal" cx="18" cy="17.4" r="2.7" />
        </g>
      </g>
    </svg>
  );
}

export function Contact() {
  return (
    <div className="contact" aria-label="Contact Akibwa" role="group">
      <a className="contact-link" href="https://www.instagram.com/dakibwa/" aria-label="Instagram — @dakibwa" title="Instagram">
        <Camera />
      </a>
      <a className="contact-link" href="https://x.com/dakibwa" aria-label="X — @dakibwa" title="X">
        <XTile />
      </a>
      <button className="contact-link" type="button" onClick={openEmail} aria-label="Email Akibwa" title="Email">
        <Envelope />
      </button>
    </div>
  );
}
