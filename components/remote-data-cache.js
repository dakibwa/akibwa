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

export async function fetchSessionJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;

  const data = await response.json();
  try {
    window.sessionStorage.setItem(SESSION_PREFIX + url, JSON.stringify(data));
  } catch {
    // Session storage may be full or unavailable; the fetch result still applies.
  }

  return data;
}
