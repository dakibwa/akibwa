import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { PageFooter } from "@/components/page-footer";
import { personalProjects } from "@/components/site-data";

function PersonalProjectCard({ project, priority }) {
  const cardContents = (
    <>
      <header>
        <span>{project.number}</span>
        <div>
          <h3>{project.title}</h3>
          <p>{project.type}</p>
        </div>
      </header>
      <Image
        src={project.image}
        alt={project.alt}
        width={620}
        height={380}
        priority={priority}
        sizes="(max-width: 760px) 100vw, (max-width: 1060px) 50vw, 25vw"
      />
      <div className="personal-card-body">
        <p>{project.summary}</p>
        <div className="personal-card-tags" aria-label={`${project.title} tags`}>
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <footer>
        <span>{project.cta}</span>
        {project.href || project.externalHref ? (
          <ArrowRight size={18} strokeWidth={1.8} />
        ) : (
          <LockKeyhole size={17} strokeWidth={1.7} />
        )}
      </footer>
    </>
  );

  const className = "studio-card work-card personal-project-card";

  if (project.href) {
    return (
      <Link href={project.href} prefetch id={project.slug} className={className}>
        {cardContents}
      </Link>
    );
  }

  if (project.externalHref) {
    return (
      <a
        href={project.externalHref}
        id={project.slug}
        className={className}
        target="_blank"
        rel="noreferrer"
      >
        {cardContents}
      </a>
    );
  }

  return (
    <article id={project.slug} className={`${className} is-private`}>
      {cardContents}
    </article>
  );
}

export function PersonalPage() {
  return (
    <section className="studio-page personal-page">
      <section className="page-grid studio-hero personal-hero">
        <h1>Personal</h1>
        <p>Projects I build for myself, from health and music to taste experiments and private memory.</p>
      </section>

      <section className="page-grid work-board personal-board" aria-labelledby="personal-projects-title">
        <h2 id="personal-projects-title">Personal projects</h2>
        <div className="work-card-grid personal-project-grid">
          {personalProjects.map((project, index) => (
            <PersonalProjectCard project={project} priority={index < 2} key={project.slug} />
          ))}
        </div>
      </section>

      <PageFooter />
    </section>
  );
}
