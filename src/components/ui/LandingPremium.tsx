"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Pricing from "@/components/Pricing";
import QuickTrack from "../QuickTrack";
import { AnimatedText } from "./animate";

import { sampleProducts } from "../sampleData";
import PopularProducts from "../PopularProducts";

/* ----------------- Inline small helpers ----------------- */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 ${className}`}>{children}</div>;
}
function CardContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

/* Intro cover (auto hides) */
function IntroCover() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1100);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="animate-fade-in-up text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
          PT
        </div>
        <div className="mt-4 text-slate-700 font-semibold">PriceTracker</div>
      </div>

      <style jsx>{`
        .animate-fade-in-up {
          animation: fadeUp 0.9s ease both;
        }
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

/* small motion wrapper */
function MotionFade({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay }}>
      {children}
    </motion.div>
  );
}

/* ----------------- Watch + Feedback handlers ----------------- */
async function watchProduct(productId: string) {
  try {
    const res = await fetch("/api/watch-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (!res.ok) throw new Error("Failed to watch product");
    alert("Product added to your watchlist ✅");
  } catch (err) {
    console.error(err);
    alert("Could not add to watchlist. Try again.");
  }
}
async function sendFeedback(productId: string, rating: string | null) {
  if (!rating) return;
  try {
    await fetch("/api/product-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating }),
    });
  } catch (err) {
    console.warn("Feedback error", err);
  }
}

/* ----------------- Main ----------------- */
export default function LandingPremium() {
  const [selectedRating, setSelectedRating] = useState<Record<string, string | null>>({});

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <IntroCover />
      <Header />

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-12">
        <div>
          <MotionFade delay={0.02}>
            <MotionFade delay={0.02}>
              <h1 className="text-2xl sm:text-3xl font-extrabold">Heading</h1>
            </MotionFade>
          </MotionFade>

          <MotionFade delay={0.1}>
            <p className="mt-4 text-slate-600">
              <AnimatedText />
            </p>
          </MotionFade>

          <QuickTrack />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Products tracked" value="1,024" />
            <Stat label="Avg savings" value="₹1,250" />
            <Stat label="Alerts sent" value="15,329" />
            <Stat label="Uptime" value="99.98%" />
          </div>
        </div>

      </section>

      {/* POPULAR PRODUCTS */}
      <PopularProducts onWatch={watchProduct} />

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h3 className="text-xl font-semibold">Why PriceTracker</h3>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FeatureCard title="Accurate History" desc="See min / max / avg prices across time with CSV export." />
          <FeatureCard title="Instant Alerts" desc="Email & SMS alerts when your watched price hits the target." />
          <FeatureCard title="Mobile-first UI" desc="Fast, pocket-friendly experience with premium animations." />
          <FeatureCard title="Affiliate Friendly" desc="Direct buy links or affiliate redirects supported." />
        </div>
      </section>

      <Pricing />
      <Footer />
    </main>
  );
}

/* ----------------- Small helper components (Stat / FeatureCard) ----------------- */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="font-semibold mt-1">{value}</span>
    </div>
  );
}
function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-4 bg-white rounded-2xl shadow hover:scale-[1.01] transition-transform">
      <h5 className="font-medium">{title}</h5>
      <p className="text-sm text-slate-500 mt-2">{desc}</p>
    </div>
  );
}
