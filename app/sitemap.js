export const dynamic = "force-static";

const routes = [
  { path: "/", priority: 1 },
  { path: "/professional/", priority: 0.9 },
  { path: "/projects/", priority: 0.9 },
  { path: "/about/", priority: 0.8 },
  { path: "/contact/", priority: 0.8 },
  { path: "/projects/chorus/", priority: 0.5 },
  { path: "/projects/cover-collision/", priority: 0.5 },
  { path: "/projects/meditator/", priority: 0.5 }
];

export default function sitemap() {
  return routes.map(({ path, priority }) => ({
    url: `https://akibwa.com${path}`,
    lastModified: new Date(),
    priority
  }));
}
