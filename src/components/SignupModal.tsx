"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";

type Props = {
  emailInitial?: string;
  onClose?: () => void;
};

export default function SignupModal({ emailInitial = "", onClose }: Props) {
  const [email, setEmail] = useState(emailInitial);
  const [password, setPassword] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function genPassword(len = 12) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  async function handleAuto() {
    setMessage(null);
    setGenerated(null);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setMessage("Enter a valid email first.");
      return;
    }
    const pw = genPassword(14);
    setGenerated(pw);
    setPassword(pw);
  }

  async function handleCreate(manual = false) {
    setMessage(null);
    setLoading(true);
    try {
      // call signup API
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setMessage(j?.error || "Signup failed");
        setLoading(false);
        return;
      }

      // auto-sign in via credentials provider
      const signRes = await signIn("credentials", { redirect: false, email, password });
      if (signRes?.ok) {
        // signed in, redirect to home
        window.location.href = "/";
        return;
      } else {
        setMessage("Signup succeeded, but sign-in failed. Try logging in.");
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Create your free account</h3>
        <p className="text-sm text-slate-600 mt-1">Pick a password or let us generate a secure one for you.</p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" />

          <label className="block text-sm">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" />

          {generated && (
            <div className="p-3 bg-slate-50 rounded text-sm">
              <div>Generated password:</div>
              <div className="font-mono mt-1 flex items-center justify-between">
                <span>{generated}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generated);
                  }}
                  className="ml-4 px-2 py-1 rounded bg-indigo-600 text-white text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {message && <div className="text-sm text-red-600">{message}</div>}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleAuto}
            className="px-4 py-2 rounded border bg-white hover:bg-slate-50"
            disabled={loading}
          >
            Auto-generate password
          </button>

          <button onClick={() => handleCreate(false)} className="px-4 py-2 rounded bg-indigo-600 text-white" disabled={loading}>
            Create account
          </button>

          <button
            onClick={() => handleCreate(true)}
            className="px-4 py-2 rounded border ml-auto"
            disabled={loading}
            title="Create and sign in"
          >
            Create & Sign in
          </button>

          <button onClick={onClose} className="px-3 py-2 text-sm text-slate-600 ml-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

