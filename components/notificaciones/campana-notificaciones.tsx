"use client";

import { useEffect, useRef, useState } from "react";
import { formatoContador } from "@/lib/notificaciones";
import { PanelNotificaciones } from "./panel-notificaciones";
import { useNotificaciones } from "./notificaciones-provider";

export function CampanaNotificaciones() {
  const { noLeidas, estadoSesion } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function cerrarFuera(event: PointerEvent) {
      if (!contenedorRef.current?.contains(event.target as Node))
        setAbierto(false);
    }
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", cerrarFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  if (estadoSesion === "desconocida" || estadoSesion === "sin-sesion")
    return null;

  const detalleContador =
    noLeidas === 0
      ? "sin notificaciones sin leer"
      : `${noLeidas} ${noLeidas === 1 ? "notificación" : "notificaciones"} sin leer`;

  return (
    <div
      ref={contenedorRef}
      className="fixed right-3 top-3 z-50 sm:right-5 sm:top-4"
    >
      <button
        ref={botonRef}
        type="button"
        aria-label={`Notificaciones, ${detalleContador}`}
        aria-expanded={abierto}
        aria-controls="panel-notificaciones"
        onClick={() => setAbierto((valor) => !valor)}
        className="relative grid size-10 place-items-center rounded-full border border-zinc-700 bg-[#18181b] text-zinc-100 shadow-lg shadow-black/30 transition-colors hover:bg-[#2b2b2f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17H9m9-2v-4a6 6 0 0 0-12 0v4l-2 2h16l-2-2Z"
          />
          <path strokeLinecap="round" d="M10 20h4" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#FF7A1A] px-1 text-[0.65rem] font-bold leading-none text-[#101012]">
            {formatoContador(noLeidas)}
          </span>
        )}
      </button>
      {abierto && <PanelNotificaciones onNavegar={() => setAbierto(false)} />}
    </div>
  );
}
