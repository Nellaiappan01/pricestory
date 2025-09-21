// src/components/plans/CTAButton.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

type Variant = "solid" | "outline" | "ghost";
type Size = "md" | "lg" | "xl"; // simplified

export default function CTAButton({
  children,
  onClick,
  variant = "solid",
  size = "lg",
  fullWidth = true,
  disabled = false,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void | Promise<void>;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const sizeClasses =
    size === "xl"
      ? "text-lg px-8 py-4 rounded-2xl"
      : size === "lg"
      ? "text-base px-6 py-3 rounded-xl"
      : "text-base px-5 py-2.5 rounded-lg";

  const base =
    "inline-flex items-center justify-center font-semibold transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses =
    variant === "outline"
      ? "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
      : variant === "ghost"
      ? "bg-transparent text-gray-900 hover:bg-slate-50"
      : "bg-indigo-600 text-white hover:bg-indigo-700";

  const classes = `${base} ${sizeClasses} ${variantClasses} ${fullWidth ? "w-full" : ""} ${
    disabled ? "opacity-60 pointer-events-none" : ""
  }`;

  return (
    <motion.button
      whileTap={{ scale: 0.975 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </motion.button>
  );
}
