export const dynamic = "force-static";

const routes = [{ path: "/", priority: 1 }];

export default function sitemap() {
  return routes.map(({ path, priority }) => ({
    url: `https://akibwa.com${path}`,
    lastModified: new Date(),
    priority
  }));
}
