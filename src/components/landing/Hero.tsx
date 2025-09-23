// src/components/landing/Hero.tsx
"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { signIn, useSession } from "next-auth/react";

/* helpers */
function isValidEmail(v: string) {
  return /^\S+@\S+\.\S+$/.test(v.trim());
}
function genPassword(len = 14) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function Hero() {
  const { data: session, status } = useSession();

  const [rawEmailInput, setRawEmailInput] = useState("");
  const [email, setEmail] = useState("");
  const [emailAccepted, setEmailAccepted] = useState(false);
  const [autoAppended, setAutoAppended] = useState<null | string>(null);

  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const pwRef = useRef<HTMLInputElement | null>(null);

  if (status === "loading") return null;
  if (status === "authenticated") return null;

  async function acceptEmail() {
    setMsg(null);
    const raw = String(rawEmailInput ?? "").trim();

    if (!raw) {
      setMsg("Please enter an email or username.");
      emailRef.current?.focus();
      return;
    }

    if (raw.includes("@")) {
      const candidate = raw.toLowerCase();
      if (!isValidEmail(candidate)) {
        setMsg("Please enter a valid email address.");
        emailRef.current?.focus();
        return;
      }
      setEmail(candidate);
      setAutoAppended(null);
      setEmailAccepted(true);
      setTimeout(() => pwRef.current?.focus(), 160);
      return;
    }

    const candidate = `${raw}@gmail.com`.toLowerCase();
    setEmail(candidate);
    setAutoAppended("@gmail.com");
    setEmailAccepted(true);
    setTimeout(() => pwRef.current?.focus(), 160);
  }

  function editEmail() {
    setEmailAccepted(false);
    setShowPw(false);
    setPassword("");
    setMsg(null);
    if (autoAppended && email) {
      const atIdx = email.indexOf("@");
      setRawEmailInput(atIdx > 0 ? email.slice(0, atIdx) : email);
    } else {
      setRawEmailInput(email || "");
    }
    setAutoAppended(null);
    setTimeout(() => emailRef.current?.focus(), 60);
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
      pwRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 409) {
        const signRes = await signIn("credentials", {
          redirect: false,
          email: email.trim().toLowerCase(),
          password,
        });
        if (signRes?.ok) window.location.href = "/";
        else
          setMsg(
            "Account exists. Enter correct password or try Google sign-in."
          );
        return;
      }

      if (!res.ok) {
        setMsg(json?.error || "Signup failed. Try again.");
        return;
      }

      const signRes = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });
      if (signRes?.ok) window.location.href = "/";
      else setMsg("Account created but login failed. Try manual login.");
    } catch (err: any) {
      console.error("Signup/Login error:", err);
      setMsg("Unexpected error: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  function onRawEmailChange(v: string) {
    setRawEmailInput(v);
    setMsg(null);
  }

  // Motion helpers
  const innerVariants = {
    enter: { opacity: 0, x: 10 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 },
  };

  const innerTransition: Transition = {
    duration: 0.22,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  };

  return (
    <section className="relative bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-16 sm:py-20">
      <div className="max-w-5xl mx-auto px-4 text-center">
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
          className="mt-10 w-full flex flex-col items-center gap-4"
        >
          <div className="w-full max-w-3xl flex flex-col sm:flex-row items-stretch gap-3">
            <div className="flex-1">
              <div className="relative">
                <div className="bg-white rounded-lg overflow-hidden">
                  <div className="px-0 py-0">
                    <AnimatePresence mode="wait" initial={false}>
                      {!emailAccepted ? (
                        <motion.div
                          key="email"
                          initial="enter"
                          animate="center"
                          exit="exit"
                          variants={innerVariants}
                          transition={innerTransition}
                          className="w-full"
                        >
                          <input
                            ref={emailRef}
                            type="text"
                            value={rawEmailInput}
                            onChange={(e) => onRawEmailChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                acceptEmail();
                              }
                            }}
                            placeholder="Enter email or username"
                            className="w-full px-4 py-3 text-slate-900 focus:outline-none"
                            autoComplete="email"
                          />
                          <div className="px-4 pb-2 text-xs text-indigo-100/80">
                            Tip: type only username and we can default to{" "}
                            <span className="font-medium">@gmail.com</span>.
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="password"
                          initial="enter"
                          animate="center"
                          exit="exit"
                          variants={innerVariants}
                          transition={innerTransition}
                          className="w-full"
                        >
                          <div className="flex items-center">
                            <input
                              ref={pwRef}
                              type={showPw ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder={`Password for ${email}`}
                              className="flex-1 px-4 py-3 text-slate-900 focus:outline-none"
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
                            <button
                              type="button"
                              onClick={editEmail}
                              className="ml-2 mr-1 px-3 py-2 border rounded-md bg-white/90 text-indigo-700 text-sm"
                            >
                              Edit
                            </button>
                          </div>
                          {autoAppended && (
                            <div className="px-4 pt-2 pb-2 text-xs text-indigo-100/80">
                              Using <span className="font-medium">{email}</span>
                              . Click Edit to change.
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 w-full sm:w-auto">
              <motion.button
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full px-5 py-3 rounded-lg bg-white text-indigo-700 font-semibold shadow hover:shadow-lg"
              >
                {loading
                  ? "Working..."
                  : emailAccepted
                  ? "Continue"
                  : "Next"}
              </motion.button>
            </div>
          </div>
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

        {msg && (
          <div className="mt-4 text-sm text-yellow-100 text-center">{msg}</div>
        )}
      </div>
    </section>
  );
}
