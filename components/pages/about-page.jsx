import { PageFooter } from "@/components/page-footer";

export function AboutPage() {
  return (
    <section className="studio-page about-page">
      <section className="page-grid studio-hero">
        <h1>About</h1>
        <p>
          Daniel builds small AI-assisted systems for personal projects,
          professional workflows, data products, and private knowledge.
        </p>
      </section>

      <PageFooter />
    </section>
  );
}
