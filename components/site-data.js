import coverCollisionData from "@/data/cover-collision-data.json";
import akibwapediaPacket from "@/data/akibwapedia-data.json";
import publicSurfaceConfig from "@/data/public-surfaces.json";

export const contactEmail = "***REMOVED***";
export const akibwapediaData = akibwapediaPacket;

export const publicSurfaces = publicSurfaceConfig.surfaces;

export function getPublicSurface(id) {
  return publicSurfaces.find((surface) => surface.id === id) ?? null;
}

const chorusSurface = getPublicSurface("chorus");
const vitalsSurface = getPublicSurface("vitals");
const coverCollisionSurface = getPublicSurface("cover-collision");

export const chorusAppUrl = (process.env.NEXT_PUBLIC_CHORUS_APP_URL || chorusSurface?.defaultAppUrl || "").trim();
export const vitalsAppUrl = (process.env.NEXT_PUBLIC_VITALS_APP_URL || vitalsSurface?.defaultAppUrl || "").trim();
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
    image: "/area-art/personal-rochegrosse-flowers.webp",
    alt: "Georges Rochegrosse's The Knight of the Flowers: an armored figure surrounded by flower-crowned figures in a luminous meadow",
    accent: "#2f88ff",
    detail: "Chorus, Vitals, Cover Collision, and more"
  },
  {
    title: "Professional",
    descriptor: "Systems for companies",
    href: "/professional",
    image: "/area-art/personal-tiles.webp",
    alt: "Ceramic tile mosaic of glazed blue, orange, and green tiles with raised flowers, leaves, and abstract shapes",
    accent: "#ff6f1a",
    detail: "Discovery, build, and handover for company systems"
  },
  {
    title: "About",
    descriptor: "How I think and build",
    href: "/about",
    image: "/area-art/about-reflection.jpg",
    imagePosition: "50% 10%",
    alt: "Black-and-white artwork of a serene mask reflected in rippled water",
    accent: "#2c8068",
    detail: "Background, working principles, and the current toolkit"
  },
  {
    title: "Contact",
    descriptor: "Send the messy bit",
    href: "/contact",
    image: "/area-art/contact-redon-star.jpg",
    imagePosition: "50% 44%",
    alt: "Odilon Redon's And there fell a great star from heaven burning as it were a lamp: a red falling star bursting through a dark field",
    accent: "#e2556b",
    detail: "Email, X, or Instagram — bring the messy workflow"
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
      "Server-side Last.fm fetching, normalization, caching, charts, editorial summaries, and graceful handling for missing artwork or sparse data.",
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

export const personalProjects = [
  {
    number: "01",
    slug: "chorus",
    aliases: ["lastfm-dashboard"],
    title: "Chorus",
    type: "Listening archive",
    image: featuredProjects[0].image,
    alt: featuredProjects[0].alt,
    dashboardLabel: "Chorus",
    dashboardStatus: "Live on Akibwa",
    summary: "Turns listening history into a clear music dashboard.",
    tags: ["Listening archive", "Albums wall", "Reports"],
    visual: "chorus",
    mode: "embed",
    embedUrl: chorusAppUrl,
    localUrl: "http://localhost:3211",
    fallbackHref: "/chorus",
    cta: "Open on Akibwa"
  },
  {
    number: "02",
    slug: "vitals",
    title: "Vitals",
    type: "Health Intelligence",
    image: "/project-art/personal/albion-rose-card.webp",
    alt: "William Blake's Albion Rose: a radiant figure with outstretched arms against red, gold, and blue light",
    dashboardLabel: "Health Dashboard",
    dashboardStatus: "Live on Akibwa",
    visual: "vitals",
    summary: "Surfaces aggregate health signals for clearer review conversations.",
    tags: ["Health dashboard", "Source freshness", "Review prompts"],
    mode: "preview",
    fallbackHref: "/health",
    cta: "Open on Akibwa"
  },
  {
    number: "03",
    slug: "cover-collision",
    title: "Cover Collision",
    type: "Album Art Mergers",
    image: coverCollisionPosts[0].image,
    alt: coverCollisionPosts[0].alt,
    visual: "cover-collision",
    summary: "Merges album covers into playful visual recombinations.",
    tags: ["Cover mismatches", "Collage", "Recombination"],
    mode: "preview",
    externalHref: coverCollisionUrl,
    cta: "View posts"
  },
  {
    number: "04",
    slug: "personal-knowledge-base",
    title: "Personal Knowledge Base",
    type: "Private AI memory system",
    image: "/project-art/personal/knowledge-apple-card.webp",
    alt: "Painterly collage of a bitten red apple on a yellow field above green patterned foliage",
    summary:
      akibwapediaData.subtitle ||
      "Helps Codex use local, source-backed context without exposing raw records.",
    tags: ["Public-safe", "Source discipline", "Private system"],
    mode: "preview",
    cta: akibwapediaData.public_status || "Public-safe packet"
  }
];

export const capabilities = [
  {
    title: "Workflow Design",
    number: "01",
    body:
      "Map the real work, hand-offs, decisions, bottlenecks, and ownership before choosing what to automate."
  },
  {
    title: "Dashboards & Data Products",
    number: "02",
    body:
      "Turn raw data into tools people can use to understand, decide, and act."
  },
  {
    title: "Internal Tools",
    number: "03",
    body:
      "Build interfaces and utilities that make repeated work faster, clearer, and easier to trust."
  },
  {
    title: "Automation",
    number: "04",
    body:
      "Remove manual steps, connect tools, and design reliable human-in-the-loop handovers."
  },
  {
    title: "Prototypes",
    number: "05",
    body:
      "Ship small working versions fast enough to test ideas and create real evidence."
  },
  {
    title: "Knowledge Systems",
    number: "06",
    body:
      "Capture, structure, and retrieve private context without losing source discipline."
  }
];

export const sprintIncludes = [
  "Workflow audit and opportunity map",
  "One selected workflow with a clear owner",
  "System design and working first version",
  "Testing with real or safely anonymized examples",
  "Documentation and handover",
  "Next-step roadmap"
];

export const goodProblems = [
  "Your team rebuilds the same client update, report, or handover by hand.",
  "The information exists, but it lives across inboxes, docs, spreadsheets, and tools.",
  "Quality depends on one person remembering all the context.",
  "AI experiments are happening, but no workflow has become durable.",
  "You need a first useful system before deciding whether to invest further."
];
