/*
 * The websites Dan has built, shown in the homepage's Websites room with the
 * previous homepage's project cards. Dan chose these three on 24 September
 * 2026; Features and The Trek have their own places on the front page.
 *
 * Each card is an illustration in the manner of Português com a Inês's rather
 * than a screenshot of the site: Dan made Castle Bank's and Butterfly Rose's
 * on 25 September 2026. Butterfly Rose is in review with the salon and not
 * yet on its own domain, so it has no link (`inReview`). Castle Bank's site
 * names and pictures its founders, Dan included, so its card does not link
 * there until Dan says so (26 September 2026).
 */
export const websites = [
  {
    id: "portuguese",
    className: "concept-portuguese",
    href: "https://portuguesewithines.com/",
    title: "Português com a Inês",
    subtitle: "Portuguese lessons",
    description: "Portuguese lessons with Inês, booked in one place.",
    src: "/project-art/personal/portuguese-with-ines-conversation.png",
    imageRevision: "left-crop",
    alt: "Two people talking over coffee as colourful speech shapes meet between them",
    accent: "#7faaff",
    previewFirst: true
  },
  {
    id: "castle-bank",
    className: "concept-castle-bank",
    href: null,
    title: "Castle Bank",
    subtitle: "electrical contractors",
    description: "Commercial electrical work, set out plainly.",
    src: "/project-art/websites/castle-bank.webp",
    alt: "The Castle Bank Electrical mark beside a pencil drawing of an office building, orange conduit running into an open distribution board",
    accent: "#f26b1d"
  },
  {
    id: "butterfly-rose",
    className: "concept-butterfly-rose",
    href: null,
    title: "Butterfly Rose",
    subtitle: "hair salon · coming soon",
    description: "A calm, elegant site for an Otley salon.",
    src: "/project-art/websites/butterfly-rose.webp",
    alt: "A woman leans back in a salon chair as her long hair streams into ribbons, rose petals and butterflies under a stylist’s hand",
    accent: "#7c4650",
    inReview: true
  }
];
