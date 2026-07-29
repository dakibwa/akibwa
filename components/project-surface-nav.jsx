import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ProjectSurfaceNav({ title }) {
  return (
    <nav className="project-surface-nav" aria-label={`${title} navigation`}>
      <Link href="/projects" className="project-surface-back">
        <ArrowLeft size={16} strokeWidth={1.9} />
        <span>Personal</span>
      </Link>
      <Link href="/" className="project-surface-brand">
        AKIBWA
      </Link>
      <span className="project-surface-title">{title}</span>
    </nav>
  );
}
