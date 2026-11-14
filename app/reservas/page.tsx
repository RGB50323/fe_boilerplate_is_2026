import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { connection } from "next/server";
import Link from "next/link";
import { fechaLocal, fechaValida, horasDisponibles } from "@/lib/reservaciones";
import { listarSucursales } from "@/app/actions/reservaciones";
import { DisponibilidadView } from "./disponibilidad-view";
import { MesaIcon } from "./mesa-icon";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
  variable: "--font-reservas",
});

export const metadata: Metadata = {
  title: "Reservar una mesa | Los Burle",
  description:
    "Consultá las mesas disponibles en nuestras sucursales según la fecha, hora y cantidad de personas.",
};

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { sucursales, error } = await listarSucursales();
  const ahora = new Date();
  const fecha = fechaLocal(ahora);
  const params = await searchParams;
  const sucursal =
    sucursales.find((s) => String(s.id) === params.sucursalId) ?? sucursales[0];
  const fechaFiltro =
    typeof params.fecha === "string" && fechaValida(params.fecha)
      ? params.fecha
      : fecha;
  const horas = horasDisponibles(fechaFiltro, sucursal?.horarios ?? [], ahora);
  const filtrosIniciales = {
    sucursalId: String(sucursal?.id ?? ""),
    fecha: fechaFiltro,
    hora:
      typeof params.hora === "string" && horas.includes(params.hora)
        ? params.hora
        : (horas[0] ?? ""),
    personas:
      typeof params.personas === "string" &&
      /^\d+$/.test(params.personas) &&
      Number(params.personas) > 0
        ? params.personas
        : "4",
  };
  return (
    <main
      className={`${fraunces.variable} min-h-dvh bg-[#101012] px-4 pb-16 pt-12 text-zinc-100 [color-scheme:dark] sm:px-8 sm:pt-16 lg:px-12`}
    >
      <div className="mx-auto max-w-6xl">
        <div
          className={`${fraunces.className} mb-7 flex justify-between text-sm text-orange-300`}
        >
          <Link href="/menu">Volver al menú</Link>
          <Link href="/perfil/reservaciones">Mis reservaciones</Link>
        </div>
        <header className="mb-10 text-center sm:mb-12">
          <p className="mb-5 text-xs font-semibold tracking-[0.24em] text-[#FF7A1A]">
            LOS BURLE · RESERVAS
          </p>
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            <MesaIcon className="hidden size-20 shrink-0 text-zinc-300 md:block" />
            <h1 className="text-4xl leading-tight [font-family:var(--font-reservas)] sm:text-5xl lg:text-6xl">
              Reservar una mesa
            </h1>
            <MesaIcon className="hidden size-20 shrink-0 text-zinc-300 md:block" />
          </div>
          <p className="mt-4 text-base text-zinc-300 sm:text-xl">
            Consultá la disponibilidad de mesas en tu sucursal.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Tu mesa, tu momento. Elegí cuándo nos visitás.
          </p>
        </header>
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7 text-center"
          >
            <p className="text-red-200">{error}</p>
            <a
              href="/reservas"
              className="mt-5 inline-block rounded-full bg-[#FF7A1A] px-5 py-3 font-semibold text-[#101012] hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
            >
              Intentar de nuevo
            </a>
          </div>
        ) : sucursales.length === 0 ? (
          <p
            role="status"
            className="rounded-2xl border border-zinc-800 bg-[#18181b] p-8 text-center text-zinc-300"
          >
            No hay sucursales disponibles para consultar en este momento.
          </p>
        ) : (
          <DisponibilidadView
            key={JSON.stringify([sucursales, filtrosIniciales])}
            sucursales={sucursales}
            fechaInicial={fecha}
            horasIniciales={horas}
            filtrosIniciales={filtrosIniciales}
          />
        )}
      </div>
    </main>
  );
}
