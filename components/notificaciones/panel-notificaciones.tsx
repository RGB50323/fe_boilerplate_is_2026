"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
} from "@/app/actions/notificaciones";
import {
  etiquetaModulo,
  formatoFechaNotificacion,
  rutaDeReferencia,
  type Notificacion,
} from "@/lib/notificaciones";
import { useNotificaciones } from "./notificaciones-provider";

type EstadoPanel = "cargando" | "listo" | "error";

export function PanelNotificaciones({ onNavegar }: { onNavegar?: () => void }) {
  const router = useRouter();
  const { actualizarNoLeidas, decrementarNoLeidas, registrarSinSesion } =
    useNotificaciones();
  const [estado, setEstado] = useState<EstadoPanel>("cargando");
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargandoMas, setCargandoMas] = useState(false);
  const solicitud = useRef(0);

  const cargar = useCallback(
    async (
      paginaSolicitada: number,
      modo: "reemplazar" | "anexar" | "sondeo",
    ) => {
      const numeroSolicitud = ++solicitud.current;
      if (modo === "reemplazar") setEstado("cargando");
      if (modo === "anexar") setCargandoMas(true);

      try {
        const resultado = await listarNotificaciones(paginaSolicitada);
        if (solicitud.current !== numeroSolicitud) return;
        if ("sinSesion" in resultado) {
          registrarSinSesion();
          return;
        }
        if ("error" in resultado) {
          if (modo !== "sondeo") setEstado("error");
          return;
        }

        actualizarNoLeidas(resultado.noLeidas);
        setTotal(resultado.total);
        setPagina((actual) => Math.max(actual, resultado.pagina));
        setNotificaciones((actuales) => {
          if (modo === "reemplazar") return resultado.datos;
          const ids = new Set(resultado.datos.map(({ id }) => String(id)));
          return modo === "anexar"
            ? [
                ...actuales,
                ...resultado.datos.filter(
                  ({ id }) =>
                    !actuales.some((item) => String(item.id) === String(id)),
                ),
              ]
            : [
                ...resultado.datos,
                ...actuales.filter(({ id }) => !ids.has(String(id))),
              ];
        });
        setEstado("listo");
      } catch {
        if (solicitud.current === numeroSolicitud && modo !== "sondeo")
          setEstado("error");
      } finally {
        // Un sondeo puede invalidar la solicitud de "Ver más"; el botón no debe quedar trabado.
        if (modo === "anexar" || solicitud.current === numeroSolicitud)
          setCargandoMas(false);
      }
    },
    [actualizarNoLeidas, registrarSinSesion],
  );

  useEffect(() => {
    const inicio = window.setTimeout(() => void cargar(1, "reemplazar"), 0);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") void cargar(1, "sondeo");
    }, 30_000);
    return () => {
      solicitud.current += 1;
      window.clearTimeout(inicio);
      window.clearInterval(intervalo);
    };
  }, [cargar]);

  async function abrir(notificacion: Notificacion) {
    const resultado = await marcarNotificacionLeida(notificacion.id);
    if ("sinSesion" in resultado) {
      registrarSinSesion();
      return;
    }
    if (!("error" in resultado) && !notificacion.leida) {
      setNotificaciones((actuales) =>
        actuales.map((item) =>
          String(item.id) === String(notificacion.id)
            ? { ...item, leida: true }
            : item,
        ),
      );
      decrementarNoLeidas();
    }

    const ruta = rutaDeReferencia(notificacion.referencia);
    if (ruta) {
      onNavegar?.();
      router.push(ruta);
    }
  }

  return (
    <section
      id="panel-notificaciones"
      aria-label="Historial de notificaciones"
      className="absolute right-0 top-[calc(100%+0.6rem)] flex max-h-[min(36rem,calc(100dvh-5rem))] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-[#18181b] text-zinc-100 shadow-2xl shadow-black/50"
    >
      <header className="border-b border-zinc-800 px-4 py-3.5">
        <h2 className="text-base font-semibold">Notificaciones</h2>
      </header>

      {estado === "cargando" ? (
        <div
          role="status"
          aria-label="Cargando notificaciones"
          className="space-y-3 p-4"
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="animate-pulse space-y-2 rounded-xl bg-[#2b2b2f] p-3"
            >
              <div className="h-3 w-2/5 rounded bg-zinc-700" />
              <div className="h-3 w-full rounded bg-zinc-700" />
              <div className="h-3 w-3/5 rounded bg-zinc-700" />
            </div>
          ))}
        </div>
      ) : estado === "error" ? (
        <div
          role="alert"
          className="grid justify-items-center gap-4 px-5 py-10 text-center"
        >
          <p className="text-sm text-zinc-300">
            No pudimos cargar tus notificaciones
          </p>
          <button
            type="button"
            onClick={() => void cargar(1, "reemplazar")}
            className="rounded-full bg-[#FF7A1A] px-4 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
          >
            Reintentar
          </button>
        </div>
      ) : notificaciones.length === 0 ? (
        <p
          role="status"
          className="px-5 py-12 text-center text-sm text-zinc-400"
        >
          No tienes notificaciones
        </p>
      ) : (
        <div className="overflow-y-auto overscroll-contain">
          <ul className="divide-y divide-zinc-800">
            {notificaciones.map((notificacion) => (
              <li key={notificacion.id}>
                <button
                  type="button"
                  onClick={() => void abrir(notificacion)}
                  className={`relative block w-full px-4 py-3.5 text-left transition-colors hover:bg-[#2b2b2f] focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-400 ${
                    notificacion.leida ? "bg-[#18181b]" : "bg-orange-950/20"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    {!notificacion.leida && (
                      <span
                        aria-label="Sin leer"
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-[#FF7A1A]"
                      />
                    )}
                    <span
                      className={
                        !notificacion.leida ? "min-w-0" : "min-w-0 pl-5"
                      }
                    >
                      <span className="block text-sm font-semibold leading-snug">
                        {notificacion.titulo}
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-zinc-300">
                        {notificacion.mensaje}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                        <span>{etiquetaModulo(notificacion.moduloOrigen)}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={notificacion.creadaEn}>
                          {formatoFechaNotificacion(notificacion.creadaEn)}
                        </time>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {notificaciones.length < total && (
            <div className="border-t border-zinc-800 p-3 text-center">
              <button
                type="button"
                disabled={cargandoMas}
                onClick={() => void cargar(pagina + 1, "anexar")}
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#FF7A1A] transition-colors hover:bg-orange-950/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cargandoMas ? "Cargando…" : "Ver más"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
