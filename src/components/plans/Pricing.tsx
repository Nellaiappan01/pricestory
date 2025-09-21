// src/components/plans/Pricing.tsx
"use client";

import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import CTAButton from "./CTAButton";
import { PLANS, Plan } from "./pricingUtils";
import { handlePricingAction } from "./pricingActions";
import Toast from "./Toast";

type ToastEntry = { id: string; message: string; type?: "success" | "error" | "info" };

export default function Pricing() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const pushToast = useCallback((t: ToastEntry) => setToasts((s) => [t, ...s]), []);
  const removeToast = useCallback((id: string) => setToasts((s) => s.filter((x) => x.id !== id)), []);

  return (
    <section className="py-16 px-4 md:px-8 lg:px-16 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">Plans for everyone</h2>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">Simple pricing. No surprise fees. Upgrade anytime.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} pushToast={pushToast} removeToast={removeToast} />
          ))}
        </div>

        {/* toasts container */}
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
          {toasts.map((t) => (
            <Toast key={t.id} id={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan, pushToast, removeToast }: { plan: Plan; pushToast: (t: any) => void; removeToast: (id: string) => void }) {
  const isFeatured = !!plan.featured;
  const accent = plan.color ?? "from-slate-200 to-slate-100";
  const [loading, setLoading] = useState(false);

  const onCTAClick = async () => {
    setLoading(true);
    try {
      const res = await handlePricingAction(plan.id);
      if (!res.ok) {
        pushToast({ id: String(Date.now()), message: res.message || "Action failed", type: "error" });
      } else {
        pushToast({ id: String(Date.now()), message: res.message || "Success", type: "success" });
        if (res.redirect) {
          // small delay so user sees toast
          setTimeout(() => {
            window.location.href = res.redirect!;
          }, 700);
        }
      }
    } catch (err) {
      pushToast({ id: String(Date.now()), message: "Unexpected error", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, boxShadow: "0 20px 40px rgba(15, 23, 42, 0.12)" }}
      transition={{ duration: 0.32, type: "spring", stiffness: 250 }}
      className={`relative rounded-3xl p-8 border ${isFeatured ? `bg-gradient-to-br ${accent} text-white` : "bg-white text-slate-900"} shadow-md`}
    >
      {isFeatured && (
        <div className="absolute -top-4 left-6 inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-sm font-semibold backdrop-blur">
          Popular
        </div>
      )}

      <div className="flex flex-col h-full">
        <div className="mb-6">
          <div className={`text-sm font-medium ${isFeatured ? "text-indigo-100" : "text-slate-500"}`}>{plan.name}</div>
          <div className={`mt-4 text-5xl md:text-6xl font-extrabold ${isFeatured ? "text-white" : "text-slate-900"}`}>{plan.priceLabel}</div>
          <div className={`mt-2 ${isFeatured ? "text-indigo-100/80" : "text-slate-600"}`}>Billed monthly</div>
        </div>

        <ul className={`mt-6 mb-6 space-y-3 ${isFeatured ? "text-indigo-50/90" : "text-slate-700"}`}>
          {plan.features.map((f) => (
            <li key={f} className="text-lg flex items-start gap-3">
              <span className={`flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full ${isFeatured ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                ✓
              </span>
              <span className="leading-tight">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          <CTAButton
            size={isFeatured ? "xl" : "lg"}
            variant={isFeatured ? "solid" : "outline"}
            fullWidth
            onClick={onCTAClick}
            ariaLabel={`${plan.ctaText} ${plan.name}`}
          >
            {loading ? "Processing…" : plan.ctaText}
          </CTAButton>
        </div>
      </div>
    </motion.article>
  );
}
