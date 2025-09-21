"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { sanitizeTitle } from "@/lib/titleUtils";

type Product = {
  id: string;
  title?: string | null;
  price?: number | string | null;
  url?: string | null;
  affiliateUrl?: string | null;
  image?: string | null;
  priceHistory?: { t: string; p: number | string }[] | null;
  source?: string | null;
  watchCount?: number;
};

type Props = {
  onWatch?: (id: string) => Promise<void> | void;
  initialVisibleCount?: number;
};

const CHUNK = 10;
const SHOW_MORE_TARGET = 25;

const BRAND_MAP: Record<
  string,
  { label: string; badgeClasses: string; textClasses?: string }
> = {
  "flipkart.com": {
    label: "Flipkart",
    badgeClasses: "bg-yellow-100 border-yellow-200",
    textClasses: "text-yellow-800",
  },
  "amazon.in": {
    label: "Amazon",
    badgeClasses: "bg-amber-100 border-amber-200",
    textClasses: "text-amber-900",
  },
  "amazon.com": {
    label: "Amazon",
    badgeClasses: "bg-amber-100 border-amber-200",
    textClasses: "text-amber-900",
  },
};

/* ---------- Price formatter (always returns a string) ---------- */
function formatINR(v?: number | string | null): string {
  if (v == null || v === "") return "—";

  // if object/array, try extracting deeper values
  if (typeof v === "object") {
    try {
      if ((v as any).p != null) return formatINR((v as any).p);
      if (Array.isArray(v) && v.length > 0)
        return formatINR((v as any)[v.length - 1]);
    } catch {
      return "—";
    }
  }

  const rawStr = typeof v === "number" ? String(v) : String(v);
  const cleaned = rawStr.replace(/[^\d.-]/g, "");
  const num = Number(cleaned);

  if (!Number.isFinite(num) || Number.isNaN(num)) return "—";
  return `₹ ${Math.round(num).toLocaleString("en-IN")}`;
}

function hostnameFromUrl(url?: string | null) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getBrandInfo(url?: string | null, explicitSource?: string | null) {
  if (explicitSource) {
    const s = explicitSource.toLowerCase();
    for (const k of Object.keys(BRAND_MAP)) {
      if (k.includes(s) || BRAND_MAP[k].label.toLowerCase().includes(s))
        return BRAND_MAP[k];
    }
  }
  const host = hostnameFromUrl(url);
  if (!host) return null;
  for (const k of Object.keys(BRAND_MAP)) {
    if (host === k || host.endsWith("." + k) || host.endsWith(k))
      return BRAND_MAP[k];
  }
  return {
    label: host,
    badgeClasses: "bg-white border-slate-100",
    textClasses: "text-slate-800",
  };
}

