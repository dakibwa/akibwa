export const dynamic = "force-static";

/* Akibwa is the public identity. Detailed project and archive pages remain
   reachable by direct link, but are deliberately excluded from discovery. */
const routes = [{ path: "/", priority: 1 }];

export default function sitemap() {
  return routes.map(({ path, priority }) => ({
    url: `https://akibwa.com${path}`,
    lastModified: new Date(),
    priority
  }));
}
