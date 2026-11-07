import type { ComponentPropsWithoutRef } from "react";

type InputProps = ComponentPropsWithoutRef<"input">;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-zinc-700 bg-[#262626] px-4 py-3 text-base text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-[#FF7A1A] focus:ring-1 focus:ring-[#FF7A1A] ${className}`}
    />
  );
}
