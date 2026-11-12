import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { waitForHostedExport } from './hosting-readiness.mjs';

// Oh Life! Studios is served straight from studio/site/: check the exact bytes,
// the security headers its _headers file sets, and a real 404.
const root = new URL('../studio/site/', import.meta.url);
const origin = new URL(process.argv[2] || 'https://ohlifestudios.com');
const hash = body => createHash('sha256').update(body).digest('hex');
const files = ['index.html', 'styles.css', 'favicon.svg', 'assets/logo.svg', 'assets/ohlife-pixel.woff2', 'assets/scenes/hero-wide.png', 'studio-preview.png'];
for (const file of files) {
  const expected = await readFile(new URL(file, root));
  const {response, body} = await waitForHostedExport(origin, hash(expected), {path: file === 'index.html' ? '/' : file});
  assert.equal(response.status, 200, file);
  assert.equal(hash(body), hash(expected), file + ' bytes');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', file);
  if (file === 'index.html') assert.match(response.headers.get('content-security-policy') || '', /script-src 'none'/);
}
assert.equal((await fetch(new URL('/missing-page/', origin))).status, 404);
console.log(`Oh Life! Studios hosting verified at ${origin.origin}: exact files, security headers and 404.`);
