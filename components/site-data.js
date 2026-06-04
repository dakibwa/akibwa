import coverCollisionData from "@/data/cover-collision-data.json";

export const contactEmail = "***REMOVED***";
export const chorusAppUrl = (process.env.NEXT_PUBLIC_CHORUS_APP_URL || "").trim();
export const vitalsAppUrl = (process.env.NEXT_PUBLIC_VITALS_APP_URL || "").trim();
const chorusAppIsConfigured = Boolean(chorusAppUrl);
const vitalsAppIsConfigured = Boolean(vitalsAppUrl);

export const areaTiles = [
  {
    title: "About",
    descriptor: "How I think and build",
    href: "/about",
    image: "/area-art/knowledge.png",
    alt: "Abstract evidence artwork with document layers, source lines, and annotations"
  },
  {
    title: "Personal",
    descriptor: "Self-built projects",
    href: "/personal",
    image: "/area-art/work.png",
    alt: "Abstract collage of interface fragments, paper proofs, and data marks"
  },
  {
    title: "Professional",
    descriptor: "Systems for companies",
    href: "/professional",
    image: "/area-art/offer.png",
    alt: "Abstract artwork showing a path from messy marks into a precise output"
  },
  {
    title: "Contact",
    descriptor: "Send the messy bit",
    href: "/contact",
    image: "/area-art/contact.png",
    alt: "Minimal abstract contact artwork with an open doorway and cursor gesture"
  }
];

export const featuredProjects = [
  {
    title: "Chorus",
    type: "Data product",
    image: "/project-art/personal/chorus-collective.jpg",
    alt: "Abstract paper collage of listeners gathered in a turquoise pool with constellations and a wavy listening path",
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

export const workProjects = [
  {
    number: "01",
    slug: "chorus",
    aliases: ["lastfm-dashboard", "signals-dashboard"],
    title: "Chorus",
    type: "Music intelligence dashboard",
    image: "/project-art/personal/chorus-collective.jpg",
    alt: "Abstract paper collage of listeners gathered in a turquoise pool with constellations and a wavy listening path",
    score: "FM",
    metrics: [
      ["Listening", "API"],
      ["Artists", "Charts"],
      ["Albums", "Cache"],
      ["Reports", "Live"]
    ],
    rows: [
      [
        "The state",
        chorusAppIsConfigured
          ? "Live as a separate Chorus app; the public site links through to that app rather than duplicating it."
          : "Built as a separate Chorus app; the public site keeps a preview until the live app URL is configured."
      ],
      ["What it does", featuredProjects[0].summary],
      ["The problem", featuredProjects[0].problem],
      ["Public note", "The live dashboard remains a separate project environment, so the website should hand off to it instead of becoming a second copy."]
    ]
  },
  {
    number: "02",
    slug: "vitals",
    title: "Vitals",
    type: "Personal health signal dashboard",
    image: "/project-art/personal/vitals-signal.jpg",
    alt: "Abstract green paper collage of a health dashboard, profile silhouette, ECG heart, activity, hydration, sleep, and plant signals",
    visual: "vitals",
    score: "VT",
    metrics: [
      ["Signals", "Live"],
      ["Sources", "Mapped"],
      ["Review", "Clinician"],
      ["Output", "Website"]
    ],
    rows: [
      [
        "The state",
        vitalsAppIsConfigured
          ? "Live as a separate Vitals app; the public site links through to that app rather than duplicating it."
          : "Prepared as a separate Vitals app handoff; the public site keeps a preview until the live app URL is configured."
      ],
      ["The data", "Aggregate health values can surface on the website; raw source exports and identifiers stay out of the repository."],
      ["The system", "The project pattern is source discipline, normalized local data, and calm review surfaces for personal health conversations."],
      ["Public note", "The live dashboard should remain a separate project environment, so the website should hand off to it instead of becoming a second copy."]
    ]
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
    type: "Chorus",
    image: featuredProjects[0].image,
    alt: featuredProjects[0].alt,
    dashboardImage: "/project-art/personal/chorus-collective.jpg",
    dashboardImageAlt: "Abstract Chorus collage showing listeners gathered in water, constellation marks, and a wavy listening path",
    dashboardImageWidth: 1672,
    dashboardImageHeight: 941,
    dashboardLabel: "Chorus",
    dashboardStatus: chorusAppIsConfigured ? "Live app" : "Preview",
    summary: "Turns listening history into a clear music dashboard.",
    tags: ["Listening archive", "Albums wall", "Reports"],
    visual: "chorus",
    mode: chorusAppIsConfigured ? "embed" : "preview",
    embedUrl: chorusAppIsConfigured ? chorusAppUrl : undefined,
    externalHref: chorusAppIsConfigured ? chorusAppUrl : undefined,
    fallbackHref: "/chorus",
    cta: chorusAppIsConfigured ? "Open live app" : "Open preview"
  },
  {
    number: "02",
    slug: "vitals",
    title: "Vitals",
    type: "Health Visualisation",
    image: "/project-art/personal/vitals-signal.jpg",
    alt: "Abstract green paper collage of a health dashboard, profile silhouette, ECG heart, activity, hydration, sleep, and plant signals",
    dashboardImage: "/project-art/personal/vitals-signal.jpg",
    dashboardImageAlt: "Abstract Vitals collage showing a profile silhouette, ECG heart, dashboard cards, activity, hydration, sleep, and plant signals",
    dashboardImageWidth: 1672,
    dashboardImageHeight: 941,
    dashboardLabel: "Health Dashboard",
    dashboardStatus: vitalsAppIsConfigured ? "Live app" : "Preview",
    visual: "vitals",
    summary: "Surfaces aggregate health signals for clearer review conversations.",
    tags: ["Health dashboard", "Source freshness", "Review prompts"],
    mode: vitalsAppIsConfigured ? "embed" : "preview",
    embedUrl: vitalsAppIsConfigured ? vitalsAppUrl : undefined,
    externalHref: vitalsAppIsConfigured ? vitalsAppUrl : undefined,
    fallbackHref: "/health",
    cta: vitalsAppIsConfigured ? "Open live app" : "Open preview"
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
    image: "/area-art/knowledge.png",
    alt: "Abstract evidence artwork with document layers, source lines, and annotations",
    summary: "Helps Codex use local, source-backed context without exposing raw records.",
    tags: ["Local-first", "Source discipline", "Private system"],
    cta: "Private system"
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
