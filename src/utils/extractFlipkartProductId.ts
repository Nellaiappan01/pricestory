// src/utils/extractFlipkartProductId.ts

/**
 * Extracts Flipkart productId from a full Flipkart URL.
 * Handles ?pid=, itmXXXX, MOBXXXX, and fallback.
 */
export function extractFlipkartProductId(url: string): string | null {
  try {
    const u = new URL(url);

    // 1) pid query param
    const pid =
      u.searchParams.get("pid") ||
      u.searchParams.get("product_id") ||
      u.searchParams.get("productId");
    if (pid) return pid;

    // 2) itm... or MOB... segments in path
    const parts = u.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const seg = parts[i];
      if (/^itm/i.test(seg) || /^MOB[A-Z0-9]+/i.test(seg)) return seg;
    }

    // 3) fallback: last path part
    return parts.length ? parts[parts.length - 1] : null;
  } catch {
    return null;
  }
}
