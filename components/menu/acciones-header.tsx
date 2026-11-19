"use client";

import { useEffect, useRef, useState } from "react";
import { EnlaceConSucursal as Link } from "@/components/ui/enlace-con-sucursal";
import { Button } from "@/components/ui/button";

export type EnlaceHeader = { href: string; texto: string; destacado?: boolean };

export function enlacesDelHeader({
  autenticado,
  esGerente,
  esMesero,
}: {
  autenticado: boolean;
  esGerente: boolean;
  esMesero: boolean;
}): EnlaceHeader[] {
  const esCliente = !esGerente && !esMesero;
  const enlaces: EnlaceHeader[] = [];
  if (esCliente) enlaces.push({ href: "/reservas", texto: "Reservar mesa" });
  if (autenticado && esCliente) {
    enlaces.push({ href: "/pedidos", texto: "Mis pedidos" });
  }
  if (autenticado) {
    enlaces.push({ href: "/perfil/reservaciones", texto: "Mi perfil" });
  }
  if (esGerente) {
    enlaces.push({ href: "/admin/ocupacion", texto: "Ocupación" });
    enlaces.push({ href: "/admin/calificaciones", texto: "Calificaciones" });
    enlaces.push({
      href: "/admin/platillos",
      texto: "Gestionar platillos",
      destacado: true,
    });
  }
  if (esMesero) {
    enlaces.push({ href: "/mesero/entregas", texto: "Por entregar" });
    enlaces.push({
      href: "/mesero/pedidos",
      texto: "Registrar pedido",
      destacado: true,
    });
  }
  return enlaces;
}

const ENLACE =
  "whitespace-nowrap text-sm text-zinc-300 transition-colors hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400";
const PILDORA =
  "whitespace-nowrap rounded-full bg-[#FF7A1A] px-5 py-2.5 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400";

export function AccionesHeader({
  autenticado,
  esGerente,
  esMesero,
  cerrandoSesion,
  onCerrarSesion,
  onIniciarSesion,
}: {
  autenticado: boolean;
  esGerente: boolean;
  esMesero: boolean;
  cerrandoSesion: boolean;
  onCerrarSesion: () => void;
  onIniciarSesion: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const enlaces = enlacesDelHeader({ autenticado, esGerente, esMesero });

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", alPulsar);
    document.addEventListener("keydown", alTecla);
    return () => {
      document.removeEventListener("mousedown", alPulsar);
      document.removeEventListener("keydown", alTecla);
    };
  }, [abierto]);

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="hidden items-center gap-5 md:flex"
      >
        {enlaces.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className={e.destacado ? PILDORA : ENLACE}
          >
            {e.texto}
          </Link>
        ))}
      </nav>

      {autenticado ? (
        <Button
          type="button"
          disabled={cerrandoSesion}
          onClick={onCerrarSesion}
          className="whitespace-nowrap px-4 py-2 text-sm sm:px-5 sm:py-3"
        >
          {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onIniciarSesion}
          className="whitespace-nowrap px-4 py-2 text-sm sm:px-5 sm:py-3"
        >
          Iniciar sesión
        </Button>
      )}

      {enlaces.length > 0 && (
        <div ref={contenedor} className="relative md:hidden">
          <button
            type="button"
            aria-label="Menú"
            aria-expanded={abierto}
            aria-controls="menu-movil"
            onClick={() => setAbierto((a) => !a)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-700 text-zinc-200 transition-colors hover:border-orange-300 hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-5"
            >
              {abierto ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
          {abierto && (
            <ul
              id="menu-movil"
              className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-zinc-700 bg-[#1c1c1f] p-2 shadow-xl"
            >
              {enlaces.map((e) => (
                <li key={e.href}>
                  <Link
                    href={e.href}
                    onClick={() => setAbierto(false)}
                    className={
                      e.destacado
                        ? "block rounded-xl bg-[#FF7A1A] px-3 py-2.5 text-sm font-semibold text-[#101012]"
                        : "block rounded-xl px-3 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-orange-300"
                    }
                  >
                    {e.texto}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
