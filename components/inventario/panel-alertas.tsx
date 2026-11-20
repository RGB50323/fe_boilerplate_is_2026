"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { marcarAlertaVista, type MarcarVistaResultado } from "@/app/actions/alertas-inventario";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EnlaceConSucursal as Link } from "@/components/ui/enlace-con-sucursal";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import {
  contarActivas,
  formatoFechaAlerta,
  textoActivas,
  type AlertaInsumo,
} from "@/lib/alertas-inventario";
import { formatoCantidad } from "@/lib/inventario";
import {
  marcarVistaLocal,
  quitarAlertaLocal,
  reintentarAlertas,
  useAlertasInventario,
} from "./alertas-store";
import { IconoAlertaInsumo } from "./contador-alertas";

type Aviso = { id: number; texto: string; variante: "success" | "error" };

const ERROR_VISTA = "No pudimos marcar la alerta como vista. Intenta de nuevo.";
const celda = "bg-[#2b2b2f] px-3 py-3 sm:px-4";
const encabezado = "border-b border-zinc-700 px-3 pb-2 text-lg font-semibold sm:px-4";
const BOTON =
  "inline-flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-[#101012] px-4 text-sm font-semibold transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-wait disabled:opacity-60";

function cantidadCon(valor: number, alerta: AlertaInsumo) {
  return alerta.unidad
    ? `${formatoCantidad(valor, alerta.unidad)} ${alerta.unidad}`
    : formatoCantidad(valor, "kg");
}

function EstadoAlertaBadge({ alerta }: { alerta: AlertaInsumo }) {
  return alerta.estado === "ACTIVA" ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-500/60 bg-amber-950 px-3 py-1 text-sm font-semibold text-amber-200">
      <IconoAlertaInsumo className="size-4" />
      Activa
    </span>
  ) : (
    <span className="inline-flex whitespace-nowrap rounded-full bg-zinc-800 px-3 py-1 text-sm font-normal text-zinc-300">
      Vista
    </span>
  );
}

export function EncabezadoAlertas({ subtitulo }: { subtitulo?: string }) {
  return (
    <div className="my-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <h1 className="text-4xl sm:text-5xl">Alertas de inventario</h1>
      {subtitulo && <p className="text-base text-zinc-400 sm:text-lg">{subtitulo}</p>}
    </div>
  );
}

export function EsqueletoAlertas() {
  return (
    <div role="status" aria-label="Cargando alertas" className="grid gap-2">
      <Skeleton className="mb-2 h-8 w-full rounded-lg opacity-50" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-17 rounded-xl" />
      ))}
    </div>
  );
}

async function pedirVista(id: number): Promise<MarcarVistaResultado> {
  try {
    return await marcarAlertaVista(id);
  } catch (causa) {
    console.error("Error al marcar la alerta como vista:", causa);
    return { error: ERROR_VISTA };
  }
}

