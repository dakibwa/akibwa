import { PageFooter } from "@/components/page-footer";

const systemSteps = [
  {
    number: "01",
    title: "Capture",
    body: "Collect raw inputs from anywhere. No rigid formats."
  },
  {
    number: "02",
    title: "Structure",
    body: "Define, normalize, and connect. Make sense of what matters."
  },
  {
    number: "03",
    title: "Assist",
    body: "Use AI where it helps. Augment judgment, don't replace it."
  },
  {
    number: "04",
    title: "Operate",
    body: "Run the system. Deliver consistent, useful outcomes."
  }
];

const modelColumns = [
  {
    number: "01",
    title: "Inputs",
    body: "Unstructured inputs enter the system from multiple sources.",
    tags: ["Documents", "Data", "Audio", "Links", "Emails", "Notes", "Spreadsheets", "APIs"]
  },
  {
    number: "02",
    title: "Definitions",
    body: "You define what matters and how it should be structured.",
    tags: ["Entities", "Rules", "Relationships", "Taxonomy", "Metrics", "Formats"]
  },
  {
    number: "03",
    title: "Retrieval + AI",
    body: "The system retrieves context and uses AI to assist with the task.",
    tags: ["Context", "AI assistance"]
  },
  {
    number: "04",
    title: "Outputs",
    body: "Useful outputs you can act on, share, or feed back into the system.",
    tags: ["Reports", "Decisions", "Exports", "Dashboards", "Alerts", "Automations"]
  }
];

export function SystemsPage() {
  return (
    <section className="studio-page systems-page">
      <section className="page-grid studio-hero systems-studio-hero">
        <h1>Systems</h1>
        <p>The operating loop behind every build.</p>
      </section>

      <section className="page-grid systems-card-grid">
        {systemSteps.map((step) => (
          <article className="studio-card system-step-card" key={step.title}>
            <header>
              <span>{step.number}</span>
              <h2>{step.title}</h2>
            </header>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <section className="page-grid model-panel">
        <div className="model-intro">
          <h2>How the model works</h2>
          <p>A simple operating loop that keeps systems useful and current.</p>
        </div>
        {modelColumns.map((column) => (
          <article key={column.title}>
            <h3>
              <span>{column.number}</span>
              {column.title}
            </h3>
            <p>{column.body}</p>
            <p className="model-tags">{column.tags.join(" · ")}</p>
          </article>
        ))}
      </section>

      <PageFooter />
    </section>
  );
}
