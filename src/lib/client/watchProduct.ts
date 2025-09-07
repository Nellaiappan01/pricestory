// src/lib/client/watchProduct.ts
export async function watchProductApi({ productId, url, details }: { productId?: string; url?: string; details?: any }) {
  const res = await fetch("/api/watch-product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, url, details }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `watch failed ${res.status}`);
  }
  return res.json();
}
