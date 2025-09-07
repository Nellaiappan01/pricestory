"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineShoppingCart, HiOutlineBell, HiOutlineShare,HiCheck,HiBell  } from "react-icons/hi";
import { FiClock } from "react-icons/fi";

export type PreviewProductType = {
  id?: string;
  title?: string;
  price?: string | number | null;
  oldPrice?: string | number | null;
  image?: string | null;
  source?: string | null; // kept for internal use but displayed now as badge
  url?: string | null;
  affiliateUrl?: string | null;
  rating?: number | null;
  offers?: string[] | null;
  trackedSince?: string | null;
};

function formatINR(v?: string | number | null) {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return String(v);
  return `₹ ${n.toLocaleString()}`;
}

function daysSince(iso?: string | null) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * - Adds domain -> brand mapping & colored badge
 * - Smooth card hover (framer motion)
 * - Smooth buy button color change on hover + press feedback
 *
 * Business logic unchanged except for handleBuy navigation method (anchor click fallback to avoid about:blank).
 */
export default function PreviewProductMassive({ product }: { product: PreviewProductType }) {
  const [watching, setWatching] = useState(false);
  const [loadingWatch, setLoadingWatch] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localTrackedSince, setLocalTrackedSince] = useState<string | null>(null);
  const [buyPressed, setBuyPressed] = useState(false);

  // affiliate resolver (client placeholder). Replace AFF_ID server-side later.
  function getAffiliateLink() {
    if (product.affiliateUrl) return product.affiliateUrl;
    if (!product.url) return "#";
    const AFF_ID = "AFF_ID";
    try {
      const u = new URL(String(product.url));
      u.searchParams.set("aff", AFF_ID);
      return u.toString();
    } catch {
      return `${String(product.url)}?aff=${AFF_ID}`;
    }
  }

  // Domain -> Brand mapping
  const BRAND_MAP: Record<
    string,
    { label: string; badgeClasses: string; textClasses?: string }
  > = {
    "flipkart.com": { label: "Flipkart", badgeClasses: "bg-yellow-100 border-yellow-200", textClasses: "text-yellow-800" },
    "amazon.in": { label: "Amazon", badgeClasses: "bg-amber-100 border-amber-200", textClasses: "text-amber-900" },
    "amazon.com": { label: "Amazon", badgeClasses: "bg-amber-100 border-amber-200", textClasses: "text-amber-900" },
    "myntra.com": { label: "Myntra", badgeClasses: "bg-pink-50 border-pink-100", textClasses: "text-pink-700" },
    "ebay.com": { label: "eBay", badgeClasses: "bg-sky-50 border-sky-100", textClasses: "text-sky-700" },
    "ajio.com": { label: "Ajio", badgeClasses: "bg-emerald-50 border-emerald-100", textClasses: "text-emerald-700" },
    // add more here as needed
  };

  function getSourceLabelAndStyle() {
    // prefer explicit product.source if it's a friendly name we recognize
    if (product.source) {
      const s = product.source.trim().toLowerCase();
      for (const key of Object.keys(BRAND_MAP)) {
        if (key.includes(s) || BRAND_MAP[key].label.toLowerCase().includes(s)) {
          return BRAND_MAP[key];
        }
      }
    }
    // otherwise extract hostname
    if (!product.url) return null;
    try {
      const url = new URL(product.url);
      const host = url.hostname.replace(/^www\./, "");
      const mapped = BRAND_MAP[host];
      if (mapped) return mapped;
      // fallback: display host with neutral styling
      return { label: host, badgeClasses: "bg-white border-slate-100", textClasses: "text-slate-800" };
    } catch {
      return null;
    }
  }

  const badgeInfo = getSourceLabelAndStyle();
  const trackedSinceIso = localTrackedSince || product.trackedSince || null;
  const trackedDays = daysSince(trackedSinceIso);

  // card variants for smooth hover
  const cardVariants = {
    initial: { opacity: 0, y: 8, scale: 1 },
    enter: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: "easeOut" } },
    hover: {
      y: -8,
      scale: 1.01,
      boxShadow: "0 24px 48px rgba(16,24,40,0.10)",
      transition: { type: "spring", stiffness: 120, damping: 14 },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 140, damping: 22 } },
  };

  const infoVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.36 } },
  };

  function triggerPulse() {
    setPulse(true);
    window.setTimeout(() => setPulse(false), 900);
  }

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
        const nowIso = new Date().toISOString();
        setLocalTrackedSince(nowIso);
        triggerPulse();
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

  // helper: open link via an anchor element (user-gesture friendly)
  function openUrlViaAnchor(url: string) {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (err) {
      console.error("openUrlViaAnchor failed", err);
      return false;
    }
  }

  // UPDATED handleBuy: uses anchor click first for mobile & as fallback to avoid about:blank.
  function handleBuy(e?: React.MouseEvent) {
    e?.preventDefault();
    const link = getAffiliateLink();

    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

    if (isMobile) {
      // anchor click is the most reliable for mobile app deep-links and avoids blank-tab flicker
      const ok = openUrlViaAnchor(link);
      if (!ok) {
        const win = window.open(link, "_blank", "noopener,noreferrer");
        if (!win) {
          window.location.href = link;
        }
      }
      setShowActions(false);
      return;
    }

    // Desktop: prefer window.open (normal UX), but fallback to anchor and then same-tab
    try {
      const newWin = window.open(link, "_blank", "noopener,noreferrer");
      if (!newWin) {
        const ok = openUrlViaAnchor(link);
        if (!ok) {
          window.location.href = link;
        }
      }
    } catch (err) {
      console.error("window.open failed", err);
      const ok = openUrlViaAnchor(link);
      if (!ok) window.location.href = link;
    } finally {
      setShowActions(false);
    }
  }

  // single share handler (native first, fallback copy)
  async function handleShare() {
    const link = getAffiliateLink();
    const title = product.title || "Product";
    const text = `${title} — ${formatINR(product.price)}\n${link}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: link });
        return;
      } catch (err) {
        // fallback
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      alert("Link copied to clipboard. Paste into any DM or app.");
    } catch (err) {
      console.error("copy failed", err);
      alert("Unable to copy. Please copy manually: " + link);
    }
  }

  const affiliateLink = getAffiliateLink();

  return (
    <>
      {/* article is a group so child elements can react with group-hover */}
      <motion.article
        initial="initial"
        animate="enter"
        whileHover="hover"
        variants={cardVariants}
        className="group w-full max-w-xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-lg p-4 md:p-6 overflow-hidden"
        aria-labelledby={`product-${product.id || "noid"}-title`}
      >
        <div className="flex gap-4 md:gap-6 items-start">
          {/* IMAGE + badge */}
          <motion.div
            variants={imageVariants}
            className="relative flex-shrink-0 w-28 h-28 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-slate-50 ring-1 ring-slate-100 -translate-y-2"
          >
            {/* SOURCE BADGE */}
            {badgeInfo && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.28 }}
                className={`absolute top-3 left-3 z-20 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeInfo.badgeClasses} ${badgeInfo.textClasses || "text-slate-800"} shadow-sm`}
                aria-hidden
              >
                {badgeInfo.label}
              </motion.div>
            )}

            {product.image ? (
              <motion.img
                src={product.image}
                alt={product.title}
                className="object-cover w-full h-full object-top filter brightness-95 transition-transform duration-300"
                whileHover={{ scale: 1.04 }}
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No image</div>
            )}

            <AnimatePresence>
              {pulse && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0.28 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="absolute inset-0 rounded-2xl bg-indigo-100/30 pointer-events-none"
                />
              )}
            </AnimatePresence>
          </motion.div>

          {/* BODY */}
          <motion.div variants={infoVariants} className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 id={`product-${product.id || "noid"}-title`} className="text-sm md:text-lg font-semibold text-slate-900 truncate">
                  {product.title || "Untitled product"}
                </h3>

                <div className="mt-1 flex items-center gap-2">
                  <div className="flex items-baseline gap-3">
                    <div className={`text-lg md:text-2xl font-extrabold tracking-tight ${pulse ? "text-indigo-600" : "text-indigo-700"}`} aria-live="polite">
                      {formatINR(product.price)}
                    </div>

                    {product.oldPrice && Number(product.oldPrice) > Number(product.price ?? 0) && (
                      <div className="text-xs text-slate-400 line-through">{formatINR(product.oldPrice)}</div>
                    )}
                  </div>

                  {product.rating != null && (
                    <div className="ml-2 text-xs text-slate-500 flex items-center gap-1">
                      <svg className="w-3 h-3 fill-current text-yellow-500" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.49 6.91l6.571-.956L10 0l2.939 5.955 6.571.956-4.755 4.635 1.123 6.545z" />
                      </svg>
                      <span>{Number(product.rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {product.offers && product.offers.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {product.offers.slice(0, 2).map((o, i) => (
                      <div key={i} className="text-xs px-2 py-1 bg-emerald-50 text-emerald-800 rounded-md font-medium">
                        {o}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="hidden md:flex md:flex-col md:items-end md:gap-2">
                <div className="text-xs text-slate-500"> {/* placeholder */} </div>
              </div>
            </div>

            {/* bottom area: tracked + buttons (side-by-side) */}
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-md">
                    <FiClock className="w-3 h-3" />
                    <span>
                      {trackedDays == null ? "—" : trackedDays <= 0 ? "Tracked: today" : `Tracked: ${trackedDays} day${trackedDays > 1 ? "s" : ""}`}
                    </span>
                  </span>
                </div>

                {/* single Share button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    aria-label="Share product link"
                    title="Share"
                    className="inline-flex items-center justify-center w-28 md:w-36 gap-2 px-3 py-2 rounded-full bg-slate-50 border border-slate-200 text-sm hover:scale-105 transition-transform duration-150"
                  >
                    <HiOutlineShare className="w-4 h-4" />
                    <span>{copied ? "Copied" : "Share"}</span>
                  </button>
                </div>
              </div>

              {/* PRIMARY CTAs: side-by-side */}
              <div className=" grid grid-cols-2 gap-3" >
                {/* Buy button: responds to card hover (group-hover) and own interactions */}
                <motion.button
                  onMouseDown={() => setBuyPressed(true)}
                  onMouseUp={() => setBuyPressed(false)}
                  onMouseLeave={() => setBuyPressed(false)}
                  onClick={handleBuy}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold shadow transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300
                    ${buyPressed ? "bg-indigo-800 text-white" : "bg-indigo-600 text-white"}
                    group-hover:bg-indigo-700`}
                  aria-label="Buy Now"
                >
                  <HiOutlineShoppingCart className="w-4 h-4" />
                  Buy
                </motion.button>

                <button
                  onClick={handleWatch}
                  disabled={loadingWatch || watching}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
                    watching ? "bg-green-50 border-green-300 text-green-900" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  } hover:scale-[1.01] transition-transform duration-150`}
                >
                  <HiOutlineBell className="w-4 h-4" />
                  {loadingWatch ? "Saving..." : watching ? "Watching ✓" : "Watch Price"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.article>

      {/* ACTION SHEET (mobile) */}
      <AnimatePresence>
        {showActions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setShowActions(false)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 210, damping: 28 }}
              className="fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl p-4 shadow-xl border-t border-slate-100"
            >
              <div className="max-w-xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{product.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{formatINR(product.price)}</div>
                  </div>

                  <button onClick={() => setShowActions(false)} className="text-slate-500 text-sm">Close</button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={handleBuy}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold shadow-sm"
                  >
                    <HiOutlineShoppingCart className="w-4 h-4" />
                    Buy Now
                  </button>

                  <button
                    onClick={handleWatch}
                    disabled={loadingWatch || watching}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium ${
                      watching ? "bg-green-50 border-green-300 text-green-900" : "bg-white border-slate-200 text-slate-700"
                    }`}
                  >
                    <HiOutlineBell className="w-4 h-4" />
                    {loadingWatch ? "Saving..." : watching ? "Watching ✓" : "Watch Price"}
                  </button>

                  <button
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 text-sm"
                  >
                    <HiOutlineShare className="w-4 h-4" />
                    Share
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(getAffiliateLink());
                      setShowActions(false);
                      alert("Affiliate link copied ✅");
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border border-slate-200 text-sm"
                  >
                    <HiOutlineShare className="w-4 h-4" />
                    link Copy 
                  </button>
                </div>

                <div className="mt-4 text-xs text-slate-500">Tip: replace AFF_ID with your affiliate id on server for payouts.</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
