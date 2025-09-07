"use client";

import React, { useState } from "react";
import PreviewProduct from "@/components/ui/PreviewProduct";
import Link from "next/link";

type ProductPreview = {
  id?: string; // will hold DB id when available
  title?: string;
  price?: string | number;
  image?: string;
  source?: string;
  url?: string;
  affiliateUrl?: string;
};

function isFlipkartUrl(url: string) {
  try {
    return new URL(url).hostname.includes("flipkart.com");
  } catch {
    return false;
  }
}

export default function QuickTrack() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  async function handleTrack() {
    setError("");
    setPreview(null);
    setSavedId(null);

    if (!link) {
      setError("Paste a product link first.");
      return;
    }

    setLoading(true);
    try {
      const flipkart = isFlipkartUrl(link);

      // 1) Fetch preview (Flipkart API or generic)
      let previewData: ProductPreview | null = null;
      if (flipkart) {
        const fkRes = await fetch("/api/fk-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: link }),
        });
        if (!fkRes.ok) {
          const body = await fkRes.text();
          throw new Error(`Flipkart API returned ${fkRes.status}: ${body}`);
        }
        previewData = await fkRes.json();
      } else {
        const res = await fetch("/api/fetch-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: link }),
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Fetch product returned ${res.status}: ${body}`);
        }
        previewData = await res.json();
      }

      // Immediately show preview (so user sees instant results)
      const previewToShow: ProductPreview = { ...(previewData || {}), url: link };
      setPreview(previewToShow);

      // 2) Insert into DB (include preview details so server can save affiliateUrl etc.)
      const addBody: any = { url: link };
      if (previewData) {
        addBody.details = {
          title: previewData.title ?? null,
          image: previewData.image ?? null,
          price: previewData.price ?? null,
          affiliateUrl: previewData.affiliateUrl ?? null,
          source: previewData.source ?? null,
        };
      }

      const addRes = await fetch("/api/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addBody),
      });

      const addJson = await addRes.json();
      if (!addRes.ok) {
        // if add failed don't redirect; keep preview visible and show error
        throw new Error(addJson?.error || addJson?.detail || "Add-product failed");
      }

      // Save DB id but DO NOT redirect automatically
      const id = addJson.id;
      setSavedId(id);
      // merge id into preview (so PreviewProduct can show "Open product page")
      setPreview((prev) => ({ ...(prev || {}), id }));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to track product.");
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
        <Link href="/pricing" className="text-sm text-slate-700 hover:underline text-center">
          Compare plans
        </Link>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}

      {/* PREVIEW CARD */}
      {preview && (
        <div>
          <PreviewProduct product={preview} />
          {/* NOTE: removed duplicate "Open product page" — PreviewProduct renders it now */}
          <div className="mt-3 text-sm text-slate-500">
            {savedId ? "Saved — product ready." : "Preview only (not saved)."}
          </div>
        </div>
      )}
    </div>
  );
}
