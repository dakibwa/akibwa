import { PageFooter } from "@/components/page-footer";
import { SonicFmDashboardPreview } from "@/components/sonic-fm-dashboard-preview";

export const metadata = {
  title: "Chorus",
  description:
    "A public-safe Chorus preview showing how Last.fm listening history becomes artists, albums, tracks, timelines, and reports."
};

export default function ChorusPage() {
  return (
    <section className="sonic-page">
      <SonicFmDashboardPreview />
      <PageFooter />
    </section>
  );
}
