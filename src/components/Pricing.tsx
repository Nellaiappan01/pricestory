// src/components/Pricing.tsx
"use client";
import React from "react";

type Plan = {
  id: string;
  name: string;
  priceLabel: string;
  features: string[];
  ctaText: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "₹0",
    features: ["Track 5 products", "5 alerts / month"],
    ctaText: "Get Free",
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "₹99 / month",
    features: ["Track 100 products", "Unlimited alerts", "Priority queue"],
    ctaText: "Start Pro",
    featured: true,
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "Custom",
    features: ["API access", "CSV exports"],
    ctaText: "Contact Sales",
  },
];

export default function Pricing() {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-8">Plans for everyone</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <article
              key={p.id}
              className={`relative rounded-2xl p-6 border ${
                p.featured ? "bg-gradient-to-br from-indigo-500 to-indigo-300 text-white shadow-2xl transform scale-100" : "bg-white text-gray-900"
              } ${p.featured ? "md:translate-y-0 z-10" : ""}`}
            >
              {/* Featured badge */}
              {p.featured && (
                <div className="absolute -top-3 left-6 inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-sm font-medium backdrop-blur">
                  Popular
                </div>
              )}

              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <div className={`text-sm font-medium ${p.featured ? "text-indigo-100" : "text-gray-500"}`}>{p.name}</div>
                  <div className={`mt-4 text-3xl font-extrabold ${p.featured ? "text-white" : "text-gray-900"}`}>{p.priceLabel}</div>
                </div>

                <ul className={`mt-4 mb-6 space-y-3 ${p.featured ? "text-indigo-50/90" : "text-gray-700"}`}>
                  {p.features.map((f) => (
                    <li key={f} className="text-sm">
                      • {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {p.featured ? (
                    <button
                      className="w-full py-3 rounded-xl bg-white text-indigo-700 font-semibold shadow hover:opacity-95 transition"
                      onClick={() => {
                        // client-side CTA — replace with routing or Stripe checkout
                        window.location.href = "/signup?plan=pro";
                      }}
                    >
                      {p.ctaText}
                    </button>
                  ) : p.id === "business" ? (
                    <button
                      className="w-full py-3 rounded-xl border border-gray-300 text-gray-900 font-medium hover:bg-gray-50 transition"
                      onClick={() => {
                        window.location.href = "/contact";
                      }}
                    >
                      {p.ctaText}
                    </button>
                  ) : (
                    <button
                      className="w-full py-3 rounded-xl border border-gray-200 text-gray-900 font-medium hover:bg-gray-50 transition"
                      onClick={() => {
                        window.location.href = "/signup?plan=free";
                      }}
                    >
                      {p.ctaText}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* small footnote */}
        <p className="mt-6 text-sm text-gray-500 text-center">
          Prices shown are in INR. For teams or enterprise plans contact sales for custom pricing and SLA.
        </p>
      </div>
    </section>
  );
}
