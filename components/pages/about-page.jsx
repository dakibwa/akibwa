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
            Senior BI and analytics operator turning messy data, reporting estates, and AI-assisted workflows into
            useful systems.
          </p>
        </div>

        <div className="about-profile-copy">
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

        <div className="about-profile-side">
          <figure className="about-portrait" aria-label="Portrait of Daniel smiling">
            <img src="/about-portrait-smiling.png" alt="Portrait of Daniel smiling" />
            <span className="about-portrait-orbit" aria-hidden="true" />
            <span className="about-portrait-point" aria-hidden="true" />
          </figure>

          <aside className="about-profile-notes" aria-label="Current focus">
            <span>Microsoft Fabric implementation and adoption</span>
            <span>Power BI estates, DAX, governance, and semantic models</span>
            <span>AI-assisted local tools with Codex, Claude Code, and Copilot</span>
            <span>Evidence-led dashboards for teams that need clarity</span>
          </aside>
        </div>
      </section>

      <section className="page-grid about-section" aria-labelledby="workplaces-heading">
        <div className="about-section-head">
          <div>
            <h2 id="workplaces-heading">Where I have worked</h2>
          </div>
          <p>Years of building my context window</p>
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
            <h2 id="tools-heading">Tools I work with</h2>
          </div>
          <p>Modern tooling for the future of workflows</p>
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
