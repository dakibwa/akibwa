"use client";

import { Mail } from "lucide-react";
import { usePointerResponse } from "@/components/pointer-response";

export function PageFooter({ embedded = false }) {
  const emailPointer = usePointerResponse();
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
            <button
              type="button"
              {...emailPointer}
              onClick={openEmail}
              aria-label="Email Akibwa"
              style={{ "--handle-accent": "#2f88ff" }}
            >
              <Mail size={14} strokeWidth={1.8} />
              <span>Email Akibwa</span>
            </button>
          </div>
        </div>
      </div>
    </Root>
  );
}
