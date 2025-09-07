"use client";

import { motion, Variants } from "framer-motion";

const sentence =
  "Monitor price history across Flipkart & Amazon, get instant alerts, and never miss a deal again — all in a premium mobile-friendly experience.";

export function AnimatedText() {
  // Wrapper for whole sentence (typed)
  const container: Variants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04, // controls speed between letters
      },
    },
  };

  // Animation for each letter (typed)
  const child: Variants = {
    hidden: { opacity: 0, y: 6, color: "#64748b" }, // fallback slate-600
    visible: {
      opacity: 1,
      y: 0,
      color: [
        "#6366f1", // indigo-500
        "#9333ea", // purple-600
        "#0ea5e9", // sky-500
        "#64748b", // back to slate-600
      ],
      transition: {
        duration: 0.8,
        // numeric cubic-bezier easing accepted by Framer Motion types
        ease: [0.2, 0.8, 0.2, 1],
        // per-property override for color (also typed)
        color: { duration: 1.2, ease: [0.2, 0.8, 0.2, 1] },
      },
    },
  };

  return (
    <motion.p
      className="mt-4 text-slate-600"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {sentence.split("").map((char, i) => (
        <motion.span key={i} variants={child} className="inline-block">
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.p>
  );
}
