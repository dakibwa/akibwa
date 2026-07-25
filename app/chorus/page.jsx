import { ChorusDashboardPreview } from "@/components/chorus-dashboard-preview";
import { chorusAppUrl } from "@/components/site-data";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.chorus,
  description:
    "Chorus turns a decade of Last.fm scrobbles into something browsable: recent plays, top artists and albums, timelines and listening reports."
};

export default function ChorusPage() {
  return (
    <section className="project-surface-page chorus-page" aria-label="Chorus">
      {chorusAppUrl ? (
        <div className="chorus-app-shell">
          <iframe
            src={chorusAppUrl}
            title="Chorus live app"
            className="chorus-app-frame"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      ) : (
        <ChorusDashboardPreview />
      )}
    </section>
  );
}
