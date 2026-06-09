# Akibwa Cover Collision Cloudflare Worker

This Worker is the public refresh runner for Cover Collision / Instagram album-art posts.

- Scheduled daily by Cloudflare cron.
- Serves public post metadata at `/cover-collision`.
- Stores only public post metadata in KV.
- Uses the Instagram API when credentials are configured.
- Falls back to the public Instagram profile endpoint when the API token is absent.
- Uses the checked-in seed only when live Instagram reads fail.

Secrets are set with Wrangler and must never be committed:

```bash
npx wrangler secret put ADMIN_TOKEN --config workers/cover-collision-refresh/wrangler.jsonc
npx wrangler secret put INSTAGRAM_ACCESS_TOKEN --config workers/cover-collision-refresh/wrangler.jsonc
```

Optional non-secret vars:

- `INSTAGRAM_USERNAME`: defaults to `dakibwa`
- `INSTAGRAM_USER_ID`: only needed for Graph API business/creator account media endpoints
- `INSTAGRAM_PUBLIC_APP_ID`: optional override for the public profile endpoint app id

Manual refresh:

```bash
curl -X POST https://akibwa-cover-collision-refresh.dakibwa.workers.dev/refresh \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Public data:

```bash
curl https://akibwa-cover-collision-refresh.dakibwa.workers.dev/cover-collision
```
