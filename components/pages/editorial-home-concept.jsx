import { HeroFlipName } from "@/components/hero-word-cycle";
import { HomePage } from "@/components/pages/home-page";
import { SiteImage } from "@/components/site-image";

const currentWork = [
  {
    number: "01",
    name: "One Bagger",
    state: "Building",
    copy: "A local-first trip planner that proves the packing constraint, compares the gear and remembers what actually earned its place."
  },
  {
    number: "02",
    name: "The Fell Pilgrim",
    state: "Building",
    copy: "A hooded runner loose on an endless procedural Yorkshire Dales — every mesh, animation and sound generated in code."
  },
  {
    number: "03",
    name: "Client systems",
    state: "Live",
    copy: "Websites and booking systems that account for how the real businesses work, not the simplified version a template expects.",
    links: [
      { label: "Português com a Inês", href: "https://portuguesewithines.com/" },
      { label: "Butterfly Rose", href: "https://www.butterflyrosehairsalon.co.uk/" }
    ]
  }
];

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
          <a className="concept-text-link" href="mailto:***REMOVED***">
            Talk about a project <span aria-hidden="true">↗</span>
          </a>
        </article>
      </section>

      <section className="page-grid concept-making" aria-labelledby="making-title">
        <header className="concept-section-head">
          <h2 id="making-title">Also making</h2>
        </header>
        <div className="concept-making-list">
          {currentWork.map((item) => (
            <article className="concept-making-item" key={item.name}>
              <div className="concept-making-meta">
                <span>{item.number}</span>
                <span>{item.state}</span>
              </div>
              <h3>{item.name}</h3>
              <p>{item.copy}</p>
              {item.links ? (
                <div className="concept-inline-links">
                  {item.links.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="page-grid concept-story-grid" aria-label="Personal and professional context">
        <article className="concept-graceland">
          <SiteImage
            src="/music-art/graceland.webp"
            slot="grandTile"
            sizes="(max-width: 560px) 116px, (max-width: 980px) 220px, 300px"
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

        <article className="concept-career" id="career">
          <p className="concept-kicker">Career, compressed</p>
          <h2>From credit risk to data platforms.</h2>
          <p>
            I’ve spent my career turning complex data into systems people can use — from credit
            risk and BI leadership to building the National Wealth Fund’s data environment. Now
            I’m taking that experience freelance.
          </p>
          <a className="concept-text-link" href="#archive">
            Full history in the archive <span aria-hidden="true">↓</span>
          </a>
        </article>
      </section>

      <section className="concept-archive" id="archive" aria-labelledby="archive-title">
        <header className="page-grid concept-archive-head">
          <p className="concept-kicker">The complete record</p>
          <h2 id="archive-title">Everything is still here.</h2>
          <p>
            Every project, job, record, film, game and series — available when somebody wants the
            detail, without asking the archive to introduce me.
          </p>
        </header>
        <div className="concept-archive-wall">
          <HomePage />
        </div>
      </section>
    </div>
  );
}
