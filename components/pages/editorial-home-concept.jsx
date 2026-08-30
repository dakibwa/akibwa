import { deck, sites } from "@/components/deck-data";
import { HeroFlipName } from "@/components/hero-word-cycle";
import { HomePage } from "@/components/pages/home-page";
import { SiteImage } from "@/components/site-image";

const clientNames = ["Butterfly Rose", "Português com a Inês"];
const clientProjects = clientNames
  .map((name) => sites.find((site) => site.name === name))
  .filter(Boolean);

/* This is the same five-stop professional timeline the previous About page
   used, now backed by the fuller career copy already held in the wall data. */
const careerNames = [
  "National Wealth Fund",
  "Leeds Building Society",
  "Sky Betting & Gaming",
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
        <p className="concept-lede">
          I’m moving into freelance work, building useful apps and practical data and AI systems.
        </p>
        <nav className="concept-nav" aria-label="On this page">
          <a href="#now">Now</a>
          <a href="#work">Work</a>
          <a href="#career">Career</a>
          <a href="#archive">Archive</a>
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
            src="/features/og.png"
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

        <article className="concept-freelance" id="now">
          <p className="concept-kicker">Going independent</p>
          <h2>Building the whole thing.</h2>
          <p>
            Sites, booking systems, games, data pipelines and AI tools — from the first rough idea
            to the live product.
          </p>

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
                  <span>
                    <small>Live client work</small>
                    <strong>{project.name}</strong>
                  </span>
                  <span className="concept-arrow" aria-hidden="true">↗</span>
                </span>
              </a>
            ))}
          </div>

          <a className="concept-text-link" href="mailto:***REMOVED***">
            Talk about a project <span aria-hidden="true">↗</span>
          </a>
        </article>
      </section>

      <section className="page-grid concept-career-section" id="career" aria-labelledby="career-title">
        <header className="concept-career-head">
          <div>
            <p className="concept-kicker">Career, compressed</p>
            <h2 id="career-title">From credit risk to data platforms.</h2>
          </div>
          <p>
            I’ve spent my career turning complex data into systems people can use — from credit
            risk and BI leadership to building the National Wealth Fund’s data environment.
          </p>
        </header>

        <ol className="concept-career-timeline">
          {career.map((job) => (
            <li
              className="concept-career-stop"
              key={job.name}
              style={{ "--company-accent": job.accent }}
              tabIndex={0}
            >
              <span className="concept-career-time">{job.span}</span>
              <span className="concept-career-node" aria-hidden="true" />
              <div className="concept-career-card">
                <div className="concept-career-summary">
                  <span className={`concept-career-logo${job.tile ? " is-tile" : ""}`} aria-hidden="true">
                    <SiteImage src={job.logo} slot="logo" sizes="28px" alt="" />
                  </span>
                  <strong>{job.name}</strong>
                  <span>{job.role}</span>
                </div>
                <p className="concept-career-note">{job.back}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="concept-archive" id="archive" aria-labelledby="archive-title">
        <div className="page-grid concept-taste-head">
          <article className="concept-graceland">
            <SiteImage
              src="/music-art/graceland.webp"
              slot="grandTile"
              sizes="(max-width: 560px) 116px, (max-width: 980px) 220px, 280px"
              alt="Paul Simon — Graceland album cover"
            />
            <div>
              <p className="concept-kicker">The record at the front</p>
              <h2>Graceland</h2>
              <p className="concept-meta-line">Paul Simon · 1986</p>
              <p>
                The record that sits above the rest of the archive. It gets room for a proper story
                here, rather than being reduced to another cover and play count.
              </p>
            </div>
          </article>

          <header className="concept-archive-head">
            <p className="concept-kicker">Taste</p>
            <h2 id="archive-title">The things I keep coming back to.</h2>
            <p>Music, films, games and television — collected here when somebody wants the full picture.</p>
          </header>
        </div>

        <div className="concept-archive-wall">
          <HomePage tasteOnly />
        </div>
      </section>
    </div>
  );
}
