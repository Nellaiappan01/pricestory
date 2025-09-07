"use client";

import { motion } from "framer-motion";

const sentence = "Monitor price history across Flipkart & Amazon, get instant alerts, and never miss a deal again — all in a premium mobile-friendly experience.";

export function AnimatedText() {
  // Wrapper for whole sentence
  const container = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04, // controls speed between letters
      },
    },
  };

  // Animation for each letter
  const child = {
    hidden: { opacity: 0, y: `0.25em`, color: "#64748b" }, // slate-600
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
        ease: "easeInOut",
        color: { duration: 1.2, ease: "easeInOut" },
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
