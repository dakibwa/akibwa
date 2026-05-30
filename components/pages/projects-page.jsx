import { PageFooter } from "@/components/page-footer";
import { WorkProjectKit } from "@/components/work-project-kit";

export function ProjectsPage() {
  return (
    <section className="studio-page work-page">
      <section className="page-grid studio-hero">
        <h1>Selected work</h1>
      </section>

      <WorkProjectKit />

      <PageFooter />
    </section>
  );
}
