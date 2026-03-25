# Dakibwa

Dakibwa is the canonical `akibwa.com` repo in `Projects/Dakibwa`.

It now contains:

- the React family archive homepage
- the published running dashboard at `public/dashboard.html`
- the Cloudflare Worker used for dashboard OAuth and token refresh in `worker/`
- the local dashboard launcher in `local-dashboard/`

V1 replaces the old constellation homepage with a polished, static family-tree experience centred on:

- a clickable tree spanning both main family branches
- a sticky person detail panel on the homepage
- lightweight shareable person-record pages without bringing in a routing dependency
- a first-pass data model that can be expanded later when private editing and verified records are ready

## Stack

- Vite
- React
- TypeScript
- Cloudflare Worker (dashboard auth/data proxy)

## Local development

```bash
npm install
npm run dev
```

## Dashboard

- Published page: `public/dashboard.html`
- Worker source: `worker/`
- Local launcher: `local-dashboard/Start Dashboard.command`

## Build

```bash
npm run build
```
