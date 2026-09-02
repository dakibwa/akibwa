import coverCollisionData from "@/data/cover-collision-data.json";
import publicSurfaceConfig from "@/data/public-surfaces.json";

export const publicSurfaces = publicSurfaceConfig.surfaces;

export function getPublicSurface(id) {
  return publicSurfaces.find((surface) => surface.id === id) ?? null;
}

const coverCollisionSurface = getPublicSurface("cover-collision");

export const albumPlaysDataUrl = (
  process.env.NEXT_PUBLIC_ALBUM_PLAYS_DATA_URL ||
  getPublicSurface("albums")?.refresh?.dataUrl ||
  "https://akibwa-albums-refresh.dakibwa.workers.dev/albums"
).trim();

/* The refresh worker behind this was deleted on 27 August 2026 with the rest of
   the stale ones, and the url outlived it: every visit to /projects/cover-collision/
   still fetched a workers.dev host that answers 404, which the browser reports as
   a CORS failure and two red lines in the console. The series has a committed
   snapshot in data/cover-collision-data.json and reads from that; an empty url
   makes useCoverCollisionData return before it fetches anything. Set the env var
   or put a refresh block back in public-surfaces.json if it is ever live again. */
export const coverCollisionDataUrl = (
  process.env.NEXT_PUBLIC_COVER_COLLISION_DATA_URL ||
  coverCollisionSurface?.refresh?.dataUrl ||
  ""
).trim();

export const areaTiles = [
  {
    title: "Professional",
    descriptor: "Work I do for people",
    href: "/professional",
    image: "/area-art/professional-structure.webp",
    navImage: "/brand-art/nav/professional.webp",
    alt: "Cream sculptural architectural openings crossed by fine copper lines against a pale grey background",
    accent: "#a65f45",
    detail: "If it's done on a computer, I can help"
  },
  {
    title: "Projects",
    descriptor: "Things I've built",
    href: "/projects",
    image: "/area-art/about-reflection.webp",
    navImage: "/brand-art/nav/personal.webp",
    imagePosition: "50% 10%",
    alt: "Black-and-white artwork of a serene mask reflected in rippled water",
    accent: "#55585c",
    detail: "Curiosity, mostly"
  },
  {
    title: "About",
    descriptor: "A bit about me",
    href: "/about",
    image: "/area-art/about-meadow-flowers.jpg",
    navImage: "/brand-art/nav/about.webp",
    imagePosition: "50% 42%",
    alt: "Flower-crowned figures gathered in a luminous painted meadow",
    cardImage: "/about-mountain-meadow.webp",
    cardImagePosition: "50% 54%",
    cardAlt: "Sunlit mountain meadow with a layered data texture",
    accent: "#7d506f",
    detail: "Ten years in banks, now for anyone"
  },
  {
    title: "Contact",
    descriptor: "How can I help?",
    href: "/contact",
    image: "/area-art/contact-blue-clouds.webp",
    navImage: "/brand-art/nav/contact.webp",
    alt: "Bright blue sky with white clouds and a dotted data texture",
    accent: "#1f63db",
    detail: "One sentence is enough"
  }
];

export const coverCollisionUrl = process.env.NEXT_PUBLIC_COVER_COLLISION_URL || coverCollisionData.profileUrl || "https://www.instagram.com/dakibwa/";
export const coverCollisionPosts = coverCollisionData.posts;

export function isPersonalProjectLaunchable(project) {
  return project?.isLaunchable !== false;
}

export const personalProjects = [
  {
    number: "01",
    slug: "albums",
    aliases: ["lastfm-dashboard"],
    title: "The wall",
    type: "Record collection",
    dashboardLabel: "The wall",
    dashboardStatus: "Live on Akibwa",
    summary: "My whole record collection, ranked by how often I play it.",
    tags: ["Printed cards", "Play counts", "Last.fm"],
    visual: "albums",
    mode: "link",
    fallbackHref: "/albums/",
    cta: "Open the wall"
  },
  {
    number: "02",
    slug: "cover-collision",
    title: "Cover Collision",
    type: "Album art series",
    visual: "cover-collision",
    summary: "Two album covers, spliced into one.",
    tags: ["Cover mismatches", "Collage", "Recombination"],
    mode: "preview",
    externalHref: coverCollisionUrl,
    cta: "View posts"
  },
  {
    number: "03",
    slug: "portuguese-with-ines",
    title: "Português com a Inês",
    type: "Language teaching site",
    dashboardLabel: "Português com a Inês",
    dashboardStatus: "Independent site",
    summary: "Lessons, prices and booking for a teacher in Porto.",
    tags: ["European Portuguese", "Lessons", "Booking"],
    mode: "link",
    externalHref: "https://portuguesewithines.com/",
    cta: "Visit Inês’s site"
  },
  {
    number: "04",
    slug: "features",
    title: "features",
    type: "Daily puzzle",
    dashboardLabel: "features",
    dashboardStatus: "Live on Akibwa",
    summary: "Pull tangled features apart, ten nets a day.",
    tags: ["Daily nets", "Untangling", "Interpretability"],
    mode: "embed",
    embedUrl: "/features/index.html",
    fallbackHref: "/features/",
    useLocalFrame: false,
    cta: "Open on Akibwa"
  }
];
