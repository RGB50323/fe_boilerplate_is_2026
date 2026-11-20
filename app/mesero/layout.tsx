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
            <Link
              href="/menu"
              className="text-2xl text-[#FF7A1A] hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 sm:text-3xl"
            >
              Los Burle
            </Link>
            <p className="text-lg text-zinc-400 sm:text-2xl">Panel de mesero</p>
          </div>
          <nav aria-label="Panel de mesero" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/mesero/pedidos"
              className="py-2 text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Registrar pedido
            </Link>
            <Link
              href="/mesero/canjes"
              className="py-2 text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Canje de puntos
            </Link>
            <Link
              href="/mesero/entregas"
              className="py-2 text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Por entregar
            </Link>
            <Link
              href="/menu"
              className="py-2 text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Ver menú
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
