import { ProjectAppGate } from "@/components/project-app-gate";
import { PageFooter } from "@/components/page-footer";
import { chorusAppUrl } from "@/components/site-data";

export const metadata = {
  title: "Chorus App",
  description:
    "The live Chorus app route for Last.fm music intelligence."
};

export default function ChorusPage() {
  return (
    <section className="chorus-page">
      <ProjectAppGate
        appUrl={chorusAppUrl}
        description="The live app runs separately from the public site."
        envHint="NEXT_PUBLIC_CHORUS_APP_URL"
        kind="chorus"
        name="Chorus"
        previewHref="/personal#chorus"
      />
      <PageFooter />
    </section>
  );
}
