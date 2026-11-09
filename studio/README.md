# Oh Life! Studios

The studio site at https://ohlifestudios.com: Dan's shared brand for Features, Portudo
and the website and booking for Português com a Inês. It lives here beside akibwa.com
and ships with it: every push to `main` that touches it deploys `studio/site/` to the
`ohlifestudios` Worker (`wrangler-studio.jsonc`). It moved here from
`dakibwa/ohlifestudios` on 9 November 2026, at Dan's request.

- `site/`: the whole site, buildless HTML and CSS served as it is. No JavaScript;
  `site/_headers` sets the CSP and security headers.
- `tools/`: what draws the art. `tools/type/` the Oh Life Pixel typeface, the logo and
  the mark; `tools/scenes/` the dithered landscapes and product shots.
- `DESIGN.md`: the design system, the same as the Oh Life! Design System artifact.

## Rules

- Credit Features (https://features.games/), Portudo (https://portudo.app/) and
  Português com a Inês (https://portuguesewithines.com/). The studio made Inês's website
  and booking; never imply it owns her teaching business. Link to the live sites.
- Public identity is Dan / Akibwa only, as for the rest of this repository.
- Product shots are dated screenshots of the live products, dithered by
  `tools/scenes/shots.py`. The Portudo map keeps its © OpenStreetMap · OpenMapTiles credit.
- Scenes are original renders in the style of Dan's paintings, never the paintings.
- Keep it fast, accessible and usable without JavaScript. No accounts, payments,
  analytics or services without Dan's explicit request.

## Preview, check and ship

```sh
python3 -m http.server -d studio/site 8811      # preview
npx wrangler deploy --config wrangler-studio.jsonc --dry-run
node scripts/check-studio-hosting.mjs https://ohlifestudios.com   # after a deploy
```

Look at the page at desktop and phone widths, by day and dark, and check the product
links before pushing.
