import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const identity = [
  { label: "Who", value: "Daniel · BI specialist" },
  { label: "Based", value: "Manchester, UK" },
  { label: "Sectors", value: "Banking · Gaming · Public investment" },
  { label: "Now", value: "AI build loops at Akibwa" }
];

const proofPoints = [
  {
    lead: "Ten years in BI",
    tail: "Banking, credit, gaming, and public-investment reporting."
  },
  {
    lead: "Source to system",
    tail: "Messy material, semantic models, dashboards, and AI build loops."
  },
  {
    lead: "Built to keep",
    tail: "Systems people keep using — not demos that need the builder in the room."
  }
];

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
    accent: "#d01fcb"
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
    note: "Building with it every day — and paying close attention to where it all goes.",
    accent: "#2f88ff"
  },
  {
    name: "Nutrition",
    note: "What actually moves the needle, measured honestly rather than guessed at.",
    accent: "#12b981"
  },
  {
    name: "Music",
    note: "Listening as data — the obsession behind Chorus.",
    accent: "#d01fcb"
  },
  {
    name: "Film",
    note: "Story and craft, with the occasional very deep dive.",
    accent: "#ff6f1a"
  }
];

export function AboutPage() {
  return (
    <section className="studio-page about-page">
      <section className="page-grid about-hero" aria-label="Profile">
        <div className="about-hero-copy">
          <p className="about-eyebrow">About</p>
          <h1>Ten years turning messy data into clear decisions.</h1>
          <p className="about-hero-sub">
            Now building small, AI-assisted systems for reporting, workflow, and the knowledge teams rely on.
          </p>
          <dl className="about-id-rail">
            {identity.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="about-profile-side">
          <figure className="about-portrait about-portrait--hero" aria-label="Portrait of Daniel smiling">
            <img src="/about-portrait-smiling.webp" alt="Portrait of Daniel smiling" />
            <span className="about-portrait-orbit" aria-hidden="true" />
            <span className="about-portrait-point" aria-hidden="true" />
          </figure>
        </div>
      </section>

      <section className="page-grid about-intro" aria-label="What I do">
        <p className="about-lede">
          Akibwa is that BI experience pointed at AI — small working systems that take a messy workflow and
          make it run, without pretending the human context is simpler than it is.
        </p>

        <div className="about-proof-cols">
          {proofPoints.map((point) => (
            <div key={point.lead}>
              <h3>{point.lead}</h3>
              <p>{point.tail}</p>
            </div>
          ))}
        </div>

        <Link className="about-cta" href="/contact">
          <span className="about-cta-label">Send the messy bit</span>
          <span className="about-cta-icon" aria-hidden="true">
            <ArrowRight size={17} strokeWidth={2} />
          </span>
        </Link>
      </section>

      <section className="page-grid about-section" aria-labelledby="workplaces-heading">
        <header className="about-section-head">
          <h2 id="workplaces-heading">Where the judgement comes from</h2>
          <p>Finance, gaming, public-investment, and BI teams where usefulness had to survive the meeting.</p>
        </header>

        <ol className="work-timeline">
          {workplaces.map((workplace) => (
            <li className="work-row" key={workplace.name} style={{ "--company-accent": workplace.accent }}>
              <span className="work-year">{workplace.year}</span>
              <span className="work-node" aria-hidden="true" />
              <span className="work-detail">
                <span className="work-company">
                  <span className="work-logo" aria-hidden="true">
                    {workplace.logo ? <img src={workplace.logo} alt="" /> : <span className="work-dot" />}
                  </span>
                  <strong>{workplace.name}</strong>
                </span>
                <span className="work-role">{workplace.role}</span>
              </span>
            </li>
          ))}
        </ol>
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

      <PageFooter />
    </section>
  );
}
