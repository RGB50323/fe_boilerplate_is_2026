"use client";

import { CampanaNotificaciones } from "@/components/notificaciones/campana-notificaciones";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import type { EstadoConexion } from "@/lib/cocina/tablero";
import { AvisosCocina } from "./avisos-cocina";
import { ComandaCard } from "./comanda-card";
import { useTableroCocina } from "./use-tablero-cocina";

type Props = {
  socketUrl: string;
  token: string;
  sucursal: string | null;
};

const TEXTO_CONEXION: Record<EstadoConexion, string> = {
  conectando: "conectando…",
  "en-vivo": "en vivo",
  reconectando: "reconectando…",
};

function IconoBurger({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 38c0-12 12-20 28-20s28 8 28 20Z" />
      <path d="M10 48h60M14 56c6 4 10-4 16 0s10-4 16 0 10-4 16 0" />
      <path d="M12 64h56v2a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z" />
    </svg>
  );
}

function EstadoEnVivo({
  conexion,
  pendientes,
}: {
  conexion: EstadoConexion;
  pendientes: number | null;
}) {
  const enVivo = conexion === "en-vivo";
  return (
    <p role="status" className="flex items-center gap-3 text-lg text-zinc-300">
      {pendientes !== null && (
        <>
          <span>
            {pendientes} {pendientes === 1 ? "pedido pendiente" : "pedidos pendientes"}
          </span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span>{TEXTO_CONEXION[conexion]}</span>
      <span
        aria-hidden="true"
        className={`size-3 rounded-full ${
          enVivo ? "bg-green-500" : "animate-pulse bg-amber-500 motion-reduce:animate-none"
        }`}
      />
    </p>
  );
}

export function TableroCocina({ socketUrl, token, sucursal }: Props) {
  const {
    carga,
    conexion,
    pedidos,
    ahora,
    mensaje,
    avisos,
    reintentar,
    descartarAviso,
  } = useTableroCocina({ socketUrl, token });

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-zinc-700 pb-4">
        <p className="flex items-baseline gap-4">
          <span className="text-2xl text-[#FF7A1A] sm:text-3xl">Los Burle</span>
          <span className="text-xl text-zinc-400 sm:text-2xl">Panel de cocina</span>
        </p>
        <div className="ml-auto flex items-center gap-3">
          {sucursal && (
            <p className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">Sucursal</span>
              <span className="rounded-lg border border-zinc-700 bg-[#262626] px-4 py-2.5">
                {sucursal}
              </span>
            </p>
          )}
          <CampanaNotificaciones enLinea />
        </div>
      </header>

      <div className="my-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <IconoBurger className="size-12 shrink-0 sm:size-14" />
          <h1 className="text-4xl sm:text-5xl">Comandas de cocina</h1>
        </div>
        {carga !== "sin-acceso" && (
          <EstadoEnVivo
            conexion={conexion}
            pendientes={carga === "listo" ? pedidos.length : null}
          />
        )}
      </div>

      <section aria-busy={carga === "cargando"} aria-label="Pedidos pendientes">
        {carga === "cargando" && <PageLoading mensaje="Cargando pedidos..." />}

        {carga === "error" && (
          <EmptyState mensaje="No pudimos cargar los pedidos" variante="error">
            <Button onClick={reintentar} className="px-8 py-4 text-xl">
              Reintentar
            </Button>
          </EmptyState>
        )}

        {carga === "sin-acceso" && (
          <EmptyState
            mensaje={mensaje ?? "No tenés permiso para ver la cocina."}
            descripcion="Pedile a un gerente que revise tu rol y tu sucursal."
            variante="error"
          />
        )}

        {carga === "listo" && pedidos.length === 0 && (
          <EmptyState
            mensaje="No hay pedidos pendientes"
            descripcion="Los pedidos nuevos aparecerán aquí automáticamente"
            icono={<IconoBurger className="size-16" />}
            className="border-4 border-zinc-200 bg-black"
          />
        )}

        {carga === "listo" && pedidos.length > 0 && (
          <ol
            aria-label="Comandas en orden de llegada"
            className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-3"
          >
            {pedidos.map((pedido) => (
              <li key={pedido.id} className="h-full">
                <ComandaCard pedido={pedido} ahora={ahora} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <AvisosCocina
        avisos={avisos}
        reconectando={carga === "listo" && conexion === "reconectando"}
        onCerrar={descartarAviso}
      />
    </div>
  );
}
