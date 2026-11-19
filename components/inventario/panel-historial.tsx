"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listarMovimientos, type HistorialResultado } from "@/app/actions/inventario";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Paginacion } from "@/components/ui/paginacion";
import { Skeleton } from "@/components/ui/skeleton";
import { formatoCantidad, formatoFecha, type Insumo, type Movimiento } from "@/lib/inventario";
import type { Pagina } from "@/lib/paginacion";

type Props = {
  insumo: Insumo | null;
  onCerrar: () => void;
  onSinSesion: () => void;
};

const ERROR = "No pudimos cargar el historial";

export function PanelHistorial({ insumo, onCerrar, onSinSesion }: Props) {
  return (
    <Drawer
      abierto={insumo !== null}
      onCerrar={onCerrar}
      titulo="Historial"
      descripcion={insumo ? `${insumo.nombre} · del más reciente al más antiguo` : undefined}
    >
      {insumo && <Contenido key={insumo.id} insumo={insumo} onSinSesion={onSinSesion} />}
    </Drawer>
  );
}

function Contenido({ insumo, onSinSesion }: { insumo: Insumo; onSinSesion: () => void }) {
  const [historial, setHistorial] = useState<Pagina<Movimiento> | null>(null);
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(true);
  const ultima = useRef(0);

  const cargar = useCallback(
    (pagina: number) => {
      const consulta = ++ultima.current;
      return listarMovimientos(insumo.id, pagina)
        .catch((causa: unknown): HistorialResultado => {
          console.error("Error al cargar el historial del insumo:", causa);
          return { error: ERROR };
        })
        .then((resultado) => {
          if (consulta !== ultima.current) return;
          setCargando(false);
          if ("historial" in resultado) {
            setHistorial(resultado.historial);
            setError(undefined);
          } else if ("sinSesion" in resultado) {
            onSinSesion();
          } else {
            setError(resultado.error);
          }
        });
    },
    [insumo.id, onSinSesion],
  );

  useEffect(() => {
    void cargar(1);
  }, [cargar]);

  function irA(pagina: number) {
    setCargando(true);
    setError(undefined);
    void cargar(pagina);
  }

  if (error) {
    return (
      <EmptyState mensaje={error} variante="error">
        <Button onClick={() => irA(historial?.pagina ?? 1)} className="min-h-11 px-6">
          Reintentar
        </Button>
      </EmptyState>
    );
  }

  if (!historial) {
    return (
      <div role="status" aria-label="Cargando historial" className="grid gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (historial.datos.length === 0) {
    return <EmptyState mensaje="Sin movimientos" descripcion="Este insumo aún no tiene entradas ni salidas." />;
  }

  return (
    <div aria-busy={cargando} className={cargando ? "opacity-50 transition-opacity" : "transition-opacity"}>
      <ol aria-label={`Movimientos de ${insumo.nombre}`} className="grid gap-3">
        {historial.datos.map((movimiento) => {
          const entrada = movimiento.tipo === "ENTRADA";
          return (
            <li key={movimiento.id} className="rounded-xl bg-[#2b2b2f] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time
                  dateTime={`${movimiento.fecha}T${movimiento.hora}`}
                  className="tabular-nums text-zinc-300"
                >
                  {formatoFecha(movimiento.fecha)} · {movimiento.hora}
                </time>
                <span
                  className={`rounded-full px-3 py-0.5 text-sm ${entrada ? "bg-green-900 text-green-100" : "bg-red-900 text-red-100"}`}
                >
                  {entrada ? "Entrada" : "Salida"}
                </span>
              </div>
              <p className="mt-2 text-xl tabular-nums">
                {entrada ? "+" : "−"}
                {formatoCantidad(movimiento.cantidad, insumo.unidad)} {insumo.unidad}
              </p>
              <p className="mt-1 wrap-break-word text-zinc-200">{movimiento.motivo}</p>
              <p className="mt-1 text-sm text-zinc-400">
                {movimiento.usuario ? `Por ${movimiento.usuario}` : "Usuario no disponible"}
              </p>
            </li>
          );
        })}
      </ol>
      <Paginacion
        pagina={historial.pagina}
        totalPaginas={historial.totalPaginas}
        onCambiar={irA}
        deshabilitado={cargando}
        etiqueta="Paginación del historial"
        className="mt-6"
      />
    </div>
  );
}
