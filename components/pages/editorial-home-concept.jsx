import { deck, sites } from "@/components/deck-data";
import { HomePage } from "@/components/pages/home-page";
import { SiteImage } from "@/components/site-image";

const clientNames = ["Butterfly Rose", "Português com a Inês"];
const clientProjects = clientNames
  .map((name) => sites.find((site) => site.name === name))
  .filter(Boolean);

/* Keep the whole working history in sequence, including the two stretches on
   the tools between office roles. The fuller copy stays behind interaction. */
const careerNames = [
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
          I’m{" "}
          <span className="hero-name" style={{ "--name-accent-rgb": "235, 92, 8" }}>
            <span className="hero-name-stack">
              <span className="hero-name-value">Akibwa</span>
            </span>
          </span>
        </h1>
        <p className="concept-lede">
          Building in the age of AI.
        </p>
        <nav className="concept-nav" aria-label="On this page">
          <a href="#now">Now</a>
          <a href="#work">Work</a>
          <a href="#career">Career</a>
          <a href="#taste">Taste</a>
        </nav>
      </header>

      <section className="page-grid concept-lead-grid" aria-label="Current work">
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
          <h2 id="clients-title">Clients</h2>

          <div className="concept-client-projects" aria-label="Current client projects">
            {clientProjects.map((project) => (
              <a
                className="concept-client-card"
                key={project.name}
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SiteImage
                  src={project.art}
                  slot="deckTile"
                  sizes="(max-width: 560px) calc(50vw - 24px), 170px"
                  alt=""
                  above
                />
                <span className="concept-client-card-foot">
                  <strong>{project.name}</strong>
                  <span className="concept-arrow" aria-hidden="true">↗</span>
                </span>
              </a>
            ))}
          </div>

        </article>
      </section>

      <section className="page-grid concept-career-section" id="career" aria-labelledby="career-title">
        <header className="concept-career-head">
          <h2 id="career-title">Career</h2>
        </header>

        <ol
          className="concept-career-timeline"
          style={{ "--career-count": career.length }}
        >
          {career.map((job) => (
            <li
              className="concept-career-stop"
              key={job.name}
              style={{ "--company-accent": job.accent }}
              tabIndex={0}
              aria-label={`${job.name}, ${job.role}, ${job.span}. ${job.back}`}
            >
              <span className="concept-career-time">{job.span}</span>
              <span className="concept-career-node" aria-hidden="true" />
              <div className="concept-career-card">
                <span className={`concept-career-logo${job.tile ? " is-tile" : ""}`} aria-hidden="true">
                  <SiteImage src={job.logo} slot="logo" sizes="32px" alt="" />
                </span>
              </div>
              <div className="concept-career-popover" aria-hidden="true">
                <strong>{job.name}</strong>
                <span>{job.role}</span>
                <p>{job.back}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="concept-archive" id="taste" aria-labelledby="taste-title">
        <div className="page-grid concept-taste-head">
          <header className="concept-archive-head">
            <h2 id="taste-title">Taste</h2>
          </header>
        </div>

        <div className="concept-archive-wall">
          <HomePage tasteOnly />
        </div>
      </section>
    </div>
  );
}
