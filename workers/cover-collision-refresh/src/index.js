const USER_AGENT = "akibwa-cover-collision-cloudflare/1";

const PUBLIC_DATA_KEY = "cover-collision-data";
const STATUS_KEY = "refresh-status";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400"
};

const FALLBACK_DATA = {
  generatedAt: "2026-06-04T00:00:00.000Z",
  snapshotDate: "2026-06-04",
  source: "worker-fallback-seed",
  profileUrl: "https://www.instagram.com/dakibwa/",
  posts: [
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
  ]
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/cover-collision" || url.pathname === "/cover-collision-data.json") {
      const data = await readPublicData(env);
      return jsonResponse(data, 200, {
        "Cache-Control": "public, max-age=300, s-maxage=900"
      });
    }

    if (url.pathname === "/status") {
      return jsonResponse((await env.COVER_COLLISION_KV.get(STATUS_KEY, "json")) || { ok: false, status: "not refreshed yet" });
    }

    if (url.pathname === "/refresh") {
      if (request.method !== "POST") {
        return jsonResponse({ ok: false, error: "Use POST." }, 405);
      }
      if (!(await isAuthorized(request, env))) {
        return jsonResponse({ ok: false, error: "Unauthorized." }, 401);
      }

      try {
        return jsonResponse(await refreshCoverCollision(env, "manual"));
      } catch (error) {
        const status = await recordFailure(env, error, "manual");
        return jsonResponse(status, 500);
      }
    }

    return jsonResponse({ ok: false, error: "Not found." }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      refreshCoverCollision(env, event.cron).catch((error) => recordFailure(env, error, event.cron))
    );
  }
};

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...headers
    }
  });
}

