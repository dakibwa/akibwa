# Oh Life! design system

Rebuilt from blank on 9 November 2026: Dan asked for everything (logo, copy, system) to start again from his dithered sunset paintings. The same system is published as the **Oh Life!** Design System artifact: https://claude.ai/artifact/WZg3QxwnDGVdz65de5voS1 (private; Dan shares it from its Share menu). Keep the two in step: tokens live at the top of `studio/site/styles.css`.

The design system of Oh Life! Studios, Dan's one-person studio. It started blank on 9 Nov 2026 and everything in it comes from one place: Dan's dithered pixel paintings of hills at sunset. Cream skies, pink and apricot cloud bands, mauve far ranges, dark forest and bright fields, all drawn in visible dots.

## The idea

Every page is a landscape. The sky is the page, the ground is the footer, and the products are held up in front of the view like postcards. The studio's line, "Oh Life! I'm so glad I got in!", is written in the sky.

## Voice

- First person, plain and warm: "I make useful, unhurried things for the internet."
- Short. One sentence per project, then a link with a verb: "Play today ↗", "Get around ↗", "Meet Inês ↗".
- Name things by what they do for someone, not by category ("a map that gets you across Porto", not "a transit app").
- Honest about whose work is whose: the Inês site is "the website and booking"; the teaching is hers.
- The ! is earned. It appears in the name and in Dan's line, and nowhere else in copy.

## Visual foundations

**Colour.** Two kinds of colour. *Page colours* carry text: `sky` ground, `ink` text, `ink-2` quiet text, `coral` for the bang in a headline. *Art colours* (`peach`, `salmon`, `mauve`, `forest`, `leaf`, `field`) live only inside paintings and the mark; never put text on them. Dusk swaps the ground to forest ink; the paintings do not change, because a sunset is a sunset.

**Type.** Two faces. *Oh Life Pixel* (drawn for this system, `fonts/ohlife-pixel.woff2`) for the headline, titles, kickers and links: one art pixel is a tenth of its font size, so it is only ever set at 10, 20, 30, 40, 50 or 70px, with smoothing off, so each pixel lands on whole device pixels. *Inter* for reading: the lede and every sentence. Never set body copy in the pixel face.

**Pixels.** `p` (4px) is one art pixel on the page. Frames are one pixel wide in `line`; the shadow is `drop`, a hard two-pixel offset, never blurred. No radius anywhere (`radius-0`). Images that are pixel art are always shown with `image-rendering: pixelated`.

**Paintings.** Scenes are original renders from `tools/scenes/paint.py` (layered ridges, painted canopy, fields in perspective, an ordered 4×4 Bayer dither against a 40-colour palette). They are drawn small (320×200, 400×250 for the hero) and scaled up. Never use Dan's reference images themselves.

**Products.** Screenshots of Features, Portudo and Português com a Inês are dithered the same way (`tools/scenes/shots.py`): whites warmed to `sky`, blacks to `ink`, 32 colours. They stay legible; they are the real interfaces.

**Motion.** Almost none: a postcard's screen lifts one pixel on hover, in two steps. Off under reduced motion.

## Logo and mark

The logo is "Oh Life" in the pixel face at two pixels per pixel, the ! drawn larger than the caps and leaning into the sky in a dithered `bang` ramp, with STUDIOS set small under it. `oh-life-logo-cream.svg` is the same for dark grounds. The mark is a 16×16 tile of the ! standing over a hill, for favicons and the footer. Built by `tools/type/logo.py`; never redraw them by hand.

## Accessibility

Text is `ink` or `ink-2` on `sky` (14.7:1 and 7.1:1 by day), and the coral ! is 4.8:1. Headline text over a painting always sits on its sky, never on hills. Links are underlined with a one-pixel bar; focus is a 4px ring in the current colour.

## Making the art

- Typeface: edit `tools/type/glyphs.txt`, then `python3 studio/tools/type/build.py` (needs fontTools and brotli).
- Logo and mark: `cd studio/tools/type && python3 logo.py`.
- Scenes: `SW=400 SH=250 python3 studio/tools/scenes/paint.py out hills` (wide hero), `SW=240 SH=400 … hills` (phone hero), `SW=320 SH=200 … valley mountains ocean hills` (postcards); copy the dithered PNGs into `studio/site/assets/scenes/`.
- Product shots: `python3 studio/tools/scenes/shots.py` dithers the dated screenshots into `studio/site/assets/shots/`.
