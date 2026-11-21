import type { ComponentPropsWithoutRef } from "react";

type SearchBarProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  label?: string;
};

export function SearchBar({
  label = "Buscar",
  id = "buscar",
  className = "",
  ...props
}: SearchBarProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <input
        {...props}
        id={id}
        type="search"
        className="w-full rounded-full bg-[#101012] py-3 pl-6 pr-12 text-base text-zinc-100 outline-none placeholder:text-zinc-400 focus:ring-1 focus:ring-[#FF7A1A]"
      />

      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    </div>
  );
}
