import Link from "next/link";
import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

export default function MeseroLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-16 pt-6 text-zinc-100 scheme-dark sm:px-8 lg:px-15`}
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-zinc-700 pb-4">
          <div className="flex items-baseline gap-4">
            <p className="text-2xl text-[#FF7A1A] sm:text-3xl">Los Burle</p>
            <p className="text-lg text-zinc-400 sm:text-2xl">Panel de mesero</p>
          </div>
          <Link
            href="/menu"
            className="text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
          >
            Ver menú
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
