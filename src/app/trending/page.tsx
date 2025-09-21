// src/app/trending/page.tsx
import React from "react";
import PopularProducts from "@/components/landing/PopularProducts";

export const metadata = {
  title: "Trending products",
};

export default function TrendingPage() {
  return (
    <main className="min-h-screen py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold">Trending products</h1>
          <p className="text-sm text-slate-500 mt-2">Top popular items on PriceTracker — updated in real time.</p>
        </header>

        {/* forceShowAll opens in "View all"/trending mode (keeps pagination) */}
        <PopularProducts initialCount={25} forceShowAll />
      </div>
    </main>
  );
}
