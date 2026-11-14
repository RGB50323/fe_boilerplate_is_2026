import Link from "next/link";
import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});
export function MarcoReservas({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <main
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-16 pt-6 text-zinc-100 [color-scheme:dark] sm:px-8`}
    >
      <div className="mx-auto max-w-4xl">
        <nav
          aria-label="Reservaciones"
          className="mb-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-zinc-700 pb-4 text-sm sm:text-base"
        >
          <Link href="/menu" className="text-2xl text-[#FF7A1A] sm:text-3xl">
            Los Burle
          </Link>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href="/reservas"
              className="text-zinc-300 hover:text-orange-300"
            >
              Buscar mesas
            </Link>
            <Link
              href="/perfil/reservaciones"
              className="text-zinc-300 hover:text-orange-300"
            >
              Mis reservaciones
            </Link>
          </div>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl leading-tight sm:text-4xl lg:text-5xl">
            {titulo}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {descripcion}
          </p>
        </header>
        {children}
      </div>
    </main>
  );
}
