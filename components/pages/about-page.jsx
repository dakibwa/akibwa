import { PageFooter } from "@/components/page-footer";

const workplaces = [
  {
    name: "National Wealth Fund",
    role: "Senior BI Developer",
    dates: "2024 - Present",
    accent: "#17324d",
    mark: "nwf",
    logo: "/brand-logos/national-wealth-fund-icon.png",
    body:
      "Leading the Microsoft Fabric implementation across ingestion, lakehouse modelling, semantic models, Power BI, governance, and business training."
  },
  {
    name: "Leeds Building Society",
    role: "BI Team Lead / BI Analyst",
    dates: "2023 - 2024",
    accent: "#2f88ff",
    mark: "leeds",
    logo: "/brand-logos/leeds-building-society-icon.svg",
    body:
      "Promoted quickly into team leadership, guiding reporting delivery, analyst development, and clearer BI practices across the team."
  },
  {
    name: "Sky Betting & Gaming",
    role: "Business Intelligence Analyst",
    dates: "2020 - 2022",
    accent: "#d01fcb",
    mark: "sky",
    body:
      "Rebuilt Power BI reporting and used SQL analysis to make safer-gambling, customer, and product signals easier to understand."
  },
  {
    name: "Vanquis Bank",
    role: "Strategic Insight Analyst",
    dates: "2018 - 2019",
    accent: "#f15a24",
    mark: "vanquis",
    logo: "/brand-logos/vanquis-icon.svg",
    body:
      "Built Excel and Power BI models for commercial analysis, cost views, NPV thinking, and early SQL/data structure work."
  },
  {
    name: "Lloyds Banking Group",
    role: "Credit Risk Analyst",
    dates: "2016 - 2017",
    accent: "#006747",
    mark: "lloyds",
    logo: "/brand-logos/lloyds-horse-icon.png",
    body:
      "Started in credit risk, working with structured analysis, financial judgement, and the discipline of evidence-led decisions."
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
    glyph: "powerbi"
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
    logo: "/brand-logos/openai-codex.svg"
  },
  {
    name: "Copilot",
    detail: "Fabric, workflow, and knowledge assistance",
    accent: "#6f5cff",
    glyph: "copilot"
  },
  {
    name: "Python",
    detail: "Source processing and automation",
    accent: "#3776ab",
    glyph: "python"
  },
  {
    name: "Data Modelling",
    detail: "Definitions, lineage, reliable meaning",
    accent: "#ff6f1a",
    glyph: "model"
  }
];

const domains = [
  {
    title: "Finance",
    body: "Credit, banking, wealth, and investment environments.",
    accent: "#006747"
  },
  {
    title: "Infrastructure",
    body: "Public-investment reporting and modern data foundations.",
    accent: "#17324d"
  },
  {
    title: "Gaming",
    body: "Product, customer, and safer-gambling intelligence.",
    accent: "#d01fcb"
  },
  {
    title: "BI Systems",
    body: "Dashboards, semantic layers, governance, and adoption.",
    accent: "#2f88ff"
  },
  {
    title: "AI Workflows",
    body: "Small systems that help teams move from mess to clarity.",
    accent: "#ff6f1a"
  }
];

function CompanyMark({ workplace }) {
  return (
    <div className={`company-mark mark-${workplace.mark}`}>
      {workplace.logo ? <img src={workplace.logo} alt={`${workplace.name} logo`} /> : <span aria-hidden="true" />}
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
      <section className="page-grid studio-hero">
        <h1>About</h1>
        <p>
          Senior BI and analytics operator turning messy data, reporting estates, and AI-assisted workflows into useful
          systems.
        </p>
      </section>

      <section className="page-grid about-profile" aria-label="Profile">
        <div>
          <h2>What I do</h2>
          <p>
            I am Daniel, a Business Intelligence specialist with experience across finance, infrastructure, and
            gaming. My work sits where data engineering, reporting, product thinking, and practical AI tooling meet:
            define the problem, build the source layer, make the model trustworthy, then turn it into something people
            can actually use.
          </p>
          <p>
            The through-line is simple: make complicated systems understandable without flattening the detail that makes
            them true.
          </p>
        </div>

        <aside className="about-profile-notes" aria-label="Current focus">
          <span>Microsoft Fabric implementation and adoption</span>
          <span>Power BI estates, DAX, governance, and semantic models</span>
          <span>AI-assisted local tools with Codex, Claude Code, and Copilot</span>
          <span>Evidence-led dashboards for teams that need clarity</span>
        </aside>
      </section>

      <section className="page-grid about-section" aria-labelledby="workplaces-heading">
        <div className="about-section-head">
          <div>
            <h2 id="workplaces-heading">Where I have worked</h2>
          </div>
          <p>Public CV-level history, shaped into the kind of systems work I want Akibwa to stand for.</p>
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
              <p>{workplace.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-grid about-section" aria-labelledby="tools-heading">
        <div className="about-section-head">
          <div>
            <h2 id="tools-heading">Tools I work with</h2>
          </div>
          <p>Modern BI foundations, careful modelling, and AI coding tools used as part of real delivery.</p>
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
