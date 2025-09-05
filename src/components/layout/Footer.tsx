"use client";
import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
        
        {/* Brand / About */}
        <div>
          <h4 className="font-bold text-slate-900 text-lg">SMEU PriceTracker</h4>
          <p className="mt-2 text-slate-600">
            Premium price tracking for Flipkart & Amazon. Stay ahead with alerts, history, and insights.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h5 className="font-semibold text-slate-900">Quick Links</h5>
          <ul className="mt-3 space-y-2">
            <li><Link href="/" className="hover:underline text-slate-600">Home</Link></li>
            <li><Link href="/products" className="hover:underline text-slate-600">Products</Link></li>
            <li><Link href="/pricing" className="hover:underline text-slate-600">Plans & Pricing</Link></li>
            <li><Link href="/about" className="hover:underline text-slate-600">About Us</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h5 className="font-semibold text-slate-900">Legal</h5>
          <ul className="mt-3 space-y-2">
            <li><Link href="/terms" className="hover:underline text-slate-600">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:underline text-slate-600">Privacy Policy</Link></li>
            <li><Link href="/rights" className="hover:underline text-slate-600">Your Rights</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h5 className="font-semibold text-slate-900">Contact</h5>
          <ul className="mt-3 space-y-2 text-slate-600">
            <li>Email: support@smeu.com</li>
            <li>Location: Tamil Nadu, India</li>
            <li><Link href="/contact" className="hover:underline">Contact Form</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 mt-6 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SMEU — All Rights Reserved.
      </div>
    </footer>
  );
}
