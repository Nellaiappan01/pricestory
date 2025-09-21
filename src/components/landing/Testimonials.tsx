// src/components/landing/Testimonials.tsx
"use client";

import React from "react";

export default function Testimonials() {
  const items = [
    { name: "Ravi", text: "Saved ₹2,300 on my laptop purchase — brilliant!" },
    { name: "Priya", text: "The alerts are timely and accurate." },
    { name: "Arjun", text: "Simple and works well on phone." },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-12 bg-slate-50 rounded-2xl">
      <h2 className="text-2xl font-bold mb-6 text-center">What our users say</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((it) => (
          <blockquote key={it.name} className="p-6 bg-white rounded-2xl shadow">
            <p className="text-slate-700">“{it.text}”</p>
            <footer className="mt-4 text-sm text-slate-500">— {it.name}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
