import type { ReactNode } from "react";

const variantStyles = {
  success: "bg-green-900 text-green-100",
  danger: "bg-red-900 text-red-100",
  neutral: "bg-zinc-800 text-zinc-200",
};

type BadgeProps = {
  children: ReactNode;
  variant?: keyof typeof variantStyles;
  className?: string;
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
