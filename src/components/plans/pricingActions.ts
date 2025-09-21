// src/components/plans/pricingActions.ts
"use client";

/**
 * Pricing action helpers.
 * - Returns { ok, message } to allow the UI to show friendly toasts.
 * - You can replace the /api/signup/free endpoint with your DB logic.
 */

export type ActionResult = { ok: boolean; message?: string; redirect?: string };

export async function doFreeSignup(): Promise<ActionResult> {
  try {
    const res = await fetch("/api/signup/free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "free" }),
    });

    if (!res.ok) {
      // try to extract JSON error
      let text = `Status ${res.status}`;
      try {
        const json = await res.json();
        text = json?.error || json?.message || text;
      } catch {}
      return { ok: false, message: `Signup failed: ${text}` };
    }

    const json = await res.json();
    // local dev stub returns { ok: true, userId }
    return { ok: true, message: "Welcome — account created.", redirect: "/dashboard" };
  } catch (err) {
    return { ok: false, message: "Network error. Try again." };
  }
}

export async function handlePricingAction(planId: string): Promise<ActionResult> {
  switch (planId) {
    case "free": {
      return await doFreeSignup();
    }
    case "pro":
      return { ok: true, redirect: "/checkout?plan=pro" };
    case "business":
      return { ok: true, redirect: "/contact" };
    default:
      return { ok: false, message: "Unknown plan selected" };
  }
}
