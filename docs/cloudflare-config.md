# Cloudflare Configuration for akibwa.com

This site is deployed to GitHub Pages with Cloudflare as the CDN in front.
Because GitHub Pages does not support `_redirects` or `_headers` files (those
are Cloudflare Pages features), certain optimizations must be configured via
the Cloudflare Dashboard rather than in the repository.

## HTTP 301 Redirects

The following legacy routes use in-page JavaScript redirects. To eliminate the
~760ms penalty of loading the Next.js shell before redirecting, configure these
as **Cloudflare Redirect Rules** in the Cloudflare Dashboard:

| From Path      | To                                 | Status |
|----------------|------------------------------------|--------|
| `/portugal/`   | `https://portuguesewithines.com/`  | 301    |
| `/offer/`      | `/professional/`                   | 301    |
| `/systems/`    | `/professional/`                   | 301    |
| `/work/`       | `/projects/`                       | 301    |
| `/personal/`   | `/projects/`                       | 301    |

### How to configure

1. In the Cloudflare Dashboard, go to **Rules** → **Redirect Rules**
2. Create a new rule for each redirect above
3. Example expression for `/portugal/`:
   ```
   (http.host eq "akibwa.com" and starts_with(http.request.uri.path, "/portugal"))
   ```
4. Set action to "Dynamic Redirect" with:
   - URL: `https://portuguesewithines.com/`
   - Status code: 301
   - Preserve query string: Yes

Once configured, the in-repo JS redirect pages can optionally be removed, though
keeping them provides a fallback for visitors who bypass Cloudflare.

## Cache Headers for Static Assets

Next.js generates hashed static assets at `/_next/static/*` which are immutable
(the hash changes when content changes). These should have long cache lifetimes.

GitHub Pages sets `max-age=600` by default, and Cloudflare's default edge cache
respects origin headers. To optimize:

### Option 1: Cloudflare Cache Rules (Recommended)

1. In the Cloudflare Dashboard, go to **Rules** → **Cache Rules**
2. Create a rule matching `/_next/static/*`:
   - Expression: `(starts_with(http.request.uri.path, "/_next/static/"))`
   - Cache eligibility: Eligible for cache
   - Edge TTL: Override to 1 year (31536000 seconds)
   - Browser TTL: Override to 1 year (31536000 seconds)

### Option 2: Cloudflare Transform Rules for Response Headers

1. Go to **Rules** → **Transform Rules** → **Modify Response Header**
2. Create a rule for `/_next/static/*`:
   - Set `Cache-Control` header to `public, max-age=31536000, immutable`

## Migrating to Cloudflare Pages

If migrating from GitHub Pages to Cloudflare Pages in the future, add these
files to `public/`:

**`_redirects`:**
```
/portugal/   https://portuguesewithines.com/  301
/offer/      /professional/                   301
/systems/    /professional/                   301
/work/       /projects/                       301
/personal/   /projects/                       301
```

**`_headers`:**
```
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
```

These files would then be honored natively by Cloudflare Pages.
