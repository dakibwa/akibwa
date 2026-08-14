# Static Asset Caching

Akibwa.com is served by two systems, and knowing which one owns a given response
header is the whole difficulty here.

- **Origin**: GitHub Pages, deployed from `main` by `.github/workflows/deploy-pages.yml`.
- **Edge**: Cloudflare, reverse-proxying the `akibwa.com` zone. The DNS records are
  proxied, so `akibwa.com` resolves into Cloudflare's `2606:4700::/32` rather than to
  GitHub.

There is no Cloudflare Pages project. The two entries under `workers/` are Workers
for data refreshes, not a host for this site.

## `_headers` does not work here

`_headers` is a Cloudflare **Pages / Workers static assets** feature: the platform
reads the file out of the uploaded asset directory at deploy time. Neither half of
this stack does that. GitHub Pages does not implement `_headers` at all, and a
Cloudflare zone reverse-proxying a third-party origin does not read it either.

A `public/_headers` file would be copied to `out/_headers` by the static export and
published as a plain text file at `https://akibwa.com/_headers`, changing no response
header. Do not add one while the origin is GitHub Pages.

## Where the current headers come from

| Response | Header | Set by |
| --- | --- | --- |
| HTML | `cache-control: max-age=600` | GitHub Pages, passing straight through — Cloudflare does not cache HTML by default |
| `/_next/static/**` | `cache-control: max-age=14400` | Cloudflare's default Browser Cache TTL of 4 hours, overriding the origin |

Browser Cache TTL overrides the `max-age` Cloudflare sends downstream, so no
origin-side change can raise it. `/_next/static/` filenames are content-hashed, so a
changed file is always a new URL; the 4-hour TTL only buys revalidation round trips
that can return 304.

## Raising the TTL

The fix is a Cache Rule on the `akibwa.com` zone (Caching → Cache Rules), not a commit
in this repository.

- Expression: `starts_with(http.request.uri.path, "/_next/static/")`
- Cache eligibility: eligible for cache
- Edge TTL: override origin, 1 year
- Browser TTL: override origin, 1 year

Scope it to `/_next/static/` and nothing else. That path covers `chunks/`, `css/`, and
the build-ID directory, all content-hashed. The `public/_img/` variants are named by
source, slot, and width rather than by content hash, so replacing artwork reuses the
filename — a long immutable TTL there would pin stale images.

If the 4-hour value survives the new rule, check for a legacy Page Rule setting browser
TTL rather than the zone default.

Verify against the live site:

```bash
curl -sI https://akibwa.com/_next/static/css/<hash>.css | grep -i cache-control
```
