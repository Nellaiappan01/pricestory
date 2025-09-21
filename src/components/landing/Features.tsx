// src/components/landing/Features.tsx
"use client";

import React from "react";

export default function Features() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold mb-6">Powerful features</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeatureCard title="Accurate history" desc="See historical prices, min/max/avg and export CSV." />
        <FeatureCard title="Instant alerts" desc="Email and mobile alerts when prices drop." />
        <FeatureCard title="Mobile-first UI" desc="Fast, pocket-friendly experience." />
        <FeatureCard title="Affiliate friendly" desc="Direct buy links and affiliate redirects." />
      </div>
    </section>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow hover:shadow-lg transition">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
}
