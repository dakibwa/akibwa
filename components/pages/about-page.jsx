import Link from "next/link";
import { ArrowRight, Database } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const workplaces = [
  {
    year: "2024",
    name: "National Wealth Fund",
    role: "Senior BI Developer",
    logo: "/brand-logos/national-wealth-fund-icon.png"
  },
  {
    year: "2023",
    name: "Leeds Building Society",
    role: "BI Team Lead / BI Analyst",
    logo: "/brand-logos/leeds-building-society-icon.svg"
  },
  {
    year: "2020",
    name: "Sky Betting & Gaming",
    role: "Business Intelligence Analyst",
    logo: "/brand-logos/sky-betting-gaming-logo.png",
    logoVariant: "tile"
  },
  {
    year: "2018",
    name: "Vanquis Bank",
    role: "Strategic Insight Analyst",
    logo: "/brand-logos/vanquis-icon.svg"
  },
  {
    year: "2016",
    name: "Lloyds Banking Group",
    role: "Credit Risk Analyst",
    logo: "/brand-logos/lloyds-horse-icon.png"
  }
];

const toolGroups = [
  {
    label: "Data & reporting",
    tools: [
      { name: "Microsoft Fabric", note: "Pipelines and lakehouse reporting", logo: "/brand-logos/microsoft-fabric.svg" },
      { name: "Power BI", note: "Dashboards people decide from", logo: "/brand-logos/power-bi.svg" },
      { name: "SQL", note: "The query layer under everything", Icon: Database }
    ]
  },
  {
    label: "AI build loops",
    tools: [
      { name: "Claude Code", note: "The daily agentic build loop", logo: "/brand-logos/claude.svg" },
      { name: "OpenAI Codex", note: "Parallel build lanes", logo: "/brand-logos/openai-codex-app.png" },
      { name: "Copilot", note: "Completion inside the editor", logo: "/brand-logos/microsoft-copilot.svg" }
    ]
  },
  {
    label: "Modelling & automation",
    tools: [
      { name: "Data modelling", note: "Semantic models that hold up", logo: "/brand-logos/data-modeling.svg" },
      { name: "Python", note: "Glue for automation and analysis", logo: "/brand-logos/python.svg" }
    ]
  }
];

const interests = [
  {
    name: "Film",
    note: "Art-house, odd, logged on Letterboxd."
  },
  {
    name: "Music",
    note: "Restless taste; every listen tracked."
  },
  {
    name: "Nutrition & running",
    note: "Testing what makes the body run better."
  },
  {
    name: "AI & the singularity",
    note: "Daily build loop; long-arc questions."
  },
  {
    name: "A good long conversation",
    note: "The kind that actually goes somewhere."
  }
];

export function AboutPage() {
  return (
    <section className="studio-page about-page">
      {/* The meadow paints the LCP intro card as a CSS background, which the
          browser discovers late; preloading it pulls the paint forward. */}
      <link rel="preload" as="image" href="/about-mountain-meadow.webp" />
      <section className="page-grid about-hero" aria-label="Profile">
        <div className="about-hero-copy">
          <h1>Ten years turning messy data into clear decisions.</h1>
          <p className="about-hero-sub">
            Now building small, AI-assisted systems for reporting, workflow, and the knowledge teams rely on.
          </p>
        </div>

        <figure className="about-portrait about-portrait--hero" aria-label="Portrait of Daniel smiling">
          <img src="/about-portrait-smiling.webp" alt="Portrait of Daniel smiling" />
        </figure>
      </section>

      <section className="page-grid about-brief" aria-label="Background">
        <section className="about-hero-intro" aria-labelledby="who-heading">
          <header className="about-section-head">
            <h2 id="who-heading">A little bit about me</h2>
            <p>The part a job title doesn't cover.</p>
          </header>
          <p className="about-statement">
            I'm happiest turning messy reality into something that works — and I do that to my own life as much
            as my work. I track most things, follow the odd obsession all the way down, and I'm always quietly
            trying to become a slightly more alive version of myself. Curiosity is the engine; the running joke
            is that I'll try to optimise five things at once.
          </p>
          <Link className="about-cta about-hero-cta" href="/professional">
            <span className="about-cta-label">See professional work</span>
            <span className="about-cta-icon" aria-hidden="true">
              <ArrowRight size={17} strokeWidth={2} />
            </span>
          </Link>
        </section>

        <aside className="about-cv" aria-labelledby="cv-heading">
          <h2 className="about-cv-label" id="cv-heading">Where I've worked</h2>
          <ol className="work-timeline">
            {workplaces.map((workplace) => (
              <li className="work-row" key={workplace.name}>
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
      </section>

      <section className="page-grid about-section about-toolkit" aria-labelledby="tools-heading">
        <header className="about-section-head">
          <h2 id="tools-heading">Current toolkit</h2>
          <p>Data tools, automation, and local agentic build loops for turning rough material into working systems.</p>
        </header>

        <div className="toolkit-groups">
          {toolGroups.map((group) => (
            <div className="toolkit-group" key={group.label}>
              <h3 className="toolkit-label">{group.label}</h3>
              <ul className="toolkit-list">
                {group.tools.map((tool) => (
                  <li className="toolkit-item" key={tool.name}>
                    {tool.logo ? (
                      <img className="toolkit-logo" src={tool.logo} alt="" aria-hidden="true" />
                    ) : tool.Icon ? (
                      <tool.Icon className="toolkit-logo toolkit-icon" size={22} strokeWidth={2.1} aria-hidden="true" />
                    ) : (
                      <span className="toolkit-dot" aria-hidden="true" />
                    )}
                    <span className="toolkit-item-text">
                      <strong>{tool.name}</strong>
                      <em>{tool.note}</em>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="page-grid about-section page-art-break" aria-label="Landscape artwork">
        <figure>
          <img src="/about-mountain-meadow.webp" alt="Sunlit mountain meadow with a layered data texture" />
        </figure>
      </section>

      <section className="page-grid about-section about-interests" aria-labelledby="interests-heading">
        <header className="about-section-head">
          <h2 id="interests-heading">Outside the work</h2>
          <p>A few things I read, track, and argue about when I'm not building.</p>
        </header>

        <ul className="interest-grid">
          {interests.map((interest) => (
            <li key={interest.name}>
              <h3>{interest.name}</h3>
              <p>{interest.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <PageFooter />
    </section>
  );
}
