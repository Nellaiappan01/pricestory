// src/components/plans/pricingUtils.ts
export type Plan = {
  id: string;
  name: string;
  priceLabel: string;
  features: string[];
  ctaText: string;
  featured?: boolean;
  color?: string; // Tailwind gradient classes
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "₹0",
    features: ["Track 5 products", "5 alerts / month"],
    ctaText: "Start Free",
    color: "from-slate-200 to-slate-100",
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "₹99 / month",
    features: ["Track 100 products", "Unlimited alerts", "Priority queue"],
    ctaText: "Start Pro",
    featured: true,
    color: "from-indigo-500 to-indigo-400",
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "Custom",
    features: ["API access", "CSV exports"],
    ctaText: "Contact Sales",
    color: "from-amber-400 to-amber-300",
  },
];
