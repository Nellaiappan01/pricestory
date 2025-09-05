"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type ProductPreview = {
  title?: string;
  price?: string | number;
  image?: string;
  source?: string;
  url?: string;
};

export default function QuickTrack() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductPreview | null>(null);
  const [error, setError] = useState("");

  async function handleTrack() {
    setError("");
    setProduct(null);
    if (!link) {
      setError("Paste a product link first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/fetch-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Server returned ${res.status}: ${body}`);
      }

      const data = await res.json();
      setProduct({ ...data, url: link });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to fetch product.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 w-full max-w-3xl mx-auto px-4">
      {/* INPUT + BUTTON */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste Flipkart or Amazon product link"
          className="w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />

        <button
          onClick={handleTrack}
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-shadow shadow-sm hover:shadow-md disabled:opacity-60"
        >
          {loading ? "Fetching..." : "Track"}
        </button>
      </div>

      {/* COMPARE PLANS LINK */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/pricing"
          className="text-sm text-slate-700 hover:underline text-center"
        >
          Compare plans
        </Link>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}

      {/* PRODUCT PREVIEW */}
      {product && (
        <motion.div
          className="mt-6 p-4 rounded-xl bg-white shadow-sm hover:shadow-lg transition transform hover:-translate-y-1"
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image}
                alt={product.title}
                className="w-full sm:w-28 h-28 object-cover rounded-md flex-shrink-0"
              />
            ) : (
              <div className="w-full sm:w-28 h-28 bg-slate-100 rounded-md flex items-center justify-center text-slate-400">
                No image
              </div>
            )}

            <div className="flex-1">
              <h3 className="font-semibold text-base">{product.title ?? "Untitled product"}</h3>
              {product.price && (
                <p className="text-slate-600 mt-1 text-sm">
                  Price: <span className="font-medium">{product.price}</span>
                </p>
              )}
              {product.source && <p className="text-xs text-slate-400 mt-1">Source: {product.source}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-sm px-3 py-1 rounded-md border hover:shadow-sm transition"
                >
                  Open original
                </a>

                <button
                  className="text-sm px-3 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 transition"
                  onClick={() => {
                    fetch("/api/watch-product", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: product.url }),
                    }).then(() => alert("Added to watchlist (if logged in)."));
                  }}
                >
                  Watch
                </button>

                {/* NEXT button */}
                <Link
                  href={`/products/create?url=${encodeURIComponent(product.url ?? "")}`}
                  className="ml-auto text-sm px-4 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  Next
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
