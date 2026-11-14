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
    <main className="min-h-dvh bg-[#101012] px-4 py-8 text-zinc-100 [color-scheme:dark] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <nav
          aria-label="Reservaciones"
          className="mb-10 flex flex-wrap items-center justify-between gap-4 text-sm"
        >
          <Link
            href="/menu"
            className={`${fraunces.className} text-2xl text-[#FF7A1A]`}
          >
            Los Burle
          </Link>
          <div className="flex gap-5">
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
          <h1 className={`${fraunces.className} text-4xl sm:text-5xl`}>
            {titulo}
          </h1>
          <p className="mt-3 text-zinc-400">{descripcion}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
