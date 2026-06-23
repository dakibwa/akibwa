import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFooter } from "@/components/page-footer";

const workplaces = [
  {
    name: "National Wealth Fund",
    role: "Senior BI Developer",
    dates: "2024 - Present",
    accent: "#17324d",
    mark: "nwf",
    logo: "/brand-logos/national-wealth-fund-icon.png"
  },
  {
    name: "Leeds Building Society",
    role: "BI Team Lead / BI Analyst",
    dates: "2023 - 2024",
    accent: "#2f88ff",
    mark: "leeds",
    logo: "/brand-logos/leeds-building-society-icon.svg"
  },
  {
    name: "Sky Betting & Gaming",
    role: "Business Intelligence Analyst",
    dates: "2020 - 2022",
    accent: "#d01fcb",
    mark: "sky"
  },
  {
    name: "Vanquis Bank",
    role: "Strategic Insight Analyst",
    dates: "2018 - 2019",
    accent: "#f15a24",
    mark: "vanquis",
    logo: "/brand-logos/vanquis-icon.svg"
  },
  {
    name: "Lloyds Banking Group",
    role: "Credit Risk Analyst",
    dates: "2016 - 2017",
    accent: "#006747",
    mark: "lloyds",
    logo: "/brand-logos/lloyds-horse-icon.png"
  }
];

const tools = [
  {
    name: "Microsoft Fabric",
    detail: "Lakehouse, pipelines, semantic models",
    accent: "#2f88ff",
    glyph: "fabric",
    logo: "/brand-logos/microsoft-fabric.svg"
  },
  {
    name: "Power BI",
    detail: "DAX, reporting estates, Power BI Service",
    accent: "#f2c811",
    glyph: "powerbi",
    logo: "/brand-logos/power-bi.svg"
  },
  {
    name: "SQL",
    detail: "Analysis, modelling, source interrogation",
    accent: "#7d9a92",
    glyph: "sql"
  },
  {
    name: "Claude Code",
    detail: "AI-assisted building and refactoring",
    accent: "#c96f3c",
    glyph: "claude",
    logo: "/brand-logos/claude.svg"
  },
  {
    name: "OpenAI Codex",
    detail: "Repo work, local agents, implementation",
    accent: "#12b981",
    glyph: "codex",
    logo: "/brand-logos/openai-codex-app.png"
  },
  {
    name: "Copilot",
    detail: "Fabric, workflow, and knowledge assistance",
    accent: "#557f8d",
    glyph: "copilot",
    logo: "/brand-logos/microsoft-copilot.svg"
  },
  {
    name: "Python",
    detail: "Source processing and automation",
    accent: "#3776ab",
    glyph: "python",
    logo: "/brand-logos/python.svg"
  },
  {
    name: "Data Modelling",
    detail: "Definitions, lineage, reliable meaning",
    accent: "#ff6f1a",
    glyph: "model",
    logo: "/brand-logos/data-modeling.svg"
  }
];

const domains = [
  {
    title: "Reporting estates",
    body: "Power BI, Fabric, semantic models, adoption, and the meaning behind the numbers.",
    accent: "#006747"
  },
  {
    title: "Private knowledge",
    body: "Source-backed memory systems, retrieval routes, public-safe projections, and review loops.",
    accent: "#17324d"
  },
  {
    title: "Workflow handover",
    body: "Manual steps, recurring decisions, awkward files, and team hand-offs made easier to run.",
    accent: "#d01fcb"
  },
  {
    title: "Financial data",
    body: "Credit, banking, wealth, public-investment, and regulated reporting environments.",
    accent: "#2f88ff"
  },
  {
    title: "AI build loops",
    body: "Codex and Claude-assisted prototypes with docs, safeguards, and practical ownership.",
    accent: "#ff6f1a"
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

function CompanyMark({ workplace }) {
  return (
    <div className={`company-mark mark-${workplace.mark}`}>
      <div className="company-logo-cell" aria-hidden="true">
        {workplace.logo ? <img src={workplace.logo} alt="" /> : <span />}
      </div>
      <strong>{workplace.name}</strong>
    </div>
  );
}

function ToolGlyph({ tool }) {
  if (tool.logo) {
    return (
      <div className={`tool-glyph tool-logo-wrap logo-${tool.glyph}`} aria-hidden="true">
        <img src={tool.logo} alt="" />
      </div>
    );
  }

  return (
    <div className={`tool-glyph glyph-${tool.glyph}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function AboutPage() {
  return (
    <section className="studio-page about-page">
      <section className="page-grid about-overview" aria-label="Profile">
        <div className="about-hero-copy">
          <h1>About</h1>
          <p>
            Ten years turning messy data into useful decision surfaces — now building small, AI-assisted systems
            for reporting, workflow, and private knowledge problems.
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
          <figure className="about-portrait about-portrait--artwork">
            <img
              src="/area-art/about-meadow-flowers.jpg"
              alt="Flower-crowned figures gathered in a luminous painted meadow"
            />
            <span className="about-portrait-orbit" aria-hidden="true" />
            <span className="about-portrait-point" aria-hidden="true" />
          </figure>
        </div>
      </section>

      <section className="page-grid about-method" aria-labelledby="method-heading">
        <header className="about-method-head">
          <h2 id="method-heading">How I tend to build</h2>
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
        <div className="about-section-head">
          <div>
            <h2 id="workplaces-heading">Where the judgement comes from</h2>
          </div>
          <p>Finance, gaming, public-investment, and BI teams where usefulness had to survive the meeting.</p>
        </div>

        <div className="company-grid">
          {workplaces.map((workplace) => (
            <article
              className="company-card"
              key={workplace.name}
              style={{ "--company-accent": workplace.accent }}
            >
              <CompanyMark workplace={workplace} />
              <div>
                <h3>{workplace.role}</h3>
                <p>{workplace.dates}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="page-grid about-section" aria-labelledby="tools-heading">
        <div className="about-section-head">
          <div>
            <h2 id="tools-heading">Current toolkit</h2>
          </div>
          <p>Data tools, automation, and local agentic build loops for turning rough material into working systems.</p>
        </div>

        <div className="tool-grid">
          {tools.map((tool) => (
            <article className="tool-card" key={tool.name} style={{ "--tool-accent": tool.accent }}>
              <ToolGlyph tool={tool} />
              <div>
                <h3>{tool.name}</h3>
                <p>{tool.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="page-grid about-domain-strip" aria-label="Experience domains">
        {domains.map((domain) => (
          <article key={domain.title} style={{ "--domain-accent": domain.accent }}>
            <span />
            <h2>{domain.title}</h2>
            <p>{domain.body}</p>
          </article>
        ))}
      </section>

      <PageFooter />
    </section>
  );
}
