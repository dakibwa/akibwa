import { copyFile, writeFile } from 'node:fs/promises';

// features.games serves the verified game export the Features publisher writes
// to public/features/. This adds only the standalone root's static-host policy.
const root = new URL('../out/features/', import.meta.url);
await copyFile(new URL('../public/_headers', import.meta.url), new URL('_headers', root));
await writeFile(new URL('_redirects', root), '/features / 301\n/features/ / 301\n/features/index.html / 301\n');
await writeFile(new URL('robots.txt', root), 'User-agent: *\nAllow: /\nDisallow: /features/api/\nSitemap: https://features.games/sitemap.xml\n');
await writeFile(new URL('sitemap.xml', root), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://features.games/</loc></url></urlset>\n');
await writeFile(new URL('404.html', root), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>features</title><body><h1>nothing here</h1><p><a href="/">play features</a></p></body></html>\n');
