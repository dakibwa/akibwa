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
    title: "Sonic FM",
    type: "Data product",
    image: "/project-images/lastfm-dashboard-desktop.png",
    alt: "Sonic FM interface showing listening history and charts",
    summary:
      "A listening archive that turns Last.fm data into artists, albums, tracks, timelines, and taste reports.",
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
    slug: "sonic-fm",
    aliases: ["lastfm-dashboard", "signals-dashboard"],
    title: "Sonic FM",
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
      ["The state", "Built and usable locally: a real dashboard surface from the Last.fm music-data work."],
      ["What it does", featuredProjects[0].summary],
      ["The problem", featuredProjects[0].problem],
      ["Public note", "The live dashboard remains a separate project environment; this public site shows the case study without depending on a local dev server."]
    ]
  },
  {
    number: "02",
    slug: "health-dashboard",
    title: "Health Dashboard",
    type: "Local health data dashboard",
    image: "/area-art/systems.png",
    alt: "Abstract system artwork with translucent sheets, grid coordinates, and node paths",
    score: "HD",
    metrics: [
      ["Data", "Private"],
      ["Sources", "Local"],
      ["Review", "Clinician"],
      ["Output", "Case study"]
    ],
    rows: [
      ["The state", "Built and usable locally: a private dashboard for health signals, source freshness, trends, and review prompts."],
      ["The data", "Sensitive health data stays out of the public site and public repository."],
      ["The system", "The project pattern is source discipline, normalized local data, and calm review surfaces for personal health conversations."],
      ["Why it matters", "It shows the same pattern applied to sensitive data: keep it local, preserve provenance, and publish only the non-sensitive case study."]
    ]
  }
];

export const coverCollisionUrl = process.env.NEXT_PUBLIC_COVER_COLLISION_URL ?? "";

export const personalProjects = [
  {
    number: "01",
    slug: "health-dashboard",
    title: "Health Dashboard",
    type: workProjects[1].type,
    image: workProjects[1].image,
    alt: workProjects[1].alt,
    summary:
      "A private local dashboard for health signals, source freshness, trends, and review prompts.",
    tags: ["Private data", "Local sources", "Review prompts"],
    href: "/work#health-dashboard",
    cta: "View case study"
  },
  {
    number: "02",
    slug: "sonic-fm",
    title: "Last.fm / Sonic FM",
    type: workProjects[0].type,
    image: featuredProjects[0].image,
    alt: featuredProjects[0].alt,
    summary:
      "A listening archive that turns Last.fm history into artists, albums, tracks, timelines, and taste reports.",
    tags: ["Last.fm API", "Charts", "Taste reports"],
    href: "/work#sonic-fm",
    cta: "View case study"
  },
  {
    number: "03",
    slug: "cover-collision",
    title: "Cover Collision",
    type: "Instagram album-art experiment",
    image: "/area-art/work.png",
    alt: "Abstract collage of interface fragments, paper proofs, and data marks",
    summary:
      "An Instagram-based experiment in cover mismatches, collage, recombination, and visual taste.",
    tags: ["Cover mismatches", "Collage", "Recombination"],
    externalHref: coverCollisionUrl || undefined,
    cta: coverCollisionUrl ? "Open Instagram" : "Instagram link pending"
  },
  {
    number: "04",
    slug: "personal-knowledge-base",
    title: "Personal Knowledge Base",
    type: "Private local-first AI memory system",
    image: "/area-art/knowledge.png",
    alt: "Abstract evidence artwork with document layers, source lines, and annotations",
    summary:
      "A private, local-first AI memory and source system for keeping useful context structured without exposing raw sources.",
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
