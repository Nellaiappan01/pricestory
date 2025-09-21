// src/components/PopularProducts.tsx
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
  priceHistory?: { t: string; p: number }[];
  source?: string | null;
};

type Props = {
  onWatch?: (id: string) => void;
  initialCount?: number;
};

/* small brand map */
const BRAND_MAP: Record<string, { label: string; badgeClasses: string; textClasses?: string }> = {
  "flipkart.com": { label: "Flipkart", badgeClasses: "bg-yellow-100 border-yellow-200", textClasses: "text-yellow-800" },
  "amazon.in": { label: "Amazon", badgeClasses: "bg-amber-100 border-amber-200", textClasses: "text-amber-900" },
  "amazon.com": { label: "Amazon", badgeClasses: "bg-amber-100 border-amber-200", textClasses: "text-amber-900" },
};

function formatINR(v?: number | string | null) {
  if (v == null || v === "") return "—";
  const raw = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(raw) || Number.isNaN(raw)) return "—";
  return `₹ ${Math.round(raw).toLocaleString("en-IN")}`;
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
      if (k.includes(s) || BRAND_MAP[k].label.toLowerCase().includes(s)) return BRAND_MAP[k];
    }
  }
  const host = hostnameFromUrl(url);
  if (!host) return null;
  for (const k of Object.keys(BRAND_MAP)) {
    if (host === k || host.endsWith("." + k) || host.endsWith(k)) return BRAND_MAP[k];
  }
  return { label: host, badgeClasses: "bg-white border-slate-100", textClasses: "text-slate-800" };
}

/* image proxy helper (fallbacks to original URL if encode fails) */
function proxyImage(url?: string | null) {
  if (!url) return undefined;
  try {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

/* attach affiliate param safely */
function withAffiliate(url?: string | null) {
  if (!url) return "#";
  try {
    const U = new URL(url);
    const AFF =
      (typeof window !== "undefined" && (window as any).__NEXT_PUBLIC_FLIPKART_AFFID) ||
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

export default function PopularProducts({ onWatch, initialCount = 3 }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [watchingIds, setWatchingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/tracked-products");
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const json = await res.json();
        if (mounted) setProducts(json.data || []);
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const visible = showAll ? products : products.slice(0, initialCount);

  function setWatching(id: string, v = true) {
    setWatchingIds((s) => ({ ...s, [id]: v }));
  }

  async function handleWatchClick(id: string) {
    setWatching(id, true);
    if (onWatch) {
      await Promise.resolve(onWatch(id));
      return;
    }
    try {
      await fetch("/api/watch-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
    } catch {
      setWatching(id, false);
    }
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-extrabold">Popular tracked products</h3>
        <button
          onClick={() => setShowAll((s) => !s)}
          className="text-sm px-3 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50"
        >
          {showAll ? "Show less" : `View all (${products.length})`}
        </button>
      </div>

      {loading && <p className="text-slate-500">Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && products.length === 0 && <p>No products yet.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {visible.map((p) => {
          const brand = getBrandInfo(p.url, p.source);
          const rawTitle = p.title ?? hostnameFromUrl(p.url);
          const title = sanitizeTitle(rawTitle, p.url);
          const priceLabel = formatINR(p.price);
          const affiliate = withAffiliate(p.affiliateUrl ?? p.url);

          return (
            <motion.article
              key={p.id}
              whileHover={{ y: -6 }}
              animate={{ backgroundColor: watchingIds[p.id] ? "#f0fdf4" : "#ffffff" }}
              transition={{ duration: 0.32 }}
              className="bg-white rounded-2xl shadow-md border border-gray-100 flex flex-col overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-40 bg-slate-50 relative flex items-center justify-center">
                  {p.image ? (
                    <img src={proxyImage(p.image)} alt={title} className="w-full h-40 object-cover" loading="lazy" />
                  ) : (
                    <div className="h-40 flex items-center justify-center text-sm text-slate-400 px-3">No image</div>
                  )}

                  {brand && (
                    <span className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-full border ${brand.badgeClasses} ${brand.textClasses}`}>
                      {brand.label}
                    </span>
                  )}
                </div>

                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    {/* show full rawTitle in tooltip for easy reading */}
                    <h4 className="font-semibold text-slate-900 line-clamp-2" title={rawTitle || ""}>
                      {title}
                    </h4>

                    <div className="mt-2 flex items-center gap-4">
                      <div className="text-2xl font-bold text-indigo-700">{priceLabel}</div>
                      <div className="text-sm text-slate-500">Best pick</div>
                    </div>

                    {p.priceHistory && p.priceHistory.length > 0 && (
                      <div className="mt-3 w-full h-16">
                        <ResponsiveContainer width="100%" height={60}>
                          <LineChart data={p.priceHistory}>
                            <Line type="monotone" dataKey="p" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => openAffiliate(affiliate)}
                      className="flex-1 inline-flex justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                    >
                      Buy Now
                    </button>

                    <button
                      onClick={() => handleWatchClick(p.id)}
                      className={`px-3 py-2 rounded-lg border text-sm transition ${
                        watchingIds[p.id] ? "bg-green-50 border-green-300 text-green-800" : "bg-white hover:bg-slate-50"
                      }`}
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
    </section>
  );
}
