"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Pricing from "@/components/Pricing";
import QuickTrack from "./QuickTrack";
import { AnimatedText } from "./animate";
import TypingHeadlineLoop, { TypingHeadline } from "./TypingHeadline";

/* ---------------- SAMPLE DATA (replace with fetch) ---------------- */

const sampleProducts = [
  {
    id: "1",
    title: "Noise-Cancelling Headphones — Black",
    price: 3499,
    url: "https://www.flipkart.com/item/1",
    priceHistory: [
      { t: "Day 1", p: 3999 },
      { t: "Day 2", p: 3899 },
      { t: "Day 3", p: 3799 },
      { t: "Day 4", p: 3599 },
      { t: "Day 5", p: 3499 },
    ],
  },
  {
    id: "2",
    title: "Smart Fitness Band — Pro",
    price: 1299,
    url: "https://www.flipkart.com/item/2",
    priceHistory: [
      { t: "D1", p: 1499 },
      { t: "D2", p: 1399 },
      { t: "D3", p: 1349 },
      { t: "D4", p: 1299 },
    ],
  },
];

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
            <MotionFade delay={0.02}><TypingHeadlineLoop className="text-2xl sm:text-3xl font-extrabold" />


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

        <div>
          <Card className="shadow-2xl">
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold">Featured: {sampleProducts[0].title}</h3>
                  <p className="text-slate-500 text-sm">Current: ₹{sampleProducts[0].price}</p>

                  <div className="mt-2 flex gap-2">
                    {["Bad", "Good", "Very Good"].map((r) => {
                      const isSelected = selectedRating[sampleProducts[0].id] === r;
                      const base =
                        r === "Bad"
                          ? "bg-red-50 text-red-700"
                          : r === "Good"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700";
                      return (
                        <button
                          key={r}
                          onClick={() => {
                            setSelectedRating((s) => ({ ...s, [sampleProducts[0].id]: r }));
                            sendFeedback(sampleProducts[0].id, r);
                          }}
                          className={`px-2 py-0.5 rounded-full text-xs border transition ${isSelected ? "bg-indigo-600 text-white" : base}`}
                          aria-pressed={isSelected}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 h-32">
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={sampleProducts[0].priceHistory}>
                        <Tooltip />
                        <Line type="monotone" dataKey="p" strokeWidth={2} stroke="#6d28d9" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={sampleProducts[0].url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-sm font-medium inline-flex items-center gap-2 hover:underline"
                    >
                      Buy now
                    </a>

                    <button
                      onClick={() => watchProduct(sampleProducts[0].id)}
                      className="ml-auto text-sm px-3 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 transition"
                      aria-label="Watch price"
                    >
                      Watch price
                    </button>
                  </div>
                </div>

                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-white rounded-xl flex items-center justify-center text-slate-400 border">
                  <div className="text-xs">Image</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      

      {/* POPULAR PRODUCTS */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Popular tracked products</h3>
          <Link href="/products" className="text-sm text-slate-600 hover:underline">
            View all
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleProducts.map((p) => (
            <motion.div key={p.id} whileHover={{ translateY: -6 }} className="p-4 bg-white rounded-2xl shadow">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-sm truncate">{p.title}</h4>
                  <p className="text-xs text-slate-500">₹{p.price}</p>
                </div>
                <div className="w-20 h-12">
                  <ResponsiveContainer width="100%" height={50}>
                    <LineChart data={p.priceHistory}>
                      <Line type="monotone" dataKey="p" strokeWidth={2} stroke="#06b6d4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <a
                  href={`/api/redirect/${(p as any)._id ?? p.id}`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                >
                  Buy Now
                </a>

                <button
                  onClick={() => watchProduct(p.id)}
                  className="ml-auto text-xs px-2 py-1 rounded-md border"
                  aria-label={`Watch ${p.title}`}
                >
                  Watch
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
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
