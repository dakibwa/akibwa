import { Navigation } from "lucide-react";

export function PageFooter() {
  return (
    <footer className="page-grid page-footer">
      <div className="page-footer-panel">
        <div className="page-footer-signoff">
          <strong>Making computer work simpler.</strong>
          <span className="footer-location">
            <Navigation size={14} strokeWidth={1.9} />
            <span>Manchester, UK</span>
          </span>
        </div>
        <nav className="page-footer-details" aria-label="Elsewhere and contact">
          <a href="https://x.com/dakibwa" target="_blank" rel="noreferrer" aria-label="@dakibwa on X">
            <span>X · @dakibwa</span>
          </a>
          <a
            href="https://www.instagram.com/dakibwa"
            target="_blank"
            rel="noreferrer"
            aria-label="@dakibwa on Instagram"
          >
            <span>Instagram · @dakibwa</span>
          </a>
          <a href="mailto:***REMOVED***" aria-label="Email ***REMOVED***">
            <span>Email me</span>
          </a>
        </nav>
      </div>
    </footer>
  );
}
