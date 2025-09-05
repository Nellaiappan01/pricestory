"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/ButtonShim";

export default function Header() {
  return (
    <nav className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold">
          PT
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold">PriceTracker</h1>
          <p className="text-xs text-slate-500">Smart price alerts & history</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm hidden sm:inline">
          Login
        </Link>
        <Button className="hidden sm:inline-flex">
          Get started <ArrowRight size={14} />
        </Button>
        <button aria-label="menu" className="sm:hidden p-2 rounded-md bg-white/60 shadow">
          ☰
        </button>
      </div>
    </nav>
  );
}
