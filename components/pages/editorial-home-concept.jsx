import { deck, sites } from "@/components/deck-data";
import { ClientSitePreviews } from "@/components/client-site-previews";
import { HeroFlipName } from "@/components/hero-word-cycle";
import { HomePage } from "@/components/pages/home-page";
import { SiteImage } from "@/components/site-image";

const clientNames = ["Butterfly Rose", "Português com a Inês"];
const clientPresentation = {
  "Butterfly Rose": {
    preview: "/project-art/client-sites/butterfly-rose-redesign-home.jpg",
    markTreatment: "is-full-bleed",
    /* The redesign is not public yet. Keep its preview inside Akibwa rather
       than sending people to the salon's older live site. */
    href: null,
    summary: "A new website for an independent hair salon in [place removed]."
  },
  "Português com a Inês": {
    preview: "/project-art/client-sites/portuguese-with-ines-home.jpg",
    markTreatment: "is-contained",
    summary: "A hand-built home for European Portuguese lessons in Porto and online."
  }
};
const clientProjects = clientNames
  .map((name) => sites.find((site) => site.name === name))
  .filter(Boolean)
  .map((site) => ({
    ...site,
    ...clientPresentation[site.name]
  }));

/* Keep the whole working history in sequence, including the two stretches on
   the tools between office roles. Each stop says what Dan did and what the
   organisation exists to do, so career context never depends on hover. */
const careerNames = [
  "Freelance",
  "National Wealth Fund",
  "Leeds Building Society",
  "Electrical Work",
  "Sky Betting & Gaming",
  "Joinery Work",
  "Vanquis Bank",
  "Lloyds Banking Group"
];
const career = careerNames
  .map((name) => deck.jobs.find((job) => job.name === name))
  .filter(Boolean);

export function EditorialHomeConcept() {
  return (
    <div className="concept-page">
      <header className="page-grid concept-hero">
        <h1 className="concept-identity">
          <HeroFlipName />
        </h1>
        <div className="concept-hero-copy">
          <p className="concept-lede">
            Building in the age of AI.
          </p>
          <nav className="concept-nav" aria-label="On this page">
            <a href="#projects">Projects</a>
            <a href="#career">Career</a>
            <a href="#taste">Taste Library</a>
          </nav>
        </div>
      </header>

      <section className="page-grid concept-lead-grid" id="projects" aria-label="Projects">
        <a
          className="concept-feature"
          id="work"
          href="/features/"
          aria-label="Play Features, the daily untangling puzzle"
        >
          <SiteImage
            src="/features/features-game-light-og-1200x630.png"
            slot="conceptFeature"
            width={1200}
            height={630}
            alt="Features daily puzzle: coloured threads woven through a neural network"
            above
            aboveSync
          />
          <span className="concept-feature-foot">
            <span>
              <strong>features</strong>
              <span>daily untangling puzzle</span>
            </span>
            <span className="concept-arrow">play today ↗</span>
          </span>
        </a>

        <article className="concept-freelance" id="now" aria-labelledby="clients-title">
          <h2 id="clients-title">Client work</h2>

          <ClientSitePreviews projects={clientProjects} />

        </article>
      </section>

      <section className="page-grid concept-career-section" id="career" aria-labelledby="career-title">
        <header className="concept-career-head">
          <h2 id="career-title">Career</h2>
        </header>

        <ol className="concept-career-timeline">
          {career.map((job) => (
            <li
              className="concept-career-stop"
              key={job.name}
              style={{ "--company-accent": job.accent }}
            >
              <time className="concept-career-time">{job.span}</time>
              <span className="concept-career-node" aria-hidden="true" />
              <div className="concept-career-identity">
                <span
                  className={`concept-career-logo${job.tile ? " is-tile" : ""}${job.logo === "/favicon.svg" ? " is-akibwa" : ""}`}
                  aria-hidden="true"
                >
                  <SiteImage src={job.logo} slot="logo" sizes="32px" alt="" />
                </span>
                <span className="concept-career-name">
                  <strong>{job.name}</strong>
                  <span>{job.role}</span>
                </span>
              </div>
              <p className="concept-career-copy">
                <span className="concept-career-label">What I did</span>
                <span>{job.back}</span>
              </p>
              <p className="concept-career-copy concept-career-mission">
                <span className="concept-career-label">Mission</span>
                <span>{job.mission}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="concept-archive" id="taste" aria-labelledby="taste-title">
        <div className="page-grid concept-taste-head">
          <header className="concept-archive-head">
            <h2 id="taste-title">Taste Library</h2>
          </header>
        </div>

        <div className="concept-archive-wall">
          <HomePage tasteOnly />
        </div>
      </section>
    </div>
  );
}
