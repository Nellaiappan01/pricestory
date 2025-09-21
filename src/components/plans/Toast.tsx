// src/components/plans/Toast.tsx
"use client";

import React, { useEffect } from "react";

type ToastProps = {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  onClose: (id: string) => void;
  duration?: number;
};

export default function Toast({ id, message, type = "info", onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(t);
  }, [id, duration, onClose]);

  const bg =
    type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-slate-700";

  return (
    <div
      className={`max-w-md w-full ${bg} text-white px-4 py-3 rounded-md shadow-lg`}
      role="status"
      aria-live="polite"
    >
      <div className="text-sm">{message}</div>
    </div>
  );
}
