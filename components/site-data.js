export const contactEmail = "***REMOVED***";

export const areaTiles = [
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
    href: "/offer",
    image: "/area-art/offer.png",
    alt: "Abstract artwork showing a path from messy marks into a precise output"
  },
  {
    title: "About",
    descriptor: "How I think and build",
    href: "/about",
    image: "/area-art/knowledge.png",
    alt: "Abstract evidence artwork with document layers, source lines, and annotations"
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
    image: "/area-art/signals.png",
    alt: "Abstract waveform and circular listening signal artwork",
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
    aliases: ["sonic-fm", "lastfm-dashboard", "signals-dashboard"],
    title: "Chorus",
    type: "Music intelligence dashboard",
    image: "/area-art/signals.png",
    alt: "Abstract waveform and circular listening signal artwork",
    score: "FM",
    metrics: [
      ["Listening", "API"],
      ["Artists", "Charts"],
      ["Albums", "Cache"],
      ["Reports", "Live"]
    ],
    rows: [
      ["The state", "Built and usable locally: a real Chorus dashboard surface from the Last.fm music-data work."],
      ["What it does", featuredProjects[0].summary],
      ["The problem", featuredProjects[0].problem],
      ["Public note", "The live dashboard remains a separate project environment; this public site shows the case study without depending on a local dev server."]
    ]
  },
  {
    number: "02",
    slug: "vitals",
    title: "Vitals",
    type: "Personal health signal dashboard",
    image: "/area-art/systems.png",
    alt: "Abstract system artwork with translucent sheets, grid coordinates, and node paths",
    visual: "vitals",
    score: "VT",
    metrics: [
      ["Signals", "Local"],
      ["Sources", "Local"],
      ["Review", "Clinician"],
      ["Output", "Private"]
    ],
    rows: [
      ["The state", "A personal Vitals system for health signals, source freshness, trends, and review prompts."],
      ["The data", "Private local health sources stay out of the public website and repository."],
      ["The system", "The project pattern is source discipline, normalized local data, and calm review surfaces for personal health conversations."],
      ["Why it matters", "It shows the same pattern applied to personal data: preserve provenance, make the useful signals readable, and keep raw source files separate."]
    ]
  }
];

export const coverCollisionUrl = process.env.NEXT_PUBLIC_COVER_COLLISION_URL || "https://www.instagram.com/dakibwa/";
export const coverCollisionPosts = [
  {
    number: "08",
    title: "Debonair × Turtleneck & Chain",
    date: "2026-05-08",
    href: "https://www.instagram.com/p/DYFYB5XiEIM/",
    image: "/project-images/cover-collision/cover-collision-01.jpg",
    alt: "Cover Collision no. 08 combining Debonair and Turtleneck & Chain album artwork"
  },
  {
    number: "07",
    title: "Bright Green Field × The Car",
    date: "2026-05-07",
    href: "https://www.instagram.com/p/DYCshR1COSH/",
    image: "/project-images/cover-collision/cover-collision-02.jpg",
    alt: "Cover Collision no. 07 combining Bright Green Field and The Car album artwork"
  },
  {
    number: "07",
    title: "Honeybloom × Prospect Hummer",
    date: "2026-05-01",
    href: "https://www.instagram.com/p/DXzgTu2CGAi/",
    image: "/project-images/cover-collision/cover-collision-03.jpg",
    alt: "Cover Collision no. 07 combining Honeybloom and Prospect Hummer album artwork"
  },
  {
    number: "06",
    title: "Blonde × Tomboy",
    date: "2026-04-28",
    href: "https://www.instagram.com/p/DXrq7fmiDDV/",
    image: "/project-images/cover-collision/cover-collision-04.jpg",
    alt: "Cover Collision no. 06 combining Blonde and Tomboy album artwork"
  },
  {
    number: "05",
    title: "Recurring × Today",
    date: "2026-04-25",
    href: "https://www.instagram.com/p/DXjSKD5COsc/",
    image: "/project-images/cover-collision/cover-collision-05.jpg",
    alt: "Cover Collision no. 05 combining Recurring and Today album artwork"
  },
  {
    number: "04",
    title: "Under the Lilac Sky × DSU",
    date: "2026-04-24",
    href: "https://www.instagram.com/p/DXhS92AiDF0/",
    image: "/project-images/cover-collision/cover-collision-06.jpg",
    alt: "Cover Collision no. 04 combining Under the Lilac Sky and DSU album artwork"
  },
  {
    number: "03",
    title: "Jeffery × Teens of Denial",
    date: "2026-04-23",
    href: "https://www.instagram.com/p/DXeBILIiNv_/",
    image: "/project-images/cover-collision/cover-collision-07.jpg",
    alt: "Cover Collision no. 03 combining Jeffery and Teens of Denial album artwork"
  },
  {
    number: "02",
    title: "Graceland × Person Pitch",
    date: "2026-04-22",
    href: "https://www.instagram.com/p/DXbLYtYCCf8/",
    image: "/project-images/cover-collision/cover-collision-08.jpg",
    alt: "Cover Collision no. 02 combining Graceland and Person Pitch album artwork"
  },
  {
    number: "01",
    title: "Paranoid × How Strange, Innocence",
    date: "2026-04-21",
    href: "https://www.instagram.com/p/DXYp4MACABm/",
    image: "/project-images/cover-collision/cover-collision-09.jpg",
    alt: "Cover Collision no. 01 combining Paranoid and How Strange, Innocence album artwork"
  }
];

export const personalProjects = [
  {
    number: "01",
    slug: "chorus",
    aliases: ["sonic-fm", "lastfm-dashboard"],
    title: "Chorus",
    type: "Music Intelligence",
    image: featuredProjects[0].image,
    alt: featuredProjects[0].alt,
    dashboardImage: "/area-art/signals.png",
    dashboardImageAlt: "Abstract Chorus listening signal artwork",
    dashboardImageWidth: 1440,
    dashboardImageHeight: 900,
    dashboardLabel: "Chorus",
    dashboardStatus: "Public preview",
    summary: "Turns listening history into a clear music dashboard.",
    tags: ["Listening archive", "Albums wall", "Reports"],
    visual: "sonic",
    mode: "preview",
    fallbackHref: "/chorus",
    cta: "View preview"
  },
  {
    number: "02",
    slug: "vitals",
    title: "Vitals",
    type: "Health Visualisation",
    image: "/area-art/systems.png",
    alt: "Abstract personal health signal system artwork",
    dashboardImage: "/area-art/systems.png",
    dashboardImageAlt: "Abstract Vitals personal health signal system artwork",
    dashboardImageWidth: 1280,
    dashboardImageHeight: 720,
    dashboardLabel: "Health Dashboard",
    dashboardStatus: "Private values hidden",
    visual: "vitals",
    summary: "Tracks private health signals for clearer review conversations.",
    tags: ["Health dashboard", "Local sources", "Review prompts"],
    mode: "preview",
    fallbackHref: "/health",
    cta: "View dashboard"
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
    summary: "Keeps useful personal context structured without exposing raw sources.",
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
