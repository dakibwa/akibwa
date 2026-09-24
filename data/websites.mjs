/*
 * The live websites Dan has built, shown in the homepage's Websites room.
 * Only public sites serving Dan's build belong here. Butterfly Rose's domain
 * still serves its previous Wix site, so it waits until Dan's build replaces
 * it. Castle Bank Electrical is live, but its team section shows Dan's full
 * name and photograph, which akibwa.com does not publish; it needs Dan's
 * explicit approval before it joins. `scripts/capture-websites.mjs`
 * screenshots each `href` unless the site uses an approved illustration
 * (`art`); `tall` pages are captured long enough to pan through.
 */
export const websites = [
  {
    id: "portuguese-with-ines",
    name: "Português com a Inês",
    href: "https://portuguesewithines.com/",
    domain: "portuguesewithines.com",
    note: "Inês’s one-to-one Portuguese lessons, with availability and booking in one place.",
    kind: "for Inês"
  },
  {
    id: "features",
    name: "features",
    href: "https://features.games/",
    domain: "features.games",
    note: "Ten small networks to untangle each day, with shapes to discover along the way.",
    kind: "my game"
  },
  {
    id: "top-250",
    name: "Dan’s top 250",
    href: "https://dans-top-250.pages.dev/",
    domain: "dans-top-250.pages.dev",
    note: "My 250 most-played songs, in order, with plays and listening hours.",
    kind: "my list",
    tall: true
  },
  {
    id: "trek",
    name: "The Trek",
    href: "/trek/",
    domain: "akibwa.com/trek",
    note: "Paris to Sofia on foot, told as a moving paper landscape.",
    kind: "my walk",
    art: "/project-art/personal/trek-paper-landscape.png"
  }
];
