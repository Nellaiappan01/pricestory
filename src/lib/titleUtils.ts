// src/lib/titleUtils.ts
// Utility to sanitize product titles for UI display.
// - If title looks like a placeholder (contains itm..., or starts with www.), we try to produce a readable title from the product URL slug.
// - Export sanitizeTitle(rawTitle, url?) for use in components.

export function looksLikePlaceholderTitle(t?: string | null) {
  if (!t) return true;
  const s = String(t).trim();
  if (s.length === 0) return true;
  // common placeholder patterns
  if (/^www\./i.test(s)) return true;
  if (/^itm[a-z0-9]+/i.test(s)) return true;
  // if it's too short or simply an id
  if (/^[a-z0-9]{8,}$/.test(s)) return true;
  // otherwise likely ok
  return false;
}

export function titleCase(s: string) {
  return s
    .split(" ")
    .map((w) => (w.length > 1 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(" ");
}

/**
 * Try to extract a friendly title from a product URL's path.
 * Examples:
 *  - /dev-lite-120-inch-projector-screen/.../p/itm...  -> "Dev Lite 120 Inch Projector Screen"
 *  - /vivo-t4x-5g-marine-blue-128-gb/p/itm... -> "Vivo T4x 5g Marine Blue 128 Gb"
 */
export function titleFromUrlSlug(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const pathname = u.pathname || "";
    // split and filter
    const parts = pathname.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return null;

    // Approach:
    // - if there is a 'p' segment (flipkart product pages use /.../p/itm...), the segment just before 'p' is the slug.
    // - otherwise try the last meaningful segment that does not look like an itm id.
    let slug = "";
    const pIndex = parts.indexOf("p");
    if (pIndex > 0) {
      // take the segment immediately before 'p'
      slug = parts[pIndex - 1];
    } else {
      // find last segment that isn't like itm... or pid=...
      for (let i = parts.length - 1; i >= 0; i--) {
        const seg = parts[i];
        if (!/^itm[a-z0-9]+/i.test(seg) && !seg.includes("pid=") && seg.length > 2) {
          slug = seg;
          break;
        }
      }
      if (!slug) slug = parts[0];
    }

    // cleanup slug: remove trailing product ids if present (rare), split by hyphen, decode
    slug = decodeURIComponent(slug.replace(/[^a-zA-Z0-9\-\s]/g, ""));
    const words = slug.split(/[-_]+/).filter(Boolean);

    if (words.length === 0) return null;

    // Some words in slugs are short "in", "and", "with", we keep them but titleCase will normalise.
    const title = titleCase(words.join(" "));
    // final safety: trim and return
    return title.trim();
  } catch {
    return null;
  }
}

/**
 * sanitizeTitle(rawTitle, url?)
 * - returns:
 *    1) If rawTitle looks like a real title -> cleaned rawTitle (trimmed, truncated handled in UI)
 *    2) If rawTitle looks like placeholder -> try to extract from URL slug
 *    3) fallback -> rawTitle or "Untitled product"
 */
export function sanitizeTitle(raw?: string | null, url?: string | null) {
  const candidate = raw && String(raw).trim();
  if (candidate && !looksLikePlaceholderTitle(candidate)) {
    // remove repeated "Price in India - Buy ..." suffixes often scraped from Flipkart pages
    let cleaned = candidate.replace(/\s*\bPrice in India.*$/i, "").trim();
    // sometimes titles are long repeated; collapse repeated phrases (simple heuristic)
    // if cleaned still looks like itm... then fall through
    if (cleaned && !looksLikePlaceholderTitle(cleaned)) return cleaned;
  }

  // fallback: try URL slug
  const fromUrl = titleFromUrlSlug(url);
  if (fromUrl) return fromUrl;

  // last fallback
  if (candidate && candidate.length > 0) return candidate;
  return "Untitled product";
}
