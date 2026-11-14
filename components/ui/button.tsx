import type { ComponentPropsWithoutRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<"button">;

export function Button({
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`rounded-full bg-[#FF7A1A] px-5 py-3 font-semibold cursor-pointer text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
