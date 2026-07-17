# Akibwa Core Site Notes

This repository is the public `akibwa.com` website.

- Treat everything committed here as public.
- Do not add credentials, tokens, `.env` files, booking references, account numbers, raw source exports, identifiers, or similar secrets.
- The site is a static Next.js export (`output: "export"`) deployed to GitHub Pages from `main`.
- Build check: `npm run build`.
- Public surface registry: `data/public-surfaces.json`.
- Pre-publish check: `npm run publish:ready`.

## Default Publish Flow

**Standing policy (Dan, 2026-06-23): completed changes go live immediately. Ship by default — do not ask for per-change approval, and do not park finished work behind an unmerged PR or leave it local-only.**

- For completed public Akibwa site changes: validate locally (`npm run build`), commit the scoped change, get it onto `main` (push directly, or open a PR and merge it straight away once checks pass — don't wait for a separate "please publish"), then confirm the GitHub Pages deploy succeeded and verify the live `akibwa.com` surface.
- Use `npm run build` for ordinary changes; use `npm run publish:ready` when publication metadata, public surface routing, cloud refresh checks, or generated public data are touched.
- Do not leave finished changes local-only unless Dan explicitly asks for a preview, local-only work, or a paused WIP state.
- If the checkout has unrelated local edits, use a clean worktree based on `origin/main` and stage only the intended files. Do not include, revert, or overwrite unrelated worktree changes.
- Pause before pushing only when validation fails, the change could expose private or sensitive data, the intended behaviour is ambiguous or high-impact, or credentials/secrets/public-data boundaries are involved. Outside those cases, ship without asking.
