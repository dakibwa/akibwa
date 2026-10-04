import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { waitForHostedExport } from './hosting-readiness.mjs';

const root = new URL('../out/features/', import.meta.url);
const origin = new URL(process.argv[2] || 'https://features.games');
const preview = origin.hostname.endsWith('.workers.dev');
const hash = body => createHash('sha256').update(body).digest('hex');
const documentHeaders={'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'};
const ready=await waitForHostedExport(origin, hash(await readFile(new URL('index.html', root))), {
  expectedHeaders: {'cache-control': 'public, max-age=0, must-revalidate'},
  requestHeaders: documentHeaders,
});
for (const file of ['index.html', 'manifest.webmanifest', 'og.png', 'icon-192.png', 'icon-512-maskable.png']) {
  // Readiness already fetched these exact document bytes. A second request can
  // hit an edge still serving the previous deployment during propagation.
  const response = file==='index.html'?ready.response:await fetch(new URL(file,origin));
  const body = file==='index.html'?ready.body:Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200, file);
  if (file === 'index.html') assert.match(response.headers.get('content-encoding') || '', /^(gzip|br|zstd)$/, 'game must stay compressed');
  assert.equal(hash(body), hash(await readFile(new URL(file, root))), file + ' bytes');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(response.headers.get('cache-control'), /max-age=0.*must-revalidate/);
  if (preview) assert.equal(response.headers.get('x-robots-tag'), 'noindex');
}
for (const alias of ['/features', '/features/', '/features/index.html']) {
  const response = await fetch(new URL(alias + '?signin=ok', origin), {redirect: 'manual'});
  assert.equal(response.status, 301, alias);
  assert.equal(new URL(response.headers.get('location'), origin).pathname, '/');
  assert.equal(new URL(response.headers.get('location'), origin).search, '?signin=ok');
}
assert.equal((await fetch(new URL('/missing-page/', origin))).status, 404);
const health = await fetch(new URL('/features/api/health', origin));
if (preview) assert.equal(health.status, 404, 'preview must not proxy real accounts');
else {
  assert.equal(health.status, 200);
  assert.match(health.headers.get('cache-control'), /no-store/);
  assert.equal((await health.json()).ok, true);
}
console.log('Features hosting verified: exact game and assets, aliases, security, cache policy and API isolation.');
