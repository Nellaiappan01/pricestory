// src/components/landing/Hero.tsx
"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, useSession } from "next-auth/react";

/* helpers */
function isValidEmail(v: string) {
  return /^\S+@\S+\.\S+$/.test(v.trim());
}
function genPassword(len = 14) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function Hero() {
  // ---------- Hooks: always at the top ----------
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [emailAccepted, setEmailAccepted] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const pwRef = useRef<HTMLInputElement | null>(null);

  // ---------- Early render guards (safe; hooks already declared) ----------
  // while NextAuth determines session, show nothing (stable)
  if (status === "loading") {
    return null;
  }
  // if authenticated, hide hero
  if (status === "authenticated") {
    return null;
  }

  // ---------- Event handlers (use hooks state but don't call hooks) ----------
  async function acceptEmail() {
    setMsg(null);
    if (!isValidEmail(email)) {
      setMsg("Please enter a valid email address.");
      return;
    }
    setEmailAccepted(true);
    setTimeout(() => pwRef.current?.focus(), 150);
  }

  function handleGenerate() {
    const pw = genPassword(12);
    setPassword(pw);
    setShowPw(true);
    pwRef.current?.focus();
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setMsg(null);

    if (!emailAccepted) {
      await acceptEmail();
      return;
    }

    if (!password) {
      setMsg("Please enter or generate a password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 409) {
        // existing user -> try sign-in
        const signRes = await signIn("credentials", {
          redirect: false,
          email: email.trim().toLowerCase(),
          password,
        });
        if (signRes?.ok) {
          window.location.href = "/";
        } else {
          setMsg("Account exists. Enter correct password or try Google sign-in.");
        }
        return;
      }

      if (!res.ok) {
        setMsg(json?.error || "Signup failed. Try again.");
        return;
      }

      // signup succeeded -> sign in
      const signRes = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });
      if (signRes?.ok) {
        window.location.href = "/";
      } else {
        setMsg("Account created but login failed. Try manual login.");
      }
    } catch (err: any) {
      console.error("Signup/Login error:", err);
      setMsg("Unexpected error: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  // ---------- Render UI ----------
  return (
    <section className="relative bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-16 sm:py-20">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-3xl sm:text-5xl font-extrabold leading-tight"
        >
          Track Prices. Save Money.
        </motion.h1>

        <p className="mt-4 text-indigo-100 max-w-2xl mx-auto">
          Get instant alerts on price drops — across Amazon & Flipkart.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 w-full flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-3xl flex flex-col sm:flex-row gap-3 items-stretch"
          >
            <AnimatePresence initial={false}>
              {!emailAccepted && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, width: "100%" }}
                  animate={{ opacity: 1, width: "100%" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.28 }}
                  className="flex-1"
                >
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        acceptEmail();
                      }
                    }}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 rounded-lg text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-300"
                    autoComplete="email"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {emailAccepted && (
                <motion.div
                  key="pw"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "100%" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.28 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1 flex items-center bg-white rounded-lg overflow-hidden">
                    <input
                      ref={pwRef}
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter or generate password"
                      className="flex-1 px-4 py-3 text-slate-900 border-none focus:outline-none"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="px-3 py-2 hover:bg-slate-100 text-slate-700 text-sm"
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="px-3 py-2 bg-slate-100 text-slate-800 text-sm hover:bg-slate-200"
                    >
                      Auto
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-lg bg-white text-indigo-700 font-semibold shadow hover:shadow-lg w-full sm:w-auto"
              >
                {loading ? "Working..." : emailAccepted ? "Continue" : "Next"}
              </button>
            </motion.div>
          </motion.div>
        </form>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="text-sm text-indigo-100">Or continue with</div>
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="inline-flex items-center gap-3 px-4 py-2 bg-white/90 text-slate-900 rounded-lg shadow hover:opacity-95 transition"
          >
            Sign in with Google
          </button>
        </div>

        {msg && <div className="mt-4 text-sm text-yellow-100 text-center">{msg}</div>}
      </div>
    </section>
  );
}
