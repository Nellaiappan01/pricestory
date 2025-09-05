"use client";
import React from "react";

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  const { className = "", children, ...rest } = props;
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-xl font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition ${className}`}
    >
      {children}
    </button>
  );
}
