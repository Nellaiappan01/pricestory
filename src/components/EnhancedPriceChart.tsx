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

ChartJS.register(TimeScale, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

type PricePoint = { price: number; at: string | Date };

const formatINR = (n: number | null | undefined) =>
  n === null || n === undefined ? "N/A" : `₹ ${Number(n).toLocaleString()}`;

// CSV export
function downloadCSV(history: PricePoint[], name = "price-history.csv") {
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

export default function EnhancedPriceChart({ history, productId }: { history: PricePoint[]; productId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [watching, setWatching] = useState(false);
  const [loadingWatch, setLoadingWatch] = useState(false);

  const points = useMemo(() => {
    if (!history || !history.length) return [];
    return history
      .map((h) => ({ at: new Date(h.at).getTime(), price: Number(h.price) }))
      .filter((p) => p.at && Number.isFinite(p.price))
      .sort((a, b) => a.at - b.at);
  }, [history]);

  const prepared = useMemo(() => {
    if (!points.length) return [];
    if (points.length === 1) {
      const p = points[0];
      const delta = 6 * 60 * 60 * 1000; // 6 hours padding for single point
      return [
        { x: p.at - delta, y: p.price },
        { x: p.at, y: p.price },
        { x: p.at + delta, y: p.price },
      ];
    }
    return points.map((p) => ({ x: p.at, y: p.price }));
  }, [points]);

  const stats = useMemo(() => {
    if (!points.length) return { min: null, max: null, avg: null, points: 0 };
    const arr = points.map((p) => p.price);
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const avg = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
    return { min, max, avg, points: arr.length };
  }, [points]);

  const data = useMemo(
    () => ({
      datasets: [
        {
          label: "Price (₹)",
          data: prepared,
          borderColor: "#6D28D9",
          backgroundColor: (ctx: any) => {
            const c = ctx.chart.ctx;
            const gradient = c.createLinearGradient(0, 0, 0, ctx.chart.height);
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
    }),
    [prepared]
  );

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
            return v ? `Price: ${formatINR(v)}` : "";
          },
        },
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        type: "time",
        time: { tooltipFormat: "PP p" },
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
        grid: { display: false },
      },
      y: {
        grid: { color: "rgba(15,23,42,0.04)" },
        ticks: { callback: (val: any) => (val == null ? "" : `₹ ${Number(val).toLocaleString()}`) },
        beginAtZero: false,
      },
    },
  };

  async function handleWatch() {
    if (!productId) return alert("Product id missing");
    setLoadingWatch(true);
    try {
      const res = await fetch("/api/watch-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.ok) {
        setWatching(true);
        alert("You are now watching this product ✅");
      } else {
        alert("Failed to watch product");
        console.error(data);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to watch product (network)");
    } finally {
      setLoadingWatch(false);
    }
  }

  const Header = (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="text-sm text-gray-500">Current price</div>
        <div className="text-3xl md:text-4xl font-extrabold text-gray-900">
          {formatINR(stats.points ? points[points.length - 1].price : null)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex gap-3">
          <div className="px-3 py-2 bg-white rounded-lg border text-sm">
            <div className="text-xs text-gray-500">Min</div>
            <div className="font-semibold text-gray-900">{formatINR(stats.min)}</div>
          </div>
          <div className="px-3 py-2 bg-white rounded-lg border text-sm">
            <div className="text-xs text-gray-500">Max</div>
            <div className="font-semibold text-gray-900">{formatINR(stats.max)}</div>
          </div>
          <div className="px-3 py-2 bg-white rounded-lg border text-sm">
            <div className="text-xs text-gray-500">Avg</div>
            <div className="font-semibold text-gray-900">{formatINR(stats.avg)}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(history || [], "price-history.csv")}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50"
            title="Export CSV"
          >
            ⤓ Export
          </button>

          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            title="Open fullscreen"
          >
            ⤢ View
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white rounded-2xl shadow p-6 border border-gray-100">
        {Header}

        <div className="mt-6 w-full h-72 md:h-96">
          {prepared.length ? <Line data={data as any} options={options} /> : <div className="flex items-center justify-center h-full text-sm text-gray-500">No price history yet.</div>}
        </div>

        <div className="mt-6 flex gap-3">
          <a className="px-4 py-2 bg-indigo-600 text-white rounded-md" href="#" onClick={(e) => e.preventDefault()}>
            Buy Now
          </a>

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
                <button onClick={() => downloadCSV(history || [], "price-history.csv")} className="px-3 py-2 bg-white border rounded-lg">Export CSV</button>
                <button onClick={() => setIsOpen(false)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg">Close</button>
              </div>
            </div>

            <div className="mt-4 w-full h-[60vh]">
              {prepared.length ? <Line data={data as any} options={{ ...options, maintainAspectRatio: false, scales: { ...options.scales, x: { ...options.scales.x, ticks: { maxTicksLimit: 10 } } } }} /> : <div className="flex items-center justify-center h-full text-sm text-gray-500">No price history yet.</div>}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
