import { RouteRedirect } from "@/components/route-redirect";
import { siteSectionTitles } from "@/app/site-metadata";
import { isPersonalProjectLaunchable, personalProjects } from "@/components/site-data";

/* The project pages moved to /projects/. These stay so the deep links that
   were already live keep working. */

export const dynamicParams = false;

export function generateStaticParams() {
  return personalProjects.filter(isPersonalProjectLaunchable).flatMap((project) => [
    { slug: project.slug },
    ...(project.aliases ?? []).map((alias) => ({ slug: alias }))
  ]);
}

export const metadata = {
  title: siteSectionTitles.projects,
  robots: { index: false }
};

export default async function PersonalProjectRedirect({ params }) {
  const { slug } = await params;

  return <RouteRedirect to={`/projects/${slug}/`} label={`akibwa.com/projects/${slug}`} />;
}
