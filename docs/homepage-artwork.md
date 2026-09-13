# Homepage artwork

## Akibwa identity

The orange lowercase `a` with an apricot terminal is the shared Akibwa social
and website mark. On the homepage it begins the custom orange word “age” inside
“Building in the age of AI”, with the existing introduction, light background
and project layout retained. The word is an inline image with accessible text;
its size follows the sentence and its descender aligns with the text baseline.
`public/brand-logos/akibwa-a.png` is the transparent single-letter master.
`public/favicon.svg`
embeds a small copy of that mark on charcoal. The square profile export is
`public/brand-logos/akibwa-avatar.png`; creating it does not update a social account.

Both exports were made with the built-in image tool on 13 September 2026 from
the selected `02 Ember` colourway. The two generation prompts were:

> Use case: logo-brand final export. The attached board contains the user's EXISTING selected Akibwa logo. Export ONLY the TOP MIDDLE '02 Ember' mark as ONE finished social profile picture, a perfectly square 1024x1024 PNG. Preserve the EXACT orange lowercase a silhouette, its irregular rounded bowl, curved top, small counter opening and integral apricot teardrop terminal at bottom-right. This is an exact clean artwork export, not a redesign. The a must be the exact same custom shape as the top-middle reference, never a substituted font glyph. Remove all board margins, all other variants, title, labels and text. Background: one solid fully opaque warm near-black charcoal #181615 edge to edge. Main a: one solid flat burnt orange #EF702F. Integral terminal: one solid flat apricot #FFC083. Center the complete mark horizontally and vertically, spanning 66% of canvas width and about 64% height, with generous charcoal margin so the complete silhouette remains within a circular avatar crop. Crisp smooth high-resolution vector-like edges, completely flat uniform solid colours; remove all texture, gradients and lighting. No extra elements, borders, rounded-square frame, drop shadow, text, letters beside the logo, or presentation mockup. Deliver only the finished square profile picture.

> Use case: background-extraction. Export the EXACT existing orange/apricot lowercase a in the reference on a genuinely transparent alpha background for a website masthead. Change only the charcoal background to transparency, including all charcoal inside the counter and open negative space. Keep the entire logo's exact outer silhouette, proportions, terminal shape, orange body and apricot terminal. Do not replace the letter with a font. Remove the canvas margins by framing closely around the complete mark with approximately 4 percent transparent padding on each edge, square canvas. The complete logo, including the teardrop, must remain fully visible. This is a production PNG cutout, not a checkerboard illustration or a white-background image. Smooth antialiased edges, no halo, no shadow, no glow, no added text or elements.

The image tool returned 1254×1254 masters. Keep those originals; resize only
the derived web assets.

### Inline age wordmark

`public/brand-logos/akibwa-age.png` is the 1983×793 wordmark master, generated
with the built-in image tool on 13 September 2026 using the existing `a` as the
reference. The `identityWord` slot serves 60–113px displays. Its white background
uses CSS multiply blending against the warm homepage paper. Keep this treatment
on a light surface. The favicon and social avatars retain the single `a`.

Generation prompt:

> Use case: logo-brand. Create one production-ready transparent PNG wordmark for the lowercase word "age", for inline use inside a website sentence. Input image 1 is the existing Akibwa lowercase a logo and is the identity to preserve: use this exact recognizable a silhouette as the first letter, including its rounded thick double-storey form, warm orange body, and the small apricot teardrop terminal at the bottom right. Extend it with carefully custom-drawn lowercase g and e in the SAME substantial soft rounded typographic style, same orange body color, matching stroke weight and x-height. The g should have a clear simple rounded bowl and compact curved descender; e a clear open counter. Optical kerning like a coherent word, not separate icons. Exact text, once only: age. Entire word must be clear at small website text size. Flat clean brand artwork, crisp edges, no shadows, no extra accents on g or e, no mockup, no surrounding sentence or extra logo. Preserve the existing a; do not replace it with a generic typeface a. Transparent alpha background, including letter counters; no charcoal tile, white matte, checkerboard or border. Wide horizontal canvas around the word with only a narrow even transparent safety margin; output aspect approximately 2.5:1. Orange #EF702F, apricot #FFC083.

Final background edit prompt (the generated transparency was a painted pattern,
so the website uses the verified white plate):

> Edit target: supplied age wordmark. Replace ALL grey checkerboard with perfectly plain pure white #FFFFFF, including every counter and space inside the letters. No checkerboard anywhere. Keep the complete word age with the EXACT same letter shapes, kerning, baseline, orange lettering and apricot a terminal; no redraw of letters, no gradients in the background, no shadows or texture. It must be a clean flat logo image on solid uniform white suitable for print. Tight wide crop with only a small white margin, with entire g descender visible. This time the requested background is opaque solid white, not transparent. Do not depict transparency.

## Taste artwork

