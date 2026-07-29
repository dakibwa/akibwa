# Akibwa Core Site Notes

This repository is the public `akibwa.com` website.

- Treat everything committed here as public.
- Do not add credentials, tokens, `.env` files, booking references, account numbers, raw source exports, identifiers, or similar secrets.
- The site is a static Next.js export (`output: "export"`) deployed to GitHub Pages from `main`.
- Build check: `npm run build`.
- Public surface registry: `data/public-surfaces.json`.
- Pre-publish check: `npm run publish:ready`.

## Artwork and images

`output: "export"` forces `images.unoptimized`, so `next/image` cannot resize
anything — it emits a plain `<img>` with the original file. Responsive variants
are therefore pre-rendered at build time and committed.

- Render artwork with `<SiteImage>` (`components/site-image.jsx`), never a bare
  `<img>` or `next/image`. It emits AVIF with a WebP fallback and the right
  `srcset`. CSS backgrounds go through `resolveBackground()`.
- Every image is bound to a **slot** — the layout it renders into — in
  `scripts/generate-image-variants.mjs`. A slot carries the aspect ratio, the
  CSS widths it takes at real breakpoints, and the `object-position` the layout
  applies. Variants are cropped to the slot, so the crop position must match
  what the CSS does or the artwork silently reframes.
- After adding or replacing artwork: `npm run images:generate`, and commit
  `public/_img/` and `components/image-variants.json` with it.
- `npm run check:images` (part of `publish:ready`) fails if a source has changed
  since its variants were generated.
- The ladder caps at 1.5x DPR. The artwork is grain-heavy, and grain hides the
  difference between 1.5x and 2x while costing about 1.8x the bytes.
- **Export artwork once, at final size.** Re-encoding an already-lossy WebP
  keeps the previous generation's artefacts as detail and inflates the file:
  `contact-blue-clouds.webp` costs 437K for 899x1198 that way, and no amount of
  re-encoding recovers it — only resizing does.

## Default Publish Flow

**Standing policy (Dan, 2026-06-23): completed changes go live immediately. Ship by default — do not ask for per-change approval, and do not park finished work behind an unmerged PR or leave it local-only.**

- For completed public Akibwa site changes: validate locally (`npm run build`), commit the scoped change, get it onto `main` (push directly, or open a PR and merge it straight away once checks pass — don't wait for a separate "please publish"), then confirm the GitHub Pages deploy succeeded and verify the live `akibwa.com` surface.
- Use `npm run build` for ordinary changes; use `npm run publish:ready` when publication metadata, public surface routing, cloud refresh checks, or generated public data are touched.
- Use the smallest relevant check while iterating. Markdown and `docs/**`-only changes do not require a site build or deployment; the Pages workflow intentionally ignores them.
- Do not leave finished changes local-only unless Dan explicitly asks for a preview, local-only work, or a paused WIP state.
- If the checkout has unrelated local edits, use a clean worktree based on `origin/main` and stage only the intended files. Do not include, revert, or overwrite unrelated worktree changes.
- Pause before pushing only when validation fails, the change could expose private or sensitive data, the intended behaviour is ambiguous or high-impact, or credentials/secrets/public-data boundaries are involved. Outside those cases, ship without asking.

## Documentation and Notion handoff

- Git and the live site own implementation and delivery truth. Update the relevant repository documentation in the same commit whenever a material change alters public behaviour, architecture, publishing, or the next product milestone.
- The existing Life & Work orientation record is **Akibwa Website (Hub)**. Find it by that exact title; do not create another project tracker.
- After a material change is committed, published, and verified live, update that row with only the corrected status, evidence date/source, and one next executable action.
- Do not update Notion for trivial edits or paste commit/test logs there. Never store credentials, private source material, or secrets in Notion.
