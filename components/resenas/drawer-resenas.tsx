"use client";

import { useEffect, useRef, useState } from "react";
import { consultarResenas, type ResenasResultado } from "@/app/actions/resenas";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatoFecha, type ResenasPlatillo } from "@/lib/resenas";
import { Estrellas } from "./estrellas";
import { ResumenResenas } from "./resumen-resenas";

type PlatilloSeleccionado = { id: number; nombre: string };

type Estado = { clave: string; resultado: ResenasResultado };

const BOTON_PAGINA =
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-zinc-700 px-3 text-sm sm:px-4 text-zinc-100 transition-colors hover:border-[#FF7A1A] hover:text-[#FF7A1A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600 disabled:hover:border-zinc-800 disabled:hover:text-zinc-600";

function ResenasSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex items-center gap-6">
        <Skeleton className="h-20 w-20 rounded-xl" />
        <div className="flex-1 space-y-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-1.5 w-full rounded-full" />
          ))}
        </div>
      </div>
      <ul className="mt-8 divide-y divide-zinc-800">
        {[1, 2, 3].map((n) => (
          <li key={n} className="space-y-2 py-5">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListaResenas({ datos }: { datos: ResenasPlatillo }) {
  return (
    <ul className="divide-y divide-zinc-800">
      {datos.resenas.map((r) => (
        <li key={r.id} className="py-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-200"
            >
              {r.cliente.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-100">{r.cliente}</p>
              <div className="flex items-center gap-2">
                <span role="img" aria-label={`${r.estrellas} de 5 estrellas`}>
                  <Estrellas valor={r.estrellas} className="size-3.5" />
                </span>
                <time dateTime={r.fecha} className="text-xs text-zinc-500">
                  {formatoFecha(r.fecha)}
                </time>
              </div>
            </div>
          </div>
          {r.comentario ? (
            <p className="mt-3 max-w-prose break-words text-[15px] leading-relaxed text-zinc-300">
              {r.comentario}
            </p>
          ) : (
            <p className="mt-3 text-sm italic text-zinc-500">
              Calificó sin comentario.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DrawerResenas({
  platillo,
  onCerrar,
}: {
  platillo: PlatilloSeleccionado | null;
  onCerrar: () => void;
}) {
  const [pagina, setPagina] = useState(1);
  const [reintento, setReintento] = useState(0);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [ultimos, setUltimos] = useState<{
    id: number;
    datos: ResenasPlatillo;
  } | null>(null);
  const inicioLista = useRef<HTMLHeadingElement>(null);

  const clave = platillo ? `${platillo.id}:${pagina}:${reintento}` : "";

  // Vuelve a la página 1 al cambiar de platillo
  const [platilloId, setPlatilloId] = useState(platillo?.id);
  if (platillo?.id !== platilloId) {
    setPlatilloId(platillo?.id);
    setPagina(1);
  }

  useEffect(() => {
    if (!platillo) return;
    let vigente = true;
    consultarResenas(platillo.id, pagina).then((resultado) => {
      if (!vigente) return;
      setEstado({ clave, resultado });
      if (resultado.datos)
        setUltimos({ id: platillo.id, datos: resultado.datos });
    });
    return () => {
      vigente = false;
    };
  }, [platillo, pagina, clave]);

  const listo = estado?.clave === clave ? estado.resultado : null;
  // Mientras carga otra página se mantiene lo último del mismo platillo
  const previos = ultimos && ultimos.id === platillo?.id ? ultimos.datos : null;
  const datos = listo ? listo.datos : previos;
  const cargando = !listo;

  const irA = (nueva: number) => {
    setPagina(nueva);
    inicioLista.current?.scrollIntoView?.({
      block: "start",
      behavior: "smooth",
    });
  };

  return (
    <Drawer
      abierto={platillo !== null}
      onCerrar={onCerrar}
      titulo={platillo?.nombre ?? "Reseñas"}
      descripcion="Opiniones de clientes"
      // Borde sutil en vez del blanco del drawer base
      className="border-l! border-zinc-800! bg-[#151517]! shadow-[-24px_0_48px_-12px_rgb(0_0_0/0.6)]"
    >
      <section aria-busy={cargando} aria-label="Reseñas">
        {cargando && !datos && <ResenasSkeleton />}

        {listo?.error && (
          <EmptyState mensaje={listo.error} variante="error">
            <Button onClick={() => setReintento((n) => n + 1)}>
              Reintentar
            </Button>
          </EmptyState>
        )}

        {datos && datos.total === 0 && (
          <EmptyState
            mensaje="Este platillo aún no tiene reseñas"
            descripcion="Cuando alguien lo pida y lo califique, su opinión aparecerá aquí."
          />
        )}

        {datos && datos.total > 0 && datos.promedio !== null && (
          <>
            <ResumenResenas
              promedio={datos.promedio}
              total={datos.total}
              distribucion={datos.distribucion}
            />

            <h3
              ref={inicioLista}
              className="mt-8 scroll-mt-6 border-b border-zinc-800 pb-3 text-xs uppercase tracking-wider text-zinc-500"
            >
              Más recientes
            </h3>

            <div
              className={`transition-opacity duration-200 motion-reduce:transition-none ${cargando ? "opacity-40" : ""}`}
            >
              <ListaResenas datos={datos} />
            </div>

            {datos.totalPaginas > 1 && (
              <nav
                aria-label="Paginación de reseñas"
                className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 pt-4"
              >
                <button
                  type="button"
                  className={BOTON_PAGINA}
                  disabled={cargando || pagina <= 1}
                  onClick={() => irA(pagina - 1)}
                >
                  <span aria-hidden="true">‹</span> Anterior
                </button>
                <span
                  aria-live="polite"
                  className="whitespace-nowrap text-sm text-zinc-400"
                >
                  Página {pagina} de {datos.totalPaginas}
                </span>
                <button
                  type="button"
                  className={BOTON_PAGINA}
                  disabled={cargando || pagina >= datos.totalPaginas}
                  onClick={() => irA(pagina + 1)}
                >
                  Siguiente <span aria-hidden="true">›</span>
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </Drawer>
  );
}
