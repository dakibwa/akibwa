# Akibwa Core Site Notes

This repository is the public `akibwa.com` website.

- Treat everything committed here as public.
- Do not add credentials, tokens, `.env` files, booking references, account numbers, raw source exports, identifiers, or similar secrets.
- Vitals can surface aggregate health values on the public website when Dan explicitly approves it. Raw source exports, identifiers, and unreduced local dashboard artifacts still belong outside this repo.
- The site is a static Next.js export (`output: "export"`) deployed to GitHub Pages from `main`.
- Build check: `npm run build`.

## Default Publish Flow

- For completed public Akibwa site changes, default to shipping them: validate locally, commit the scoped change, push to `main`, wait for the GitHub Pages deploy, and verify the live `akibwa.com` surface.
- Use `npm run build` for ordinary changes; use `npm run publish:ready` when publication metadata, public surface routing, cloud refresh checks, or generated public data are touched.
- Do not leave finished changes local-only unless Dan explicitly asks for a preview, local-only work, or a paused WIP state.
- If the checkout has unrelated local edits, use a clean worktree based on `origin/main` and stage only the intended files. Do not include, revert, or overwrite unrelated worktree changes.
- Pause before pushing only when validation fails, the change could expose private or sensitive data, the intended behavior is ambiguous or high-impact, or credentials/secrets/public-data boundaries are involved.
