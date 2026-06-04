# Akibwa Chorus Cloudflare Worker

This Worker refreshes the public Chorus / Last.fm dashboard data without hourly GitHub commits.

- Scheduled hourly by Cloudflare cron.
- Reads Last.fm with an API key stored as a Cloudflare secret.
- Keeps only public dashboard summary JSON in KV.
- Serves the public JSON at `/chorus`.

Secrets are set with Wrangler and must never be committed:

```bash
npx wrangler secret put LASTFM_API_KEY --config workers/chorus-refresh/wrangler.jsonc
npx wrangler secret put ADMIN_TOKEN --config workers/chorus-refresh/wrangler.jsonc
```

Manual refresh:

```bash
curl -X POST https://akibwa-chorus-refresh.dakibwa.workers.dev/refresh \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Public aggregate data:

```bash
curl https://akibwa-chorus-refresh.dakibwa.workers.dev/chorus
```
