import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const workplaces = [
  {
    name: "National Wealth Fund",
    role: "Senior BI Developer",
    dates: "2024 - Present",
    accent: "#17324d",
    logo: "/brand-logos/national-wealth-fund-icon.png"
  },
  {
    name: "Leeds Building Society",
    role: "BI Team Lead / BI Analyst",
    dates: "2023 - 2024",
    accent: "#2f88ff",
    logo: "/brand-logos/leeds-building-society-icon.svg"
  },
  {
    name: "Sky Betting & Gaming",
    role: "Business Intelligence Analyst",
    dates: "2020 - 2022",
    accent: "#d01fcb"
  },
  {
    name: "Vanquis Bank",
    role: "Strategic Insight Analyst",
    dates: "2018 - 2019",
    accent: "#f15a24",
    logo: "/brand-logos/vanquis-icon.svg"
  },
  {
    name: "Lloyds Banking Group",
    role: "Credit Risk Analyst",
    dates: "2016 - 2017",
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

const principles = [
  {
    number: "01",
    title: "Start with the real work",
    body: "Map the decision, hand-off, source, and person before deciding what should be automated."
  },
  {
    number: "02",
    title: "Build the smallest useful system",
    body: "The first version should save a repeated step, make the hidden process visible, or clarify a decision."
  },
  {
    number: "03",
    title: "Leave the keys behind",
    body: "Documentation, safeguards, ownership, and plain language matter as much as the build."
  }
];

const proofPoints = [
  "BI experience across banking, credit, gaming, and public-investment reporting.",
  "Comfortable between messy source material, semantic models, dashboards, and AI-assisted build loops.",
  "Interested in systems people can keep using, not demos that only work while the builder is in the room."
];

export function AboutPage() {
  return (
    <section className="studio-page about-page">
      <section className="page-grid about-overview" aria-label="Profile">
        <div className="about-hero-copy">
          <h1>About</h1>
          <p>
            Ten years turning messy data into clear decisions — now building small, AI-assisted systems for
            reporting, workflow, and the knowledge teams rely on.
          </p>
        </div>

        <div className="about-profile-copy">
          <h2>What I do</h2>
          <p>
            I am Daniel, a Business Intelligence specialist. The pattern has been the same everywhere I
            have worked: find the question that matters, get the data straight, then build the dashboard, model,
            or tool that people actually use.
          </p>
          <p>
            Akibwa is that experience pointed at AI. I design small working systems — dashboards, automations,
            knowledge tools — that take a messy workflow and make it run without pretending the human context is
            simpler than it is.
          </p>
          <ul className="about-proof-list" aria-label="Proof points">
            {proofPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <Link className="about-cta" href="/contact">
            <span className="about-cta-label">Send the messy bit</span>
            <span className="about-cta-icon" aria-hidden="true">
              <ArrowRight size={17} strokeWidth={2} />
            </span>
          </Link>
        </div>

        <div className="about-profile-side">
          <figure className="about-portrait" aria-label="Portrait of Daniel smiling">
            <img src="/about-portrait-smiling.webp" alt="Portrait of Daniel smiling" />
            <span className="about-portrait-orbit" aria-hidden="true" />
            <span className="about-portrait-point" aria-hidden="true" />
          </figure>
        </div>
      </section>

      <section className="page-grid about-method" aria-labelledby="method-heading">
        <header className="about-method-head">
          <h2 id="method-heading">How I build</h2>
          <p>Calm, practical, source-aware work that can be handed over.</p>
        </header>

        <div className="about-method-steps">
          {principles.map((principle) => (
            <article key={principle.title}>
              <span>{principle.number}</span>
              <div>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="page-grid about-section" aria-labelledby="workplaces-heading">
        <header className="about-section-head">
          <h2 id="workplaces-heading">Where the judgement comes from</h2>
          <p>Finance, gaming, public-investment, and BI teams where usefulness had to survive the meeting.</p>
        </header>

        <ul className="work-list">
          {workplaces.map((workplace) => (
            <li className="work-row" key={workplace.name} style={{ "--company-accent": workplace.accent }}>
              <span className="work-company">
                <span className="work-logo" aria-hidden="true">
                  {workplace.logo ? <img src={workplace.logo} alt="" /> : <span className="work-dot" />}
                </span>
                <strong>{workplace.name}</strong>
              </span>
              <span className="work-role">{workplace.role}</span>
              <span className="work-dates">{workplace.dates}</span>
            </li>
          ))}
        </ul>
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

      <PageFooter />
    </section>
  );
}
