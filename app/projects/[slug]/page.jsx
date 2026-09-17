import { notFound } from "next/navigation";
import { pageOpenGraph } from "@/app/site-metadata";
import { PersonalPage } from "@/components/pages/personal-page";
import { isPersonalProjectLaunchable, personalProjects } from "@/components/site-data";

const findProject = (slug) =>
  personalProjects.find((project) => project.slug === slug || project.aliases?.includes(slug)) ?? null;

export const dynamicParams = false;

export function generateStaticParams() {
  return personalProjects.filter(isPersonalProjectLaunchable).flatMap((project) => [
    { slug: project.slug },
    ...(project.aliases ?? []).map((alias) => ({ slug: alias }))
  ]);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.summary,
    openGraph: pageOpenGraph({
      title: project.title,
      description: project.summary,
      path: `/projects/${slug}/`
    }),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true
      }
    }
  };
}

export default async function PersonalProjectRoute({ params }) {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) notFound();

  return (
    <>
      <PersonalPage initialSlug={project.slug} />
    </>
  );
}
