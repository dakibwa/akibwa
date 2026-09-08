import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { waitForHostedExport } from './hosting-readiness.mjs';

const root = new URL('../out/features/', import.meta.url);
const origin = new URL(process.argv[2] || 'https://features.games');
const preview = origin.hostname.endsWith('.workers.dev');
const hash = body => createHash('sha256').update(body).digest('hex');
await waitForHostedExport(origin, hash(await readFile(new URL('index.html', root))));
for (const file of ['index.html', 'manifest.webmanifest', 'og.png', 'icon-192.png', 'icon-512-maskable.png']) {
  const response = await fetch(new URL(file === 'index.html' ? '/' : file, origin));
  assert.equal(response.status, 200, file);
  assert.equal(hash(Buffer.from(await response.arrayBuffer())), hash(await readFile(new URL(file, root))), file + ' bytes');
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
