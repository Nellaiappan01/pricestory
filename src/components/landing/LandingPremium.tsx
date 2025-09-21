// src/components/landing/LandingPremium.tsx
"use client";

import React from "react";
import QuickTrack from "@/components/landing/QuickTrack";
import PopularSection from "@/components/landing/PopularProducts";
import Features from "@/components/landing/Features";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/plans/Pricing";

export default function LandingPremium() {
  return (
    <div className="bg-white text-slate-900">
      {/* QuickTrack right under Hero */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl p-6 shadow">
          <QuickTrack />
        </div>
      </section>

      <PopularSection />
      <section className="max-w-6xl mx-auto px-4 py-12">
        <Features />
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12 bg-slate-50">
        <Testimonials />
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">Plans</h2>
        <Pricing />
      </section>
    </div>
  );
}