function proxyImage(url?: string | null) {
  if (!url) return undefined;
  try {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

function withAffiliate(url?: string | null) {
  if (!url) return "#";
  try {
    const U = new URL(url);
    const AFF =
      (typeof window !== "undefined" &&
        (window as any).__NEXT_PUBLIC_FLIPKART_AFFID) ||
      (process.env.NEXT_PUBLIC_FLIPKART_AFFID as string) ||
      "";
    if (AFF && !U.searchParams.has("affid") && !U.searchParams.has("aff")) {
      U.searchParams.set("affid", AFF);
    }
    return U.toString();
  } catch {
    return url;
  }
}

function openAffiliate(link: string) {
  if (!link) return;
  try {
    const w = window.open(link, "_blank", "noopener,noreferrer");
    if (!w) window.location.href = link;
  } catch {
    window.location.href = link;
  }
}

const IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' fill='%239ca3af' font-family='Arial,Helvetica,sans-serif' font-size='16' text-anchor='middle' alignment-baseline='central'%3ENo image%3C/text%3E%3C/svg%3E";

export default function PopularProducts({
  onWatch,
  initialVisibleCount = 3,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [watchingIds, setWatchingIds] = useState<Record<string, boolean>>({});

  async function fetchChunk(pageNumber: number) {
    const res = await fetch(
      `/api/tracked-products?limit=${CHUNK}&page=${pageNumber}&sort=popular`
    );
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "API error");
    return json.data as Product[];
  }

  useEffect(() => {
    let mounted = true;
    async function firstLoad() {
      try {
        setLoading(true);
        setError("");
        const first = await fetchChunk(1);
        if (!mounted) return;
        setProducts(first);
        setPage(1);
        setHasMore((first?.length ?? 0) === CHUNK);
      } catch (err: any) {
        console.error("initial load failed", err);
        if (!mounted) return;
        setError(err.message || "Failed to load products");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    firstLoad();
    return () => {
      mounted = false;
    };
  }, []);

  async function loadToShowMore() {
    if (products.length >= SHOW_MORE_TARGET) return;
    setLoadingMore(true);
    try {
      let nextPage = page + 1;
      let current = [...products];
      while (current.length < SHOW_MORE_TARGET && hasMore) {
        const chunk = await fetchChunk(nextPage);
        if (!chunk || chunk.length === 0) {
          setHasMore(false);
          break;
        }
        const map = new Map(current.map((x) => [x.id, x]));
        for (const item of chunk) {
          if (!map.has(item.id)) {
            current.push(item);
            map.set(item.id, item);
          }
        }
        nextPage++;
        setPage(nextPage - 1);
        setHasMore(chunk.length === CHUNK);
        if (chunk.length < CHUNK) break;
      }
      setProducts(current);
    } catch (err) {
      console.error("loadToShowMore failed", err);
    } finally {
      setLoadingMore(false);
    }
  }

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const chunk = await fetchChunk(nextPage);
      if (!chunk || chunk.length === 0) {
        setHasMore(false);
        return;
      }
      const map = new Map(products.map((x) => [x.id, x]));
      const appended: Product[] = [...products];
      for (const item of chunk) {
        if (!map.has(item.id)) {
          appended.push(item);
          map.set(item.id, item);
        }
      }
      setProducts(appended);
      setPage(nextPage);
      setHasMore(chunk.length === CHUNK);
    } catch (err) {
      console.error("loadMore failed", err);
    } finally {
      setLoadingMore(false);
    }
  }

  function setWatching(id: string, v = true) {
    setWatchingIds((s) => ({ ...s, [id]: v }));
  }

  async function handleWatchClick(id: string) {
    if (!id) return;
    setWatching(id, true);
    if (onWatch) {
      try {
        await Promise.resolve(onWatch(id));
      } catch {
        setWatching(id, false);
      }
      return;
    }
    try {
      const res = await fetch("/api/watch-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setWatching(id, false);
      alert("Failed to add watch. Try again.");
    }
  }

  function handleImgError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
    const img = e.currentTarget;
    img.src = IMAGE_PLACEHOLDER;
    img.onerror = null;
  }

  // Compute visible slice when not "show all"
  const visibleCount = showAll
    ? products.length
    : Math.min(initialVisibleCount, products.length);
  const visibleProducts = products.slice(0, visibleCount);

  return (
    <section className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h3 className="text-2xl font-extrabold">Popular tracked products</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (!showAll) {
                if (products.length < SHOW_MORE_TARGET) {
                  await loadToShowMore();
                }
                setShowAll(true);
              } else {
                setShowAll(false);
              }
            }}
            className="text-sm px-3 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50"
            aria-pressed={showAll}
          >
            {showAll
              ? "Show less"
              : `View all (${Math.min(
                  products.length,
                  SHOW_MORE_TARGET
                )}${hasMore ? "+" : ""})`}
          </button>
        </div>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="text-slate-500">No products yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {visibleProducts.map((p) => {
          const brand = getBrandInfo(p.url, p.source);
          const rawTitle = p.title ?? hostnameFromUrl(p.url);
          const title = sanitizeTitle(rawTitle, p.url);

          // pick price: explicit > last history > none
          const explicitRaw = p.price ?? null;
          let lastHistoryRaw: any = null;
          if (p.priceHistory && p.priceHistory.length) {
            const last = p.priceHistory[p.priceHistory.length - 1];
            if (last && typeof last === "object" && "p" in last)
              lastHistoryRaw = (last as any).p;
            else lastHistoryRaw = last;
          }
          const chosenPriceRaw =
            explicitRaw != null
              ? explicitRaw
              : lastHistoryRaw != null
              ? lastHistoryRaw
              : null;

          const priceLabel = formatINR(chosenPriceRaw);

          // debug (you can remove later)
          console.debug(`[product:${p.id}]`, {
            explicitRaw,
            lastHistoryRaw,
            chosenPriceRaw,
            priceLabel,
          });

          const affiliate = withAffiliate(p.affiliateUrl ?? p.url ?? "#");

          return (
            <motion.article
              key={p.id}
              whileHover={{
                y: -8,
                scale: 1.02,
                boxShadow: "0 12px 20px rgba(0,0,0,0.10)",
              }}
              animate={{
                backgroundColor: watchingIds[p.id] ? "#f0fdf4" : "#ffffff",
              }}
              transition={{ duration: 0.28 }}
              className="bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col overflow-hidden"
              role="group"
              aria-labelledby={`prod-${p.id}-title`}
              data-debug-price={String(chosenPriceRaw ?? "")}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-40 bg-slate-50 relative flex items-center justify-center">
                  {p.image ? (
                    <img
                      src={proxyImage(p.image)}
                      alt={title}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                      onError={handleImgError}
                    />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-sm text-slate-400 px-3">
                      No image
                    </div>
                  )}

                  {brand && (
                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-full border ${brand.badgeClasses} ${brand.textClasses}`}
                    >
                      {brand.label}
                    </span>
                  )}
                </div>

                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <h4
                      id={`prod-${p.id}-title`}
                      className="font-semibold text-slate-900 line-clamp-2"
                      title={rawTitle || ""}
                    >
                      {title}
                    </h4>

                    <div className="mt-2 flex items-center gap-4">
                      <div className="text-2xl font-bold text-indigo-700">
                        {priceLabel}
                      </div>
                      <div className="text-sm text-slate-500">Best pick</div>
                    </div>

                    {p.priceHistory && p.priceHistory.length > 0 && (
                      <div className="mt-3 w-full h-16">
                        <ResponsiveContainer width="100%" height={60}>
                          <LineChart data={p.priceHistory}>
                            <Line
                              type="monotone"
                              dataKey="p"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => openAffiliate(affiliate)}
                      className="flex-1 inline-flex justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                      aria-label={`Buy ${title}`}
                    >
                      Buy Now
                    </button>

                    <button
                      onClick={() => handleWatchClick(p.id)}
                      className={`px-3 py-2 rounded-lg border text-sm transition ${
                        watchingIds[p.id]
                          ? "bg-green-50 border-green-300 text-green-800"
                          : "bg-white hover:bg-slate-50"
                      }`}
                      aria-pressed={!!watchingIds[p.id]}
                      aria-label={
                        watchingIds[p.id]
                          ? `Watching ${title}`
                          : `Watch ${title}`
                      }
                      disabled={!!watchingIds[p.id]}
                    >
                      {watchingIds[p.id] ? "Watching ✓" : "Watch"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {showAll && (
        <div className="mt-8 flex justify-center">
          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-3 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium"
            >
              {loadingMore ? "Loading…" : `Load more (+${CHUNK})`}
            </button>
          ) : (
            <div className="text-sm text-slate-500">No more products</div>
          )}
        </div>
      )}
    </section>
  );
}
 