async function isAuthorized(request, env) {
  const configuredToken = env.ADMIN_TOKEN || "";
  if (!configuredToken) return false;

  const header = request.headers.get("Authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  return timingSafeEqual(provided, configuredToken);
}

async function timingSafeEqual(a, b) {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;

  return crypto.subtle.timingSafeEqual
    ? crypto.subtle.timingSafeEqual(left, right)
    : fallbackTimingSafeEqual(left, right);
}

function fallbackTimingSafeEqual(left, right) {
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

async function readPublicData(env) {
  const cached = await env.COVER_COLLISION_KV.get(PUBLIC_DATA_KEY, "json");
  if (isCoverCollisionData(cached)) return cached;

  const seeded = await fetchSeedData(env);
  await env.COVER_COLLISION_KV.put(PUBLIC_DATA_KEY, JSON.stringify(seeded));
  return seeded;
}

async function fetchSeedData(env) {
  const seedUrl = env.PUBLIC_SEED_URL || "https://raw.githubusercontent.com/dakibwa/dakibwa/main/data/cover-collision-data.json";

  try {
    const response = await fetch(seedUrl, {
      headers: { "User-Agent": USER_AGENT }
    });

    if (response.ok) {
      const payload = await response.json();
      if (isCoverCollisionData(payload)) return payload;
    }
  } catch {}

  return FALLBACK_DATA;
}

async function refreshCoverCollision(env, trigger) {
  const current = await readPublicData(env);
  const refreshed = await fetchInstagramData(env, current);
  await env.COVER_COLLISION_KV.put(PUBLIC_DATA_KEY, JSON.stringify(refreshed.data));

  const status = {
    ok: true,
    trigger,
    changed: stableCoverCollisionData(current) !== stableCoverCollisionData(refreshed.data),
    refreshedAt: new Date().toISOString(),
    mode: "cloudflare-worker",
    source: refreshed.source,
    profileUrl: refreshed.data.profileUrl,
    postCount: refreshed.data.posts.length,
    latestPost: refreshed.data.posts[0]?.date || null,
    credentialsConfigured: Boolean(env.INSTAGRAM_ACCESS_TOKEN),
    error: refreshed.error || null
  };
  await env.COVER_COLLISION_KV.put(STATUS_KEY, JSON.stringify(status));
  return status;
}

async function fetchInstagramData(env, current) {
  if (!env.INSTAGRAM_ACCESS_TOKEN) {
    const seed = await fetchSeedData(env);
    return {
      source: "seed-no-instagram-token",
      data: withRefreshMetadata(seed, "static-seed"),
      error: "INSTAGRAM_ACCESS_TOKEN is not configured; serving checked-in public seed."
    };
  }

  try {
    const payload = await fetchInstagramMedia(env);
    const posts = normalizeInstagramPosts(payload, current.posts);
    if (!posts.length) {
      return {
        source: "instagram-empty-fallback-seed",
        data: withRefreshMetadata(current, "static-seed"),
        error: "Instagram API returned no usable Cover Collision posts."
      };
    }

    return {
      source: "instagram-api",
      data: {
        generatedAt: new Date().toISOString(),
        snapshotDate: new Date().toISOString().slice(0, 10),
        source: "Instagram",
        profileUrl: `https://www.instagram.com/${env.INSTAGRAM_USERNAME || "dakibwa"}/`,
        posts
      },
      error: null
    };
  } catch (error) {
    return {
      source: "instagram-error-fallback-seed",
      data: withRefreshMetadata(current, "static-seed"),
      error: safeError(error)
    };
  }
}

async function fetchInstagramMedia(env) {
  const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  const endpoint = env.INSTAGRAM_USER_ID
    ? `https://graph.facebook.com/v20.0/${encodeURIComponent(env.INSTAGRAM_USER_ID)}/media`
    : "https://graph.instagram.com/me/media";
  const url = new URL(endpoint);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", env.INSTAGRAM_ACCESS_TOKEN);

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT }
  });
  const payload = await response.json();

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Instagram media fetch failed with HTTP ${response.status}`);
  }

  return payload;
}

function normalizeInstagramPosts(payload, fallbackPosts) {
  const fallbackByHref = new Map((fallbackPosts || []).map((post) => [stripTrailingSlash(post.href), post]));
  return asArray(payload?.data)
    .filter((item) => isCoverCollisionPost(item))
    .map((item, index) => {
      const fallback = fallbackByHref.get(stripTrailingSlash(item.permalink)) || {};
      const captionTitle = titleFromCaption(item.caption);
      const timestamp = item.timestamp ? new Date(item.timestamp) : null;
      const date = Number.isNaN(timestamp?.getTime()) ? fallback.date : timestamp?.toISOString().slice(0, 10);

      return {
        number: fallback.number || String(index + 1).padStart(2, "0"),
        title: captionTitle || fallback.title || `Cover Collision ${index + 1}`,
        date: date || new Date().toISOString().slice(0, 10),
        href: item.permalink || fallback.href,
        image: item.media_url || item.thumbnail_url || fallback.image,
        alt: fallback.alt || `Cover Collision Instagram post ${index + 1}`
      };
    })
    .filter((post) => post.href && post.image);
}

function isCoverCollisionPost(item) {
  const caption = String(item?.caption || "");
  const permalink = String(item?.permalink || "");
  return permalink.includes("instagram.com/") && /cover\\s*collision/i.test(caption);
}

function titleFromCaption(caption) {
  const firstLine = String(caption || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return "";

  return firstLine
    .replace(/^cover\s*collision\s*(no\\.?\\s*)?\\d+\\s*[:.-]?\\s*/i, "")
    .replace(/\s*[|#].*$/, "")
    .trim();
}

function withRefreshMetadata(data, source) {
  return {
    ...data,
    generatedAt: new Date().toISOString(),
    snapshotDate: new Date().toISOString().slice(0, 10),
    source
  };
}

function isCoverCollisionData(data) {
  return Boolean(data?.profileUrl && Array.isArray(data?.posts));
}

function stableCoverCollisionData(data) {
  const clone = {
    ...data,
    generatedAt: undefined,
    snapshotDate: undefined
  };
  return JSON.stringify(clone);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function safeError(error) {
  return String(error?.message || error || "Unknown error").replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]");
}
