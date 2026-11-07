import type { ComponentPropsWithoutRef } from "react";

type SelectProps = ComponentPropsWithoutRef<"select">;

export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-lg border border-zinc-700 bg-[#262626] px-4 py-3 pr-10 text-base text-zinc-100 outline-none focus:border-[#FF7A1A] focus:ring-1 focus:ring-[#FF7A1A] disabled:opacity-50 ${className}`}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-300"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