The September 2026 homepage shows original film and television posters, game
cover art and publisher podcast sleeves. Keep the full lettering visible in
portrait poster frames; preserve square album and podcast sleeves. Retain their
original colours. The older custom Taste illustrations remain available to
their existing surfaces, but no longer replace posters on the homepage.

The film, TV and eighteen game covers reuse the existing approved assets.
Grouped series retain their existing representative cover. League of Legends
now uses Riot's blue-and-gold key visual from its [official website](https://www.leagueoflegends.com/en-us/).
Hearthstone uses Blizzard's illustrated tavern key art from its
[official website](https://hearthstone.blizzard.com/en-us/), framed towards the
characters on the right. Original plates remain untouched.

Twelve missing podcast covers were checked against their exact shows on
7 September 2026. They are saved under `public/podcast-covers/` and assigned in
`data/taste-curation.json`, which also supplies artwork when listening counts
are regenerated. Updating cover metadata must never recalculate or alter plays.

- [OpenAI Podcast](https://podcasts.apple.com/gb/podcast/openai-podcast/id1820330260)
- [The Ezra Klein Show](https://podcasts.apple.com/gb/podcast/the-ezra-klein-show/id1548604447)
- [Vampire Campfire](https://podcasts.apple.com/gb/podcast/vampire-campfire/id1734510849)
- [Dish](https://podcasts.apple.com/gb/podcast/dish/id1626354833)
- [The Always Sunny Podcast](https://open.spotify.com/show/0xDEeqWuoMNBUFGNrhIz6L)
- [Bite](https://open.spotify.com/show/0TNivCfDqUMOg02S7UIaIN)
- [JRE Clips](https://open.spotify.com/show/1LMmQF9PH8LjYrktU0Oq5Y)
- [Spotify Presents](https://open.spotify.com/show/2K5tDp2QRuZy16KTWoWq6B)
- [Veritasium](https://open.spotify.com/show/6EpB14Zj369GeJUKYXZ9e7)
- [DISCovery with Eric Senich](https://www.listennotes.com/podcasts/discovery-with-eric-senich-eric-senich-GMm1FbC-EZU/)
- [Jordan Peterson Archive](https://www.listennotes.com/podcasts/jordan-peterson-archive-lewis-convery-nTiDaZdXlvz/)
- [The TEFL and TESOL Podcast by ITTT](https://www.listennotes.com/podcasts/the-tefl-and-tesol-podcast-by-ittt-ittt-EtXmyzAuRv4/)

The final three use the original show artwork retained in a podcast directory
because their old provider listings are unavailable or changed. In particular,
the former Apple ID for Jordan Peterson Archive now belongs to a different show;
do not take its new artwork. `Keto In the UK - The Podcast` retains a clearly
labelled fallback because its original cover could not be verified. Coverage:
117 of 118 recorded shows. Never substitute a similarly named podcast.

## Project covers

Português com a Inês retains the supplied conversation image. Its homepage
variant uses a 1.3× crop at 0% horizontal / 30% vertical, emphasising the woman
and speech shapes on the left. The full source image is unchanged. The image's
`left-crop` revision refreshes browser caches despite using that same source.

Trek's generated master is `public/project-art/personal/trek-paper-landscape.png`.
It was made with the built-in image generation tool on 7 September 2026,
referencing `docs/trek-paper-concept.png` and the current Trek presentation.
It is an evocative illustration, not a geographic map. The separate actual
journey continues to use its approved route and geography.

Generation prompt:

Create a beautifully detailed panoramic website project-cover illustration for Trek, an on-foot journey from Paris to Sofia. Use the supplied image as the material, light, landscape-density and colour reference, and transform its portrait map composition into a newly composed horizontal landscape image, aspect ratio 2.5:1. The current Trek experience uses tactile paper terrain, dense varied folded sage woodland, pale buildings with warm terracotta roofs, softly textured olive and ochre fields, muted blue rivers and a deep dusty red walking route. Show a richly layered European valley from a high oblique camera: closely grouped miniature villages, coherent varied tree canopies and forests, quilt-like fields following softly sculpted hills, a narrow blue river and an elegant continuous deep-red path weaving across the valley. Let the path draw the eye diagonally from the lower left through the central village towards distant hills on the right. Beautiful coherent warm soft light from upper left, soft paper edges, fine paper grain, exquisite miniature craft, real depth, quiet atmospheric distance. Keep most recognizable village and red-path detail within the central 65 percent of image height so it remains expressive when cropped to a very wide 5:2 card. Dense, abundant, natural and picturesque, subtly irregular hand-made forms, sophisticated editorial quality. Full-bleed art only: no text, no title, no logo, no letters, no numbers, no interface, no frame, no floating map pins. Do not copy the reference's UI or exact map geometry. This is an evocative artistic cover, not a navigational map. Avoid plastic, glossy 3D, blank expanses, low-poly videogame look, and repetitive identical trees.
