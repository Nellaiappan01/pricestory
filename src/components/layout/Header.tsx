"use client";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="w-full bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 text-white grid place-items-center font-bold">PT</div>
          <div>
            <div className="font-bold">PriceTracker</div>
            <div className="text-xs text-slate-500">Smart price alerts & history</div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {!session ? (
            <>
              <button onClick={() => signIn("google", { callbackUrl: "/" })} className="text-sm text-slate-700">
                Login
              </button>
              <button onClick={() => signIn("google", { callbackUrl: "/" })} className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm">
                Get started
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-slate-700">Hi, {session.user?.name || session.user?.email}</span>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="px-4 py-2 rounded-full border">
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
