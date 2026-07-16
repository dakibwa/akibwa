import { ChorusDashboardPreview } from "@/components/chorus-dashboard-preview";
import { chorusAppUrl } from "@/components/site-data";
import { siteSectionTitles } from "@/app/site-metadata";

export const metadata = {
  title: siteSectionTitles.chorus,
  description:
    "Chorus is an Akibwa music intelligence dashboard for Last.fm listening history, recent plays, top artists, and run pairings."
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
