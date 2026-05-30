import Link from "next/link";
import { Instagram, Mail, X } from "lucide-react";

export function PageFooter() {
  return (
    <footer className="page-grid page-footer">
      <div>
        <i />
        <span>Build small systems. Create clarity. Compound value.</span>
      </div>
      <div>
        <span>Manchester, UK</span>
        <i />
        <a href="https://x.com/dakibwa" target="_blank" rel="noreferrer" aria-label="dakibwa on X">
          <X size={14} strokeWidth={1.8} />
          <span>dakibwa</span>
        </a>
        <a href="https://www.instagram.com/dakibwa" target="_blank" rel="noreferrer" aria-label="dakibwa on Instagram">
          <Instagram size={14} strokeWidth={1.8} />
          <span>dakibwa</span>
        </a>
        <a href="mailto:***REMOVED***" aria-label="Email ***REMOVED***">
          <Mail size={14} strokeWidth={1.8} />
          <span>***REMOVED***</span>
        </a>
      </div>
    </footer>
  );
}
