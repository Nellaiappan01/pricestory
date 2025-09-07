// src/components/EnhancedPriceChart.tsx
"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
  CategoryScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";
import { watchProductApi } from "@/lib/client/watchProduct";

ChartJS.register(TimeScale, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

type PricePoint = { price?: number | string; at?: string | Date | number };

// allow optional buyUrl
export default function EnhancedPriceChart({
  history,
  productId,
  buyUrl,
}: {
  history: PricePoint[];
  productId?: string;
  buyUrl?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [watching, setWatching] = useState(false);
  const [loadingWatch, setLoadingWatch] = useState(false);

  const formatINR = (n: number | null | undefined) =>
    n === null || n === undefined || !Number.isFinite(n) ? "N/A" : `₹ ${Number(n).toLocaleString()}`;

  // ---------- Normalise & validate ----------
  const { prepared, numericHistoryForCSV, rawDropped } = useMemo(() => {
    const raw = Array.isArray(history) ? history : [];

    const mapped = raw.map((h, idx) => {
      let priceNum: number | null = null;
      if (h == null) {
        priceNum = null;
      } else if (typeof h.price === "number") {
        priceNum = Number(h.price);
      } else {
        const s = String(h.price ?? "").replace(/[^0-9.\-]+/g, "");
        priceNum = s === "" ? null : Number(s);
      }

      let atMs: number | null = null;
      try {
        if (h.at == null) atMs = null;
        else {
          const d = new Date(h.at);
          atMs = isNaN(d.getTime()) ? null : d.getTime();
        }
      } catch {
        atMs = null;
      }

      return { idx, raw: h, x: atMs, y: priceNum };
    });

    const valids = mapped.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    const dropped = mapped.filter((p) => !(Number.isFinite(p.x) && Number.isFinite(p.y)));

    valids.sort((a, b) => a.x - b.x);

    let final: { x: number; y: number }[] = [];
    if (valids.length === 1) {
      const p = valids[0];
      const delta = 6 * 60 * 60 * 1000; // 6 hours
      final = [
        { x: p.x - delta, y: p.y },
        { x: p.x, y: p.y },
        { x: p.x + delta, y: p.y },
      ];
    } else {
      final = valids.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
    }

    const numericHistoryForCSV = valids.map((p) => ({ at: new Date(p.x).toISOString(), price: p.y }));

    return { prepared: final, numericHistoryForCSV, rawDropped: dropped };
  }, [history]);

  useMemo(() => {
    if (rawDropped && rawDropped.length) {
      // eslint-disable-next-line no-console
      console.warn("EnhancedPriceChart: dropped invalid history rows (x or y not numeric):", rawDropped);
    }
  }, [rawDropped]);

  // safety net: avoid Chart.js error by not rendering when NaN present
  const anyNaN = prepared.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y));
  if (anyNaN) {
    // eslint-disable-next-line no-console
    console.error("EnhancedPriceChart: prepared contains NaN, not rendering chart. prepared:", prepared);
    return (
      <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        <div className="text-sm text-red-600">Chart data invalid — please check server-side priceHistory entries.</div>
      </div>
    );
  }

  if (!prepared || prepared.length < 1) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        <div className="text-sm text-slate-500">No price history yet — waiting for numeric price points.</div>
      </div>
    );
  }

  // ---------- Chart data & options ----------
  const data = {
    datasets: [
      {
        label: "Price (₹)",
        data: prepared.map((p) => ({ x: p.x, y: p.y })),
        borderColor: "#6D28D9",
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          const c = chart.ctx;
          const gradient = c.createLinearGradient(0, 0, 0, chart.height);
          gradient.addColorStop(0, "rgba(99,102,241,0.18)");
          gradient.addColorStop(1, "rgba(99,102,241,0.02)");
          return gradient;
        },
        fill: true,
        tension: 0.28,
        pointRadius: prepared.length <= 3 ? 4 : 0,
        pointHoverRadius: 6,
        borderWidth: 3,
        spanGaps: true,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          title: (items: any) => {
            if (!items || !items[0]) return "";
            const d = new Date(items[0].parsed.x);
            return d.toLocaleString();
          },
          label: (ctx: any) => {
            const v = ctx.raw?.y ?? ctx.parsed?.y;
            return v || v === 0 ? `Price: ${formatINR(v)}` : "";
          },
        },
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: { type: "time", time: { tooltipFormat: "PP p" }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false } },
      y: { grid: { color: "rgba(15,23,42,0.04)" }, ticks: { callback: (val: any) => (val == null ? "" : `₹ ${Number(val).toLocaleString()}`) }, beginAtZero: false },
    },
  };

  // ---------- Watch handler (uses helper) ----------
  async function handleWatch() {
    if (!productId) return alert("Product id missing");
    setLoadingWatch(true);
    try {
      const resp = await watchProductApi({ productId });
      if (resp?.ok) {
        setWatching(true);
        alert("You are now watching this product ✅");
      } else {
        console.error(resp);
        alert("Failed to watch product");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to watch product (network)");
    } finally {
      setLoadingWatch(false);
    }
  }

  const stats = useMemo(() => {
    const arr = prepared.map((p) => p.y);
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const avg = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
    return { min, max, avg, points: arr.length };
  }, [prepared]);

  // open buy link in new tab (affiliate)
  function goToBuy() {
    if (!buyUrl) {
      // fallback - maybe product page inside app: /products/:id
      if (productId) {
        window.open(`/products/${productId}`, "_blank", "noopener");
      }
      return;
    }
    // open affiliate or direct product external link
    window.open(buyUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">Current price</div>
            <div className="text-3xl md:text-4xl font-extrabold text-gray-900">{formatINR(stats.points ? prepared[prepared.length - 1].y : null)}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex gap-3">
              <div className="px-3 py-2 bg-white rounded-lg border text-sm"><div className="text-xs text-gray-500">Min</div><div className="font-semibold text-gray-900">{formatINR(stats.min)}</div></div>
              <div className="px-3 py-2 bg-white rounded-lg border text-sm"><div className="text-xs text-gray-500">Max</div><div className="font-semibold text-gray-900">{formatINR(stats.max)}</div></div>
              <div className="px-3 py-2 bg-white rounded-lg border text-sm"><div className="text-xs text-gray-500">Avg</div><div className="font-semibold text-gray-900">{formatINR(stats.avg)}</div></div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => downloadCSV(numericHistoryForCSV, "price-history.csv")} className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50" title="Export CSV">⤓ Export</button>
              <button onClick={() => setIsOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700" title="Open fullscreen">⤢ View</button>
            </div>
          </div>
        </div>

        <div className="mt-6 w-full h-72 md:h-96">
          <Line data={data as any} options={options} />
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={goToBuy} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Buy Now</button>

          <button disabled={loadingWatch || watching} onClick={handleWatch} className={`px-4 py-2 border rounded-md ${watching ? "bg-green-50 border-green-300" : ""}`}>
            {loadingWatch ? "Saving..." : watching ? "Watching ✓" : "Watch Price"}
          </button>
        </div>
      </motion.div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.25 }} className="relative max-w-5xl w-full bg-white rounded-2xl shadow-2xl p-6" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Price history</h3>
                <div className="text-sm text-gray-500">{stats.points} points • {formatINR(stats.min)} - {formatINR(stats.max)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadCSV(numericHistoryForCSV, "price-history.csv")} className="px-3 py-2 bg-white border rounded-lg">Export CSV</button>
                <button onClick={() => setIsOpen(false)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg">Close</button>
              </div>
            </div>

            <div className="mt-4 w-full h-[60vh]">
              <Line data={data as any} options={{ ...options, maintainAspectRatio: false, scales: { ...options.scales, x: { ...options.scales.x, ticks: { maxTicksLimit: 10 } } } }} />
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

// helper (re-used) — placed here to avoid TS error if not imported above
function downloadCSV(history: { at: string; price: number }[], name = "price-history.csv") {
  if (!history || !history.length) return;
  const rows = [["at", "price"], ...history.map((h) => [new Date(h.at).toISOString(), String(h.price)])];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
