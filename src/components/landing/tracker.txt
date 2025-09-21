"use client";

import React, { useState } from "react";
import PreviewProduct from "@/components/ui/PreviewProduct";
import Link from "next/link";

type ProductPreview = {
  id?: string;
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

function isProbablyUrl(s: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  return urlRegex.test(s);
}

export default function QuickTrack() {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  async function handleTrack(url?: string) {
    setError("");
    const targetUrl = (url ?? link)?.trim();
    if (!targetUrl) {
      setError("Paste a product link first.");
      return;
    }
    if (!isProbablyUrl(targetUrl)) {
      setError("That doesn't look like a valid URL.");
      return;
    }

    setPreview(null);
    setSavedId(null);
    setLoading(true);

    try {
      const flipkart = isFlipkartUrl(targetUrl);
      let previewData: ProductPreview | null = null;

      if (flipkart) {
        const fkRes = await fetch("/api/fk-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });
        if (!fkRes.ok) throw new Error(await fkRes.text());
        previewData = await fkRes.json();
      } else {
        const res = await fetch("/api/fetch-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });
        if (!res.ok) throw new Error(await res.text());
        previewData = await res.json();
      }

      const previewToShow: ProductPreview = { ...(previewData || {}), url: targetUrl };
      setPreview(previewToShow);

      const addBody: any = { url: targetUrl };
      if (previewData) addBody.details = previewData;

      const addRes = await fetch("/api/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addBody),
      });
      const addJson = await addRes.json();
      if (!addRes.ok) throw new Error(addJson?.error || "Add-product failed");

      setSavedId(addJson.id);
      setPreview((prev) => ({ ...(prev || {}), id: addJson.id }));
      setLink(targetUrl);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to track product.");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setLink("");
    setPreview(null);
    setSavedId(null);
    setError("");
  }

  async function pasteFromClipboardAndTrack() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !isProbablyUrl(text)) {
        setError("Clipboard doesn't contain a valid URL.");
        return;
      }
      setLink(text.trim());
      await handleTrack(text.trim());
    } catch {
      setError("Clipboard permission denied. Paste manually.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTrack();
    }
  }

  return (
    <div className="mt-8 w-full max-w-3xl mx-auto px-4">
      {/* INPUT + SINGLE ACTION BUTTON */}
      <div className="relative flex items-stretch">
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste product link"
          className="w-full p-3 pr-24 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />

        {/* clear icon */}
        {link && (
          <button
            onClick={clearAll}
            className="absolute right-20 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition"
            aria-label="Clear"
          >
            ✕
          </button>
        )}

        {/* unified action button */}
        <button
          onClick={() => (link ? handleTrack() : pasteFromClipboardAndTrack())}
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60 text-sm"
        >
          {loading ? "Fetching…" : link ? "Track" : "Paste & Track"}
        </button>
      </div>

      {/* COMPARE PLANS LINK */}
      <div className="mt-6 flex justify-center">
        <Link href="/pricing" className="text-sm text-slate-700 hover:underline">
          Compare plans
        </Link>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}

      {preview && (
        <div>
          <PreviewProduct product={preview} />
          <div className="mt-3 text-sm text-slate-500">
            {savedId ? "Saved — product ready." : "Preview only (not saved)."}
          </div>
        </div>
      )}
    </div>
  );
}
