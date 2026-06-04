import { ProjectSurfaceNav } from "@/components/project-surface-nav";
import { chorusAppUrl } from "@/components/site-data";

export const metadata = {
  title: "Chorus App",
  description: "The live Chorus app route for Last.fm music intelligence."
};

export default function ChorusPage() {
  return (
    <section className="project-surface-page chorus-page" aria-label="Chorus">
      <ProjectSurfaceNav title="Chorus" />
      <div className="chorus-app-shell">
        <iframe
          src={chorusAppUrl}
          title="Chorus live app"
          className="chorus-app-frame"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </section>
  );
}
