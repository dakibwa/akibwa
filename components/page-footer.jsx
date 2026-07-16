import { Instagram, Mail, Navigation } from "lucide-react";

function XLogo({ size = 14 }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="x-logo"
    >
      <path
        fill="currentColor"
        d="M18.9 2h3.3l-7.3 8.3L23.5 22h-6.7l-5.2-6.8L5.6 22H2.3l7.8-8.9L1.9 2h6.8l4.7 6.2L18.9 2Zm-1.2 17.9h1.8L7.7 4H5.8l11.9 15.9Z"
      />
    </svg>
  );
}

export function PageFooter() {
  return (
    <footer className="page-grid page-footer">
      <div className="page-footer-panel">
        <div className="page-footer-signoff">
          <strong>Making computer work simpler.</strong>
        </div>
        <div className="page-footer-meta">
          <span className="footer-location">
            <Navigation size={14} strokeWidth={1.9} />
            <span>Manchester</span>
          </span>
          <nav className="page-footer-details" aria-label="Elsewhere and contact">
            <a
              href="https://x.com/dakibwa"
              target="_blank"
              rel="noreferrer"
              aria-label="dakibwa on X"
              style={{ "--handle-accent": "#0f1114" }}
            >
              <XLogo />
              <span>dakibwa</span>
            </a>
            <a
              href="https://www.instagram.com/dakibwa"
              target="_blank"
              rel="noreferrer"
              aria-label="dakibwa on Instagram"
              style={{ "--handle-accent": "#d63a7a" }}
            >
              <Instagram size={14} strokeWidth={1.8} />
              <span>dakibwa</span>
            </a>
            <a
              href="mailto:***REMOVED***"
              aria-label="Email ***REMOVED***"
              style={{ "--handle-accent": "#2f88ff" }}
            >
              <Mail size={14} strokeWidth={1.8} />
              <span>Email me</span>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
