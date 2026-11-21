"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { listarMisReservaciones } from "@/app/actions/confirmacion-reserva";
import { ResumenReserva } from "@/components/reservaciones/resumen-reserva";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { rutaRetorno } from "@/lib/retorno-login";
import { Paginacion } from "@/components/ui/paginacion";

type Resultado = {
  clave: string;
  respuesta: Awaited<ReturnType<typeof listarMisReservaciones>>;
};
export function MisReservacionesView({
  destacada,
}: {
  destacada?: string;
} = {}) {
  const [pagina, setPagina] = useState(1);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const clave = `${pagina}:${intento}`;
  const cargando = resultado?.clave !== clave;
  const respuesta = cargando ? undefined : resultado.respuesta;
  // Al llegar desde un aviso, avanza de página hasta encontrar la reservación
  const buscando = useRef(Boolean(destacada));

  useEffect(() => {
    let vigente = true;
    listarMisReservaciones(pagina)
      .then((respuesta) => {
        if (!vigente) return;
        if (
          respuesta.datos &&
          pagina > 1 &&
          pagina > respuesta.datos.totalPaginas
        ) {
          setPagina(Math.max(1, respuesta.datos.totalPaginas));
          return;
        }
        if (buscando.current && respuesta.datos) {
          const encontrada = respuesta.datos.datos.some(
            (r) => r.reservacionId === destacada,
          );
          if (!encontrada && pagina < respuesta.datos.totalPaginas) {
            setPagina(pagina + 1);
            return;
          }
          buscando.current = false;
          // No está en ninguna página: se muestra la primera
          if (!encontrada && pagina !== 1) {
            setPagina(1);
            return;
          }
        }
        setResultado({ clave, respuesta });
      })
      .catch(() => {
        if (vigente)
          setResultado({
            clave,
            respuesta: {
              error: "No pudimos cargar tus reservaciones. Intentá nuevamente.",
            },
          });
      });
    return () => {
      vigente = false;
    };
  }, [pagina, clave, destacada]);

  return (
    <section aria-label="Mis reservaciones" aria-busy={cargando}>
      {cargando ? (
        <PageLoading mensaje="Cargando tus reservaciones…" />
      ) : respuesta?.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7"
        >
          <p className="text-red-200">{respuesta.error}</p>
          {respuesta.sinSesion ? (
            <Link
              href={`/login?next=${rutaRetorno(destacada)}`}
              className="mt-5 inline-block text-orange-300 underline"
            >
              Iniciar sesión
            </Link>
          ) : (
            <Button className="mt-5" onClick={() => setIntento((i) => i + 1)}>
              Reintentar
            </Button>
          )}
        </div>
      ) : respuesta?.datos?.datos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-6 py-12 text-center">
          <h2 className="text-2xl">Todavía no tenés reservaciones</h2>
          <p className="mt-3 text-zinc-400">
            Elegí una sucursal y encontrá una mesa para tu próxima visita.
          </p>
          <Link
            href="/reservas"
            className="mt-6 inline-block rounded-full bg-[#FF7A1A] px-5 py-3 font-semibold text-[#101012]"
          >
            Reservar una mesa
          </Link>
        </div>
      ) : respuesta?.datos ? (
        <>
          <p role="status" className="mb-5 text-sm text-zinc-400">
            {respuesta.datos.total}{" "}
            {respuesta.datos.total === 1 ? "reservación" : "reservaciones"} ·
            Por fecha de visita, de más reciente a más antigua
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {respuesta.datos.datos.map((reserva) => (
              <ResumenReserva
                key={reserva.reservacionId}
                reserva={reserva}
                permitirEdicion
                destacada={reserva.reservacionId === destacada}
              />
            ))}
          </div>
          <Paginacion
            pagina={pagina}
            totalPaginas={Math.min(1000, respuesta.datos.totalPaginas)}
            onCambiar={setPagina}
            etiqueta="Páginas de mis reservaciones"
            className="mt-8"
          />
        </>
      ) : null}
    </section>
  );
}
