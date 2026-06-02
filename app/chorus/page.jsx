import { PageFooter } from "@/components/page-footer";
import { ChorusDashboardPreview } from "@/components/chorus-dashboard-preview";

export const metadata = {
  title: "Chorus",
  description:
    "A public-safe Chorus preview showing how Last.fm listening history becomes artists, albums, tracks, timelines, and reports."
};

export default function ChorusPage() {
  return (
    <section className="chorus-page">
      <ChorusDashboardPreview />
      <PageFooter />
    </section>
  );
}
