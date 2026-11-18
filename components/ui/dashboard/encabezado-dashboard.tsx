"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { CampanaNotificaciones } from "@/components/notificaciones/campana-notificaciones";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";

type Vista = "general" | "comparativo";

const VISTAS: { vista: Vista; label: string; ruta: string }[] = [
  { vista: "general", label: "General", ruta: "/dashboard" },
  { vista: "comparativo", label: "Comparativo", ruta: "/dashboard/comparativo" },
];

function IconoBarras({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-10 w-12 shrink-0 sm:h-12 sm:w-14 ${className}`}
    >
      <path d="M4 4v32h40" />
      <rect x="11" y="20" width="6" height="12" rx="1" />
      <rect x="21" y="12" width="6" height="20" rx="1" />
      <rect x="31" y="22" width="6" height="10" rx="1" />
    </svg>
  );
}

// Encabezado común del dashboard: navegación, cerrar sesión, selector de
// vista (conserva el periodo elegido al cambiar) y título centrado.
export function EncabezadoDashboard({
  vista,
  titulo,
  consultaPeriodo,
}: {
  vista: Vista;
  titulo: string;
  consultaPeriodo: string;
}) {
  const router = useRouter();
  const [cerrandoSesion, cerrarSesion] = useTransition();

  function salir() {
    cerrarSesion(async () => {
      await logout();
      router.replace("/login");
    });
  }

  return (
    <>
      {cerrandoSesion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101012]/80 backdrop-blur-sm">
          <PageLoading mensaje="Cerrando sesión..." pantallaCompleta={false} />
        </div>
      )}

      <header className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-zinc-700">
        <p className="py-4 text-2xl text-[#FF7A1A] sm:text-3xl">Los Burle</p>
        <nav aria-label="Principal" className="flex self-stretch font-sans text-sm sm:text-base">
          <Link
            href="/menu"
            className="flex items-center border-b-2 border-transparent px-4 text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Menú
          </Link>
          <Link
            href="/dashboard"
            aria-current="page"
            className="flex items-center border-b-2 border-[#FF7A1A] px-4 font-semibold text-zinc-100"
          >
            Dashboard
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 py-3">
          <CampanaNotificaciones enLinea />
          <Button
            type="button"
            disabled={cerrandoSesion}
            onClick={salir}
            className="whitespace-nowrap px-4 py-2 text-sm"
          >
            {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </div>
      </header>

      <nav aria-label="Vista" className="mt-6 flex items-center gap-3 font-sans text-sm">
        <span aria-hidden="true" className="text-zinc-400">Vista</span>
        <div className="flex rounded-xl bg-[#2b2b2f] p-1">
          {VISTAS.map((v) =>
            v.vista === vista ? (
              <span
                key={v.vista}
                aria-current="page"
                className="rounded-lg bg-[#FF7A1A] px-4 py-1.5 font-semibold text-[#101012]"
              >
                {v.label}
              </span>
            ) : (
              <Link
                key={v.vista}
                href={`${v.ruta}?${consultaPeriodo}`}
                className="rounded-lg px-4 py-1.5 text-zinc-300 transition-colors hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-orange-400"
              >
                {v.label}
              </Link>
            ),
          )}
        </div>
      </nav>

      <div className="my-8 flex items-center justify-center gap-4 sm:gap-8">
        <IconoBarras className="hidden sm:block" />
        <h1 className="text-4xl sm:text-5xl lg:text-6xl">{titulo}</h1>
        <IconoBarras className="hidden sm:block" />
      </div>
    </>
  );
}
