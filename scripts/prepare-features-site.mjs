import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises';

// features.games serves the verified game export the Features publisher writes
// to public/features/. This adds only the standalone root's static-host policy.
const root = new URL('../out/features/', import.meta.url);
const site = 'https://features.games';

// The sitemap lists the pages that ask to be found: the front page, and every
// page that names its own address on features.games in a canonical link and
// carries no noindex. The Features repository says both in each page it
// publishes, so it decides which of its pages are searchable and a new one is
// listed with no change here. Scripts, styles and comments are set aside first,
// so only the page's own head is read.
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) || [];
const attribute = (tag, name) => {
  const found = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return found ? found[1] ?? found[2] ?? found[3] : '';
};
const servedAt = file => site + '/' + file.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
async function listedPages() {
  const listed = new Set([site + '/']);
  for (const file of await readdir(root, { recursive: true })) {
    if (!file.endsWith('.html')) continue;
    const head = (await readFile(new URL(file, root), 'utf8'))
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
      .split(/<body\b/i)[0];
    const hidden = tags(head, 'meta').some(tag => /^robots$/i.test(attribute(tag, 'name')) && /noindex|none/i.test(attribute(tag, 'content')));
    const canonical = tags(head, 'link').find(tag => /(^|\s)canonical(\s|$)/i.test(attribute(tag, 'rel')));
    if (!hidden && canonical && attribute(canonical, 'href') === servedAt(file)) listed.add(servedAt(file));
  }
  return [...listed].sort();
}
// A page that cannot be read must never stop the game's deploy: the front page
// is then listed alone, as it was before the other pages were.
const pages = await listedPages().catch(error => {
  console.warn('Features sitemap lists the front page alone: ' + error.message);
  return [site + '/'];
});

await copyFile(new URL('../public/_headers', import.meta.url), new URL('_headers', root));
await writeFile(new URL('_redirects', root), '/features / 301\n/features/ / 301\n/features/index.html / 301\n');
await writeFile(new URL('robots.txt', root), 'User-agent: *\nAllow: /\nDisallow: /features/api/\nSitemap: https://features.games/sitemap.xml\n');
await writeFile(new URL('sitemap.xml', root), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map(page => '<url><loc>' + page.replace(/&/g, '&amp;') + '</loc></url>\n').join('') + '</urlset>\n');
await writeFile(new URL('404.html', root), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>features</title><body><h1>nothing here</h1><p><a href="/">play features</a></p></body></html>\n');
console.log('Features sitemap lists ' + pages.join(', '));
