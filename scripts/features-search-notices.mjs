import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Tells search engines which of the game's pages a deploy changed, by IndexNow:
// one notice that Bing, Yandex, Naver, Seznam and Yep share between them.
// Google takes none and reads the sitemap.
//
//   before   ahead of the Features deploy: put the key's file in the export,
//            and keep a list of each page in the new sitemap that a search
//            engine would read differently from the one now served, with any
//            page the sitemap has dropped
//   after    once the deploy is verified: send that list, once
//
// It does nothing until this repository holds an INDEXNOW_KEY secret: 8 to 128
// letters, digits or dashes. The key proves the sender owns the host, so it is
// never committed and never printed. Nothing here can fail a deploy: every path
// says what it did and ends cleanly.
const site = 'https://features.games';
const root = new URL('../out/features/', import.meta.url);
const kept = join(process.env.RUNNER_TEMP || tmpdir(), 'features-changed-pages.json');
const key = process.env.INDEXNOW_KEY || '';

// What a search engine reads of a page: its words, its head and its structured
// data. The game's script and styles change with almost every release and the
// policy line carries the script's hash, so they are left out. Read whole, the
// front page would send a notice with every release; read this way it changed
// five times in thirty.
const reading = html => html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<script\b(?![^>]*\bapplication\/ld\+json\b)[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<meta\b[^>]*\bhttp-equiv\b[^>]*>/gi, '')
  .replace(/\s+/g, ' ').trim();
const listed = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(found => found[1].replace(/&amp;/g, '&'));
const fileOf = page => {
  const path = decodeURIComponent(new URL(page).pathname.slice(1));
  return path === '' || path.endsWith('/') ? path + 'index.html' : path + '.html';
};
// A page that is not there yet answers 404 and counts as new. Any other refusal
// says nothing about the page, so it stops the notice instead of sending a
// false one.
const served = async address => {
  const response = await fetch(address, { signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(new URL(address).pathname + ' answered ' + response.status);
  return response.text();
};

async function before() {
  await writeFile(new URL(key + '.txt', root), key).catch(() => { throw new Error('the key file could not be written'); });
  const next = listed(await readFile(new URL('sitemap.xml', root), 'utf8'));
  const changed = [];
  for (const page of next) {
    const live = await served(page);
    if (live === null || reading(live) !== reading(await readFile(new URL(fileOf(page), root), 'utf8'))) changed.push(page);
  }
  const dropped = listed(await served(site + '/sitemap.xml') || '').filter(page => !next.includes(page));
  await writeFile(kept, JSON.stringify([...changed, ...dropped]));
  console.log(changed.length + dropped.length
    ? 'This deploy changes ' + [...changed, ...dropped].join(', ')
    : 'This deploy changes no page as a search engine reads it.');
}

async function after() {
  const pages = JSON.parse(await readFile(kept, 'utf8').catch(() => 'null'));
  if (!pages) return console.log('No list was kept before the deploy, so no notice was sent.');
  if (!pages.length) return console.log('No page changed, so no notice was sent.');
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(site).host, key, keyLocation: site + '/' + key + '.txt', urlList: pages }),
    signal: AbortSignal.timeout(15000),
  });
  const meaning = {
    200: 'taken',
    202: 'taken, and the key is being checked',
    400: 'refused as badly formed',
    403: 'refused: the key file was not found, or does not hold the key',
    422: 'refused: a page is not on this host, or the key does not fit the protocol',
    429: 'refused as too many notices',
  }[response.status] || 'not understood';
  console.log('Notice for ' + pages.join(', ') + ': ' + meaning + ' (' + response.status + ').');
}

const step = { before, after }[process.argv[2]];
if (!step) console.log('Say "before" or "after".');
else if (!key) console.log('Change notices are off: this repository holds no INDEXNOW_KEY secret.');
else if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) console.log('Change notices are off: INDEXNOW_KEY must be 8 to 128 letters, digits or dashes.');
else await step().catch(error => console.log('Change notices skipped: ' + error.message));
