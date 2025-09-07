"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export type PreviewProductType = {
  id?: string;
  title?: string;
  price?: string | number | null;
  image?: string | null;
  source?: string | null; // flipkart | amazon | other
  url?: string | null;
  affiliateUrl?: string | null;
};

function formatINR(v?: string | number | null) {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return String(v);
  return `₹ ${n.toLocaleString()}`;
}

export default function PreviewProduct({ product }: { product: PreviewProductType }) {
  const [watching, setWatching] = useState(false);
  const [loadingWatch, setLoadingWatch] = useState(false);

  const buyLink = product.affiliateUrl || product.url || "#";

  const platform = (product.source || "").toLowerCase();
  const isFlipkart = platform.includes("flipkart");
  const isAmazon = platform.includes("amazon");

  async function handleWatch(e?: React.MouseEvent) {
    e?.preventDefault();
    if (!product.id && !product.url) {
      alert("No product to watch.");
      return;
    }

    setLoadingWatch(true);
    try {
      const res = await fetch("/api/watch-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product.id ? { productId: product.id } : { url: product.url }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setWatching(true);
        alert("Now tracking this product ✅");
      } else {
        console.error(body);
        alert("Failed to watch product.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setLoadingWatch(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 12px 28px rgba(16,24,40,0.08)" }}
      transition={{ duration: 0.28 }}
      className="w-full bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-6 flex flex-col md:flex-row gap-6"
    >
      {/* IMAGE */}
      <div className="flex-shrink-0 w-full md:w-44 h-44 md:h-36 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.title} className="object-cover w-full h-full" />
        ) : (
          <div className="text-xs text-slate-400">No image</div>
        )}
      </div>

      {/* BODY */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-slate-900 leading-tight">
            {product.title || "Untitled product"}
          </h3>

          <div className="mt-2 flex items-center gap-4 flex-wrap">
            <div className="text-indigo-600 font-bold text-lg md:text-2xl">
              {formatINR(product.price)}
            </div>
            {product.source && (
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  isFlipkart
                    ? "bg-yellow-100 text-yellow-800"
                    : isAmazon
                    ? "bg-amber-100 text-amber-900"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {isFlipkart ? "Flipkart" : isAmazon ? "Amazon" : "Other"}
              </span>
            )}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="mt-5 flex gap-3">
          <a
            href={buyLink}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow-sm hover:bg-indigo-700"
          >
            Buy Now
          </a>

          <button
            onClick={handleWatch}
            disabled={loadingWatch || watching}
            className={`flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg border text-sm font-medium ${
              watching
                ? "bg-green-50 border-green-300 text-green-900"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {loadingWatch ? "Saving..." : watching ? "Watching ✓" : "Watch Price"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
