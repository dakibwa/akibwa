# Akibwa Core Site Notes

This repository is the public `akibwa.com` website.

- Treat everything committed here as public.
- Do not add credentials, tokens, `.env` files, booking references, account numbers, raw source exports, identifiers, or similar secrets.
- Vitals can surface aggregate health values on the public website when Dan explicitly approves it. Raw source exports, identifiers, and unreduced local dashboard artifacts still belong outside this repo.
- The site is a static Next.js export (`output: "export"`) deployed to GitHub Pages from `main`.
- Build check: `npm run build`.
