// src/app/trending/TrendingGridClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";

type Product = {
  id: string;
  title?: string | null;
  price?: number | string | null;
  url?: string | null;
  affiliateUrl?: string | null;
  image?: string | null;
  priceHistory?: { t: string; p: number }[] | null;
  watchCount?: number;
};

export default function TrendingGridClient() {
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function loadPage(p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tracked-products?limit=${limit}&page=${p}&sort=popular`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "API error");
      const data: Product[] = json.data ?? [];
      setItems((s) => (p === 1 ? data : [...s, ...data]));
      setHasMore(data.length === limit);
    } catch (err) {
      console.error("Trending load error", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage(1);
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {items.map((p) => (
          <article key={p.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
            <div className="flex flex-col sm:flex-row">
              <div className="w-full sm:w-44 bg-slate-50 relative flex items-center justify-center p-3">
                {p.image ? (
                  <img src={`/api/image-proxy?url=${encodeURIComponent(p.image)}`} alt={p.title ?? "product"} className="w-full h-40 object-cover rounded" />
                ) : (
                  <div className="h-40 flex items-center justify-center text-sm text-slate-400">No image</div>
                )}
              </div>

              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 line-clamp-2">{p.title ?? new URL(p.url ?? "#").hostname}</h4>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="text-2xl font-bold text-indigo-700">{p.price ? `₹ ${p.price}` : "—"}</div>
                    <div className="text-sm text-slate-500">Popular • {p.watchCount ?? 0} watchers</div>
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
                  <a href={p.affiliateUrl ?? p.url} target="_blank" rel="noreferrer" className="flex-1 inline-flex justify-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">Buy Now</a>
                  <button onClick={() => fetch("/api/watch-product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: p.id }) }).then(r => r.ok ? alert("Added ✅") : alert("Failed ❌"))} className="px-3 py-2 rounded-lg border text-sm bg-white hover:bg-slate-50">Watch</button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        {hasMore ? (
          <button onClick={() => { setPage((s) => { const np = s + 1; loadPage(np); return np; }); }} disabled={loading} className="px-6 py-3 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
            {loading ? "Loading…" : "Load more"}
          </button>
        ) : (
          <div className="text-slate-500">No more products</div>
        )}
      </div>
    </>
  );
}
