import Link from "next/link";
import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

export function MarcoPedidos({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <main
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-16 pt-6 text-zinc-100 scheme-dark sm:px-8`}
    >
      <div className="mx-auto max-w-3xl">
        <nav
          aria-label="Pedidos"
          className="mb-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-zinc-700 pb-4"
        >
          <Link href="/menu" className="text-2xl text-[#FF7A1A] sm:text-3xl">
            Los Burle
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-zinc-300">
            <Link href="/menu" className="hover:text-orange-300">
              Menú
            </Link>
            <Link href="/pedidos" className="hover:text-orange-300">
              Mis pedidos
            </Link>
          </div>
        </nav>
        <h1 className="mb-8 text-3xl leading-tight sm:text-4xl">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}
