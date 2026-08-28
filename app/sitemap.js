export const dynamic = "force-static";

/* One page, so one entry. The old section routes still resolve, but they only
   redirect here now — advertising them would point search at a bounce. The two
   project detail pages stay because they hold their own content. */
const routes = [
  { path: "/", priority: 1 },
  { path: "/trek/", priority: 0.7 },
  { path: "/life-map/", priority: 0.7 },
  { path: "/albums/", priority: 0.6 },
  { path: "/projects/albums/", priority: 0.5 },
  { path: "/projects/cover-collision/", priority: 0.5 }
];

export default function sitemap() {
  return routes.map(({ path, priority }) => ({
    url: `https://akibwa.com${path}`,
    lastModified: new Date(),
    priority
  }));
}
