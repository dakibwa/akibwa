// Session-scoped cache for public refresh endpoints. Lets dashboards render the
// last live payload instantly on repeat visits while a fresh fetch revalidates.
const SESSION_PREFIX = "akibwa:remote:";

export function readSessionJson(url) {
  try {
    const raw = window.sessionStorage.getItem(SESSION_PREFIX + url);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function fetchSessionJson(url, { accept = () => true } = {}) {
  // Always ask the server, but let an unchanged file answer 304 from the HTTP
  // cache instead of downloading it again.
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) return null;

  const body = await response.text();
  const data = JSON.parse(body);
  // Consumers with a source/coverage contract can reject a packet before it
  // overwrites the last usable cache entry. HTTP success alone is not freshness.
  if (!accept(data)) return null;
  try {
    // Store the text as received rather than serialising the parsed copy again.
    window.sessionStorage.setItem(SESSION_PREFIX + url, body);
  } catch {
    // Session storage may be full or unavailable; the fetch result still applies.
  }

  return data;
}
