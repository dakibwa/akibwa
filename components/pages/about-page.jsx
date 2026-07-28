import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const workplaces = [
  {
    year: "2024",
    name: "National Wealth Fund",
    role: "Senior BI Developer",
    accent: "#732740",
    logo: "/brand-logos/national-wealth-fund-icon.png"
  },
  {
    year: "2023",
    name: "Leeds Building Society",
    role: "BI Team Lead / BI Analyst",
    accent: "#2f88ff",
    logo: "/brand-logos/leeds-building-society-icon.svg"
  },
  {
    year: "2020",
    name: "Sky Betting & Gaming",
    role: "Business Intelligence Analyst",
    accent: "#d01fcb",
    logo: "/brand-logos/sky-betting-gaming-logo.png",
    logoVariant: "tile"
  },
  {
    year: "2018",
    name: "Vanquis Bank",
    role: "Strategic Insight Analyst",
    accent: "#f15a24",
    logo: "/brand-logos/vanquis-icon.svg"
  },
  {
    year: "2016",
    name: "Lloyds Banking Group",
    role: "Credit Risk Analyst",
    accent: "#006747",
    logo: "/brand-logos/lloyds-horse-icon.png"
  }
];

export function AboutPage() {
  return (
    <section className="studio-page about-page">
      {/* The meadow paints the LCP intro card as a CSS background, which the
          browser discovers late; preloading it pulls the paint forward. */}
      <link rel="preload" as="image" href="/about-mountain-meadow.webp" />
      <section className="page-grid about-profile" aria-label="Profile">
        <div className="about-profile-main">
          <div className="about-hero-copy">
            <h1>I make computers do the work people are doing by hand.</h1>
            <p className="about-hero-sub">
              Ten years of it inside banks and building societies. Now for anyone who asks.
            </p>
          </div>

          <section className="about-hero-intro" aria-labelledby="who-heading">
            <header className="about-section-head">
              <h2 id="who-heading">A little bit about me</h2>
              <p>The part a job title doesn't cover.</p>
            </header>
            <p className="about-statement">
              I'm happiest turning messy reality into something that works — at home as much as at work.
              I track most things and follow the odd obsession all the way down: a film log, a running
              experiment, a half-built tool, a conversation that runs three hours past where it should.
              The running joke is that I'll optimise five things at once.
            </p>
          </section>
        </div>

        <div className="about-profile-side">
          <figure className="about-portrait about-portrait--hero" aria-label="Portrait of Daniel smiling">
            <img src="/about-portrait-smiling.webp" alt="Portrait of Daniel smiling" />
          </figure>

          <aside className="about-cv" aria-labelledby="cv-heading">
            <h2 className="about-cv-label" id="cv-heading">Where I've worked</h2>
            <ol className="work-timeline">
              {workplaces.map((workplace) => (
                <li className="work-row" key={workplace.name} style={{ "--company-accent": workplace.accent }}>
                  <span className="work-year">{workplace.year}</span>
                  <span className="work-node" aria-hidden="true" />
                  <span className="work-detail">
                    <span className="work-company">
                      <span className={`work-logo ${workplace.logoVariant ? `work-logo--${workplace.logoVariant}` : ""}`} aria-hidden="true">
                        {workplace.logo ? <img src={workplace.logo} alt="" /> : <span className="work-dot" />}
                      </span>
                      <strong>{workplace.name}</strong>
                    </span>
                    <span className="work-role">{workplace.role}</span>
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="page-grid art-split" aria-label="Working together">
        <div className="page-art-panel" style={{ "--page-art-position": "50% 42%" }} aria-hidden="true">
          <img
            src="/area-art/about-meadow-flowers.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </div>
        <div className="art-split-copy">
          <p>
            None of that matters much on its own. What matters is whether the thing
            you're stuck on gets easier — so tell me what it is, and I'll tell you
            straight whether I can help.
          </p>
          <Link className="about-cta" href="/contact">
            <span className="about-cta-label">Tell me what&apos;s annoying you</span>
            <span className="about-cta-icon" aria-hidden="true">
              <ArrowRight size={17} strokeWidth={2} />
            </span>
          </Link>
        </div>
      </section>

      <PageFooter />
    </section>
  );
}
