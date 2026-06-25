import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const workplaces = [
  {
    year: "2024",
    name: "National Wealth Fund",
    role: "Senior BI Developer",
    accent: "#17324d",
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
    logo: "/brand-logos/sky-bet.svg",
    logoVariant: "wide"
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

const toolGroups = [
  {
    label: "Data & reporting",
    tools: [
      { name: "Microsoft Fabric", accent: "#2f88ff", logo: "/brand-logos/microsoft-fabric.svg" },
      { name: "Power BI", accent: "#f2c811", logo: "/brand-logos/power-bi.svg" },
      { name: "SQL", accent: "#7d9a92" }
    ]
  },
  {
    label: "AI build loops",
    tools: [
      { name: "Claude Code", accent: "#c96f3c", logo: "/brand-logos/claude.svg" },
      { name: "OpenAI Codex", accent: "#12b981", logo: "/brand-logos/openai-codex-app.png" },
      { name: "Copilot", accent: "#557f8d", logo: "/brand-logos/microsoft-copilot.svg" }
    ]
  },
  {
    label: "Modelling & automation",
    tools: [
      { name: "Data modelling", accent: "#ff6f1a", logo: "/brand-logos/data-modeling.svg" },
      { name: "Python", accent: "#3776ab", logo: "/brand-logos/python.svg" }
    ]
  }
];

const interests = [
  {
    name: "AI & the singularity",
    note: "I build with it daily and can't stop thinking about the long arc — where this ends up, and how we get there well.",
    accent: "#2f88ff"
  },
  {
    name: "Film",
    note: "Art-house and the slightly strange. Yes, it all gets logged on Letterboxd.",
    accent: "#ff6f1a"
  },
  {
    name: "Music",
    note: "Wide, restless taste, every listen tracked — that habit is what became Chorus.",
    accent: "#d01fcb"
  },
  {
    name: "Nutrition & running",
    note: "Working out what actually makes the body run better, usually tested on myself.",
    accent: "#12b981"
  },
  {
    name: "A good long conversation",
    note: "The real kind that goes somewhere. Probably my favourite thing.",
    accent: "#557f8d"
  }
];

export function AboutPage() {
  return (
    <section className="studio-page about-page">
      <section className="page-grid about-hero" aria-label="Profile">
        <div className="about-hero-copy">
          <h1>Ten years turning messy data into clear decisions.</h1>
          <p className="about-hero-sub">
            Now building small, AI-assisted systems for reporting, workflow, and the knowledge teams rely on.
          </p>
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
          </section>
        </div>

        <aside className="about-hero-side">
          <figure className="about-portrait about-portrait--hero" aria-label="Portrait of Daniel smiling">
            <img src="/about-portrait-smiling.webp" alt="Portrait of Daniel smiling" />
            <span className="about-portrait-orbit" aria-hidden="true" />
            <span className="about-portrait-point" aria-hidden="true" />
          </figure>

          <div className="about-cv">
            <p className="about-cv-label">Where I've worked</p>
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
          </div>
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
                  <li className="toolkit-item" key={tool.name} style={{ "--tool-accent": tool.accent }}>
                    {tool.logo ? (
                      <img className="toolkit-logo" src={tool.logo} alt="" aria-hidden="true" />
                    ) : (
                      <span className="toolkit-dot" aria-hidden="true" />
                    )}
                    <span>{tool.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="page-grid about-section about-interests" aria-labelledby="interests-heading">
        <header className="about-section-head">
          <h2 id="interests-heading">Outside the work</h2>
          <p>A few things I read, track, and argue about when I'm not building.</p>
        </header>

        <ul className="interest-grid">
          {interests.map((interest) => (
            <li key={interest.name} style={{ "--interest-accent": interest.accent }}>
              <h3>{interest.name}</h3>
              <p>{interest.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="page-grid about-section about-professional-bridge"
        aria-labelledby="professional-bridge-heading"
      >
        <div>
          <h2 id="professional-bridge-heading">
            For the{" "}
            <Link className="about-professional-link" href="/professional">
              work version
            </Link>, start here.
          </h2>
        </div>
        <Link className="about-cta" href="/professional">
          <span className="about-cta-label">Professional</span>
          <span className="about-cta-icon" aria-hidden="true">
            <ArrowRight size={17} strokeWidth={2} />
          </span>
        </Link>
      </section>

      <PageFooter />
    </section>
  );
}
