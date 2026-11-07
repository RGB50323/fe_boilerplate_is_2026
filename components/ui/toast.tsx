"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  children?: string;
  variant?: "error" | "success";
};

const variants = {
  error: { icon: "×", className: "border-red-900 bg-red-950 text-red-200" },
  success: { icon: "✓", className: "border-green-900 bg-green-950 text-green-200" },
};

export function Toast({ children, variant = "error" }: ToastProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] sm:max-w-sm"
    >
      {children && (
        <ToastMessage key={`${variant}-${children}`} variant={variant}>
          {children}
        </ToastMessage>
      )}
    </div>
  );
}

function ToastMessage({ children, variant }: Required<ToastProps>) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const { icon, className } = variants[variant];

  return (
    <p className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${className}`}>
      <span aria-hidden="true" className="text-xl leading-none">
        {icon}
      </span>
      {children}
    </p>
  );
}