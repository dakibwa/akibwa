import { deck } from "@/components/deck-data";
import { HeroFlipName } from "@/components/hero-word-cycle";
import { HomePage } from "@/components/pages/home-page";
import { SiteImage } from "@/components/site-image";

/* Keep the whole working history in sequence, including the two stretches on
   the tools between office roles. Details stay inside the compact interaction
   so Career keeps the original horizontal rhythm. */
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

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function CareerStatement({ statement, emphasis }) {
  if (!emphasis?.length) return statement;

  const terms = new Set(emphasis);
  const matcher = new RegExp(`(${emphasis.map(escapeRegExp).join("|")})`, "g");

  return statement.split(matcher).map((part, index) =>
    terms.has(part) ? <strong key={`${part}-${index}`}>{part}</strong> : part
  );
}

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

      <section className="page-grid concept-projects" id="projects" aria-label="Projects">
        <div className="concept-project-grid">
          <a
            className="concept-project-card concept-feature"
            id="work"
            href="/features/?from=akibwa"
            aria-label="Play Features, the daily untangling puzzle"
          >
            <SiteImage
              src="/features/home-card-bright-v4.png"
              slot="conceptProject"
              alt="A bright Features puzzle board with five sweeping tangled threads, crossings, neurons, the Features wordmark and a vertical column of five feature symbols"
              above
              aboveSync
            />
            <span className="concept-project-foot">
              <span className="concept-project-label">
                <strong>features</strong>
                <span>daily untangling puzzle</span>
              </span>
            </span>
          </a>

          <a
            className="concept-project-card concept-portuguese"
            href="https://portuguesewithines.com/?from=akibwa"
            aria-label="Visit Português com a Inês, European Portuguese lessons in Porto and online"
          >
            <SiteImage
              src="/project-art/personal/portuguese-with-ines-conversation.png"
              slot="conceptProject"
              alt="Two people talking over coffee as colourful speech shapes meet between them"
              above
              aboveSync
            />
            <span className="concept-project-foot">
              <span className="concept-project-label">
                <strong>Português com a Inês</strong>
                <span>European Portuguese lessons</span>
              </span>
            </span>
          </a>

          <a
            className="concept-project-card concept-trek"
            href="/trek/?from=akibwa"
            aria-label="Explore The Trek, 1,982 kilometres on foot from Paris to Sofia"
          >
            <SiteImage
              src="/project-art/personal/trek-paris-sofia-project.png"
              slot="conceptProject"
              alt="An illustrated seven-colour walking route crossing faceted European terrain, with a lone walker at its centre"
            />
            <span className="concept-project-foot">
              <span className="concept-project-label">
                <strong>The Trek</strong>
                <span>Paris → Sofia · 1,982 km</span>
              </span>
            </span>
          </a>
        </div>
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
              aria-label={`${job.name}, ${job.role}, ${job.span}. ${job.statement}`}
            >
              <span className="concept-career-node" aria-hidden="true" />
              <div className="concept-career-card">
                <span
                  className={`concept-career-logo${job.tile ? " is-tile" : ""}${job.logo === "/favicon.svg" ? " is-akibwa" : ""}${job.logo === "/brand-logos/national-wealth-fund-icon.png" ? " is-nwf" : ""}${job.logo === "/brand-logos/lloyds-horse-icon.png" ? " is-lloyds" : ""}`}
                  aria-hidden="true"
                >
                  {job.logo ? <SiteImage src={job.logo} slot="logo" sizes="32px" alt="" /> : null}
                </span>
              </div>
              <div className="concept-career-popover" aria-hidden="true">
                <strong>{job.name}</strong>
                <span>{job.role} · {job.span}</span>
                <p className="concept-career-statement">
                  <CareerStatement statement={job.statement} emphasis={job.emphasis} />
                </p>
              </div>
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