export function PanelAlertas() {
  const router = useRouter();
  const { carga, alertas } = useAlertasInventario();
  const [marcando, setMarcando] = useState<Set<number>>(() => new Set());
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const siguienteAviso = useRef(0);

  useEffect(() => {
    if (carga === "sin-sesion") router.replace("/login");
  }, [carga, router]);

  function avisar(texto: string, variante: Aviso["variante"]) {
    setAviso({ id: ++siguienteAviso.current, texto, variante });
  }

  function cambiarMarcando(id: number, activo: boolean) {
    setMarcando((actual) => {
      const siguiente = new Set(actual);
      if (activo) siguiente.add(id);
      else siguiente.delete(id);
      return siguiente;
    });
  }

  async function marcarVista(alerta: AlertaInsumo) {
    if (marcando.has(alerta.id)) return;
    cambiarMarcando(alerta.id, true);
    const resultado = await pedirVista(alerta.id);
    cambiarMarcando(alerta.id, false);
    if ("vista" in resultado) {
      marcarVistaLocal(alerta.id);
      avisar("Alerta marcada como vista", "success");
    } else if ("resuelta" in resultado) {
      quitarAlertaLocal(alerta.id);
    } else if ("sinSesion" in resultado) {
      router.replace("/login");
    } else {
      avisar(resultado.error, "error");
    }
  }

  const activas = contarActivas(alertas);

  return (
    <main className="pb-8">
      <EncabezadoAlertas
        subtitulo={carga === "listo" ? `${textoActivas(activas)} · se actualiza cada 60 s` : undefined}
      />

      <section aria-label="Alertas" aria-busy={carga === "cargando"}>
        {carga === "cargando" && <EsqueletoAlertas />}

        {carga === "error" && (
          <EmptyState mensaje="No pudimos cargar las alertas" variante="error">
            <Button onClick={() => void reintentarAlertas()} className="min-h-11 px-8">
              Reintentar
            </Button>
          </EmptyState>
        )}

        {carga === "listo" && alertas.length === 0 && (
          <EmptyState
            mensaje="No hay insumos por agotarse"
            icono={<IconoAlertaInsumo className="size-14" />}
          />
        )}

        {carga === "listo" && alertas.length > 0 && (
          <table className="w-full border-separate border-spacing-y-2 text-left">
            <caption className="sr-only">Alertas de insumos por agotarse</caption>
            <thead>
              <tr>
                <th scope="col" className={encabezado}>
                  Insumo
                </th>
                <th scope="col" className={`${encabezado} hidden md:table-cell`}>
                  Cantidad actual
                </th>
                <th scope="col" className={`${encabezado} hidden md:table-cell`}>
                  Mínimo
                </th>
                <th scope="col" className={`${encabezado} hidden sm:table-cell`}>
                  Estado
                </th>
                <th scope="col" className={`${encabezado} hidden md:table-cell`}>
                  Generada
                </th>
                <th scope="col" className={`${encabezado} text-right`}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((alerta) => {
                const activa = alerta.estado === "ACTIVA";
                const peso = activa ? "font-bold text-zinc-50" : "font-normal text-zinc-400";
                return (
                  <tr key={alerta.id} data-estado={alerta.estado}>
                    <th scope="row" className={`${celda} rounded-l-xl text-lg wrap-break-word ${peso}`}>
                      <span className="block">{alerta.insumo}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm md:hidden">
                        <span className="tabular-nums">
                          {cantidadCon(alerta.cantidad, alerta)} · mín. {cantidadCon(alerta.minimo, alerta)}
                        </span>
                        <time dateTime={alerta.creadaEn} className="tabular-nums">
                          {formatoFechaAlerta(alerta.creadaEn)}
                        </time>
                        <span className="sm:hidden">
                          <EstadoAlertaBadge alerta={alerta} />
                        </span>
                      </span>
                    </th>
                    <td className={`${celda} hidden text-lg tabular-nums md:table-cell ${peso}`}>
                      {cantidadCon(alerta.cantidad, alerta)}
                    </td>
                    <td className={`${celda} hidden text-lg tabular-nums md:table-cell ${peso}`}>
                      {cantidadCon(alerta.minimo, alerta)}
                    </td>
                    <td className={`${celda} hidden sm:table-cell`}>
                      <EstadoAlertaBadge alerta={alerta} />
                    </td>
                    <td className={`${celda} hidden tabular-nums md:table-cell ${peso}`}>
                      <time dateTime={alerta.creadaEn}>{formatoFechaAlerta(alerta.creadaEn)}</time>
                    </td>
                    <td className={`${celda} w-px rounded-r-xl`}>
                      <div className="flex flex-col items-stretch justify-end gap-2 lg:flex-row">
                        {activa && (
                          <button
                            type="button"
                            onClick={() => void marcarVista(alerta)}
                            disabled={marcando.has(alerta.id)}
                            aria-busy={marcando.has(alerta.id)}
                            aria-label={`Marcar como vista la alerta de ${alerta.insumo}`}
                            className={`${BOTON} text-zinc-100`}
                          >
                            {marcando.has(alerta.id) ? "Marcando..." : "Marcar como vista"}
                          </button>
                        )}
                        <Link
                          href={`/admin/inventario?insumo=${alerta.insumoId}`}
                          aria-label={`Ver insumo ${alerta.insumo}`}
                          className={`${BOTON} text-[#FF7A1A]`}
                        >
                          Ver insumo
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <Toast key={aviso?.id} variant={aviso?.variante}>
        {aviso?.texto}
      </Toast>
    </main>
  );
}
