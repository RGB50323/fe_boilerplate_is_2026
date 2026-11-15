"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listarMisPedidos } from "@/app/actions/pedidos";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { Paginacion } from "@/components/ui/paginacion";
import { formatoPrecio } from "@/lib/menu";
import { etiquetaEstado } from "@/lib/seguimiento";

type Resultado = {
  clave: string;
  respuesta: Awaited<ReturnType<typeof listarMisPedidos>>;
};

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/El_Salvador",
  }).format(new Date(iso));
}

export function MisPedidosView() {
  const [pagina, setPagina] = useState(1);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const clave = `${pagina}:${intento}`;
  const cargando = resultado?.clave !== clave;
  const respuesta = cargando ? undefined : resultado.respuesta;

  useEffect(() => {
    let vigente = true;
    listarMisPedidos(pagina)
      .then((respuesta) => {
        if (!vigente) return;
        if (
          respuesta.ok &&
          pagina > 1 &&
          pagina > respuesta.datos.totalPaginas
        ) {
          setPagina(Math.max(1, respuesta.datos.totalPaginas));
          return;
        }
        setResultado({ clave, respuesta });
      })
      .catch(() => {
        if (vigente) {
          setResultado({
            clave,
            respuesta: {
              ok: false,
              error: "No pudimos cargar tus pedidos. Intenta nuevamente.",
            },
          });
        }
      });
    return () => {
      vigente = false;
    };
  }, [pagina, clave]);

  return (
    <section aria-label="Mis pedidos" aria-busy={cargando}>
      {cargando ? (
        <PageLoading mensaje="Cargando tus pedidos…" />
      ) : respuesta && !respuesta.ok ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7"
        >
          <p className="text-red-200">{respuesta.error}</p>
          {respuesta.sinSesion ? (
            <Link
              href="/login"
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
      ) : respuesta?.ok && respuesta.datos.datos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-6 py-12 text-center">
          <h2 className="text-2xl">Todavía no tienes pedidos para llevar</h2>
          <p className="mt-3 text-zinc-400">
            Arma tu pedido desde el menú y aquí podrás seguirlo.
          </p>
          <Link
            href="/menu"
            className="mt-6 inline-block rounded-full bg-[#FF7A1A] px-5 py-3 font-semibold text-[#101012]"
          >
            Ver el menú
          </Link>
        </div>
      ) : respuesta?.ok ? (
        <>
          <p role="status" className="mb-5 text-sm text-zinc-400">
            {respuesta.datos.total}{" "}
            {respuesta.datos.total === 1 ? "pedido" : "pedidos"} · Del más
            reciente al más antiguo
          </p>
          <ul className="grid gap-4">
            {respuesta.datos.datos.map((p) => (
              <li key={p.pedidoId}>
                <Link
                  href={`/pedidos/${p.pedidoId}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-800 bg-[#18181b] p-5 transition-colors hover:border-[#FF7A1A]/60 focus-visible:outline-2 focus-visible:outline-orange-400"
                >
                  <div>
                    <p className="text-lg font-semibold tabular-nums">
                      {p.numero ?? `Pedido #${p.pedidoId}`}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      {`${p.sucursal} · ${fechaCorta(p.creadoEn)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">{formatoPrecio(p.total)}</p>
                    <p className="mt-1 text-sm text-orange-200">
                      {etiquetaEstado(p.estado)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Paginacion
            pagina={pagina}
            totalPaginas={respuesta.datos.totalPaginas}
            onCambiar={setPagina}
            etiqueta="Páginas de mis pedidos"
            className="mt-8"
          />
        </>
      ) : null}
    </section>
  );
}
