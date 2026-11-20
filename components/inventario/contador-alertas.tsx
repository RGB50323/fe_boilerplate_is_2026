"use client";

import { EnlaceConSucursal as Link } from "@/components/ui/enlace-con-sucursal";
import { contarActivas, formatoContadorAlertas } from "@/lib/alertas-inventario";
import { useAlertasInventario } from "./alertas-store";

export function IconoAlertaInsumo({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z" />
      <path d="M12 9v4M12 16.2v.1" />
    </svg>
  );
}

export function ContadorAlertas() {
  const { carga, alertas } = useAlertasInventario();
  if (carga === "sin-sesion") return null;

  const activas = contarActivas(alertas);
  const detalle =
    activas === 0
      ? "sin alertas activas"
      : `${activas} ${activas === 1 ? "alerta activa" : "alertas activas"}`;

  return (
    <Link
      href="/admin/inventario/alertas"
      aria-label={`Alertas de inventario, ${detalle}`}
      title="Alertas de inventario"
      className="relative grid size-11 shrink-0 place-items-center rounded-full border border-zinc-700 bg-[#18181b] text-zinc-100 transition-colors hover:bg-[#2b2b2f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
    >
      <IconoAlertaInsumo />
      {activas > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#FF7A1A] px-1 text-xs font-bold tabular-nums leading-5 text-[#101012]"
        >
          {formatoContadorAlertas(activas)}
        </span>
      )}
    </Link>
  );
}
