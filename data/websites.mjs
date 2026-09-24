/*
 * The websites Dan has built, shown in the homepage's Websites room with the
 * previous homepage's project cards. Dan chose these three on 24 September
 * 2026; Features and The Trek have their own places on the front page.
 *
 * Cards whose artwork is a screenshot carry `capture`, used by
 * scripts/capture-websites.mjs. Castle Bank's home page greets visitors with
 * named photographs of its founders; akibwa.com does not publish Dan's full
 * name or likeness, so the capture hides them (`hide`). Butterfly Rose is in
 * review with the salon and not yet on its own domain, so it has no link, and
 * its capture comes from a local review build (`review`).
 */
export const websites = [
  {
    id: "portuguese",
    className: "concept-portuguese",
    href: "https://portuguesewithines.com/",
    title: "Português com a Inês",
    subtitle: "Portuguese lessons",
    description: "Inês’s Portuguese lessons, with availability and booking in one place.",
    src: "/project-art/personal/portuguese-with-ines-conversation.png",
    imageRevision: "left-crop",
    alt: "Two people talking over coffee as colourful speech shapes meet between them",
    accent: "#7faaff",
    previewFirst: true
  },
  {
    id: "castle-bank",
    className: "concept-castle-bank",
    href: "https://www.castle-bank.com/",
    title: "Castle Bank",
    subtitle: "electrical contractors",
    description: "Commercial electrical installation, testing and maintenance, set out plainly for the businesses that need it.",
    src: "/project-art/websites/castle-bank.webp",
    alt: "Castle Bank’s home page: an orange and black headline beside a swirl of orange sparks",
    accent: "#f26b1d",
    capture: { url: "https://www.castle-bank.com/", hide: [".hero-team"] }
  },
  {
    id: "butterfly-rose",
    className: "concept-butterfly-rose",
    href: null,
    title: "Butterfly Rose",
    subtitle: "hair salon · coming soon",
    description: "A calm, elegant site for a hair salon in Otley: services and prices, the team, bridal and how to book.",
    src: "/project-art/websites/butterfly-rose.webp",
    alt: "Butterfly Rose’s home page: a serif headline beside a photograph of the salon’s mirrors and chairs",
    accent: "#7c4650",
    capture: { review: true }
  }
];
