# Homepage interaction and privacy contract

Akibwa is a short editorial index, not a personal profile. Run `npm run check:navigation` on every build and `npm run check:navigation:dom` before publication.

## Public index

- `/` renders the Akibwa brand, the proposition “Building in the age of AI.”, three current projects and three capability blocks.
- The page contains no personal name, career timeline, residential history, taste archive or direct social links.
- The email control is available to people using the page but the address is assembled only after activation; it must not appear in static HTML.
- The root may be indexed, but image indexing and long search snippets are restricted. It is the only sitemap entry.
- Detailed archives and project-detail routes use `noindex`. Crawlers remain allowed in `robots.txt` so they can read those directives.

## Layout and interaction

- The hero uses a two-column editorial composition on wide screens and one reading column on narrow screens.
- Project cards share one image-above-caption anatomy. On pointer devices, the explanatory detail opens beneath the active card. On phones, projects form a native horizontal snap rail and their descriptions remain visible without hover.
- Capabilities are three restrained editorial slabs on wide screens and a single column on phones. Their motion is disabled when reduced motion is requested.
- The green hero rule and rose capability rule run to the viewport edges while content remains on the shared grid.
- Images disable native dragging and touch callouts without stealing the enclosing link or button target.

## Standalone project surfaces

- Features may show a compact Akibwa banner when entered from the homepage. That banner stays brand-only.
- The Trek is always standalone and excluded from search and image indexes. Its route is abstracted; the separate Trek privacy contract owns its data and image allow-lists.
