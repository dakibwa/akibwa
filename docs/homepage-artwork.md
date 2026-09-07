# Homepage artwork

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
