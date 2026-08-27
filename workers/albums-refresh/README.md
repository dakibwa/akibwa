# Akibwa album wall Cloudflare Worker

Keeps the play counts on `akibwa.com/albums` current without an hourly commit to
a public repo.

- Scheduled hourly by Cloudflare cron (`23 * * * *`).
- Fetches `album-wall-manifest.json` from the live site, so the sleeve list has
  exactly one source of truth and this Worker never holds a stale copy of it.
- Reads the full overall `user.gettopalbums` library with an API key stored as a
  Cloudflare secret, and joins by exact normalised key.
- Serves 249 integers (about 4KB) at `/albums`.

The hard matching does **not** happen here. `scripts/refresh-album-plays.mjs`
resolves each sleeve against Last.fm at build time and bakes Last.fm's own
spelling into the manifest key, so this Worker only ever needs an exact lookup.
Its `normaliseKey()` must stay byte-identical to the one in that script.

Secrets are set with Wrangler and must never be committed:

```bash
npx wrangler secret put LASTFM_API_KEY --config workers/albums-refresh/wrangler.jsonc
npx wrangler secret put ADMIN_TOKEN --config workers/albums-refresh/wrangler.jsonc
```

Manual refresh:

```bash
curl -X POST https://akibwa-albums-refresh.dakibwa.workers.dev/refresh \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Public data and health:

```bash
curl https://akibwa-albums-refresh.dakibwa.workers.dev/albums
curl https://akibwa-albums-refresh.dakibwa.workers.dev/status
```
