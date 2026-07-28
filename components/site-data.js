import coverCollisionData from "@/data/cover-collision-data.json";
import publicSurfaceConfig from "@/data/public-surfaces.json";

export const contactEmail = "***REMOVED***";

export const publicSurfaces = publicSurfaceConfig.surfaces;

export function getPublicSurface(id) {
  return publicSurfaces.find((surface) => surface.id === id) ?? null;
}

const chorusSurface = getPublicSurface("chorus");
const coverCollisionSurface = getPublicSurface("cover-collision");

export const chorusAppUrl = (process.env.NEXT_PUBLIC_CHORUS_APP_URL || chorusSurface?.defaultAppUrl || "").trim();
export const coverCollisionDataUrl = (
  process.env.NEXT_PUBLIC_COVER_COLLISION_DATA_URL ||
  coverCollisionSurface?.refresh?.dataUrl ||
  "https://akibwa-cover-collision-refresh.dakibwa.workers.dev/cover-collision"
).trim();

export const areaTiles = [
  {
    title: "Personal",
    descriptor: "Self-built projects",
    href: "/personal",
    image: "/area-art/about-reflection.webp",
    navImage: "/brand-art/nav/personal.webp",
    imagePosition: "50% 10%",
    alt: "Black-and-white artwork of a serene mask reflected in rippled water",
    accent: "#55585c",
    detail: "Chorus, Cover Collision and three more"
  },
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
    title: "About",
    descriptor: "How I think and build",
    href: "/about",
    image: "/area-art/about-meadow-flowers.jpg",
    navImage: "/brand-art/nav/about.webp",
    imagePosition: "50% 42%",
    alt: "Flower-crowned figures gathered in a luminous painted meadow",
    cardImage: "/about-mountain-meadow.webp",
    cardImagePosition: "50% 54%",
    cardAlt: "Sunlit mountain meadow with a layered data texture",
    accent: "#7d506f",
    detail: "Ten years of it, and what I do with it now"
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

export const featuredProjects = [
  {
    title: "Chorus",
    type: "Data product",
    image: "/project-art/personal/chorus-trio.webp",
    alt: "Pattachitra-style folk painting of three wide-eyed figures playing flute, drum, and veena under an ornate arch with music notes",
    summary:
      "A listening archive that turns Last.fm data into artists, albums, tracks, timelines, and listening reports.",
    problem:
      "Music history is rich, but the raw API is inconsistent, incomplete, and hard to interpret over time.",
    built:
      "Server-side Last.fm fetching, normalisation, caching, charts, editorial summaries, and graceful handling for missing artwork or sparse data.",
    proves:
      "API integration, data modelling, dashboard design, and the ability to make messy personal data readable.",
    matters:
      "The same pattern applies to client reporting: pull scattered signals into one surface people can understand and act from.",
    stack: ["Next.js", "TypeScript", "Last.fm API", "Recharts", "Framer Motion"],
    accent: "blue"
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
    slug: "chorus",
    aliases: ["lastfm-dashboard"],
    title: "Chorus",
    type: "Listening archive",
    image: featuredProjects[0].image,
    alt: featuredProjects[0].alt,
    shot: "/project-shots/chorus.webp",
    dashboardLabel: "Chorus",
    dashboardStatus: "Live on Akibwa",
    summary: "Everything I've ever listened to, made browsable.",
    tags: ["Listening archive", "Albums wall", "Reports"],
    visual: "chorus",
    mode: "embed",
    previewTreatment: "chorus-vignette",
    embedUrl: chorusAppUrl,
    localUrl: "http://localhost:3211",
    fallbackHref: "/chorus",
    cta: "Open on Akibwa"
  },
  {
    number: "02",
    slug: "cover-collision",
    title: "Cover Collision",
    type: "Album art series",
    image: coverCollisionPosts[0].image,
    alt: coverCollisionPosts[0].alt,
    visual: "cover-collision",
    summary: "Two album covers, spliced into one.",
    tags: ["Cover mismatches", "Collage", "Recombination"],
    mode: "preview",
    externalHref: coverCollisionUrl,
    cta: "View posts"
  },
  {
    number: "03",
    slug: "meditator",
    title: "Meditator",
    type: "Shared meditation",
    image: "/project-art/personal/albion-rose-card.webp",
    alt: "William Blake's Albion Rose: a radiant figure with outstretched arms",
    dashboardLabel: "Meditator",
    dashboardStatus: "Live on Akibwa",
    summary: "A private meditation room for two.",
    tags: ["Two-person", "Synced timer", "Presence"],
    mode: "embed",
    previewTreatment: "meditator-vignette",
    embedUrl: "/meditator/index.html",
    fallbackHref: "/meditator/",
    localUrl: "http://localhost:8787",
    useLocalFrame: false,
    cta: "Open on Akibwa"
  },
  {
    number: "04",
    slug: "one-bag",
    title: "One Baggers",
    type: "One-bag travel",
    image: "/project-art/personal/albion-sunburst-hero.webp",
    alt: "Radiant sunburst over a luminous horizon",
    dashboardLabel: "One Baggers",
    dashboardStatus: "In development",
    statusLabel: "In development",
    isLaunchable: false,
    summary: "Pack for a week in one bag.",
    tags: ["Packing optimiser", "Gear comparison", "Local-first"],
    mode: "preview",
    previewTreatment: "one-bag-vignette",
    cta: "In development"
  }
];

