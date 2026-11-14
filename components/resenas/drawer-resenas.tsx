"use client";

import { useEffect, useState } from "react";
import { consultarResenas, type ResenasResultado } from "@/app/actions/resenas";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatoFecha } from "@/lib/resenas";
import { CalificacionPlatillo } from "./calificacion-platillo";
import { Estrellas } from "./estrellas";

type PlatilloSeleccionado = { id: number; nombre: string };

type Estado = {
  clave: string;
  resultado: ResenasResultado;
};

function ResenasSkeleton() {
  return (
    <ul aria-hidden="true" className="space-y-4">
      {[1, 2, 3].map((n) => (
        <li key={n} className="space-y-2 rounded-xl border border-zinc-800 p-4">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-3 w-32 rounded" />
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
      if (vigente) setEstado({ clave, resultado });
    });
    return () => {
      vigente = false;
    };
  }, [platillo, pagina, clave]);

  const listo = estado?.clave === clave ? estado.resultado : null;
  const datos = listo?.datos;

  return (
    <Drawer
      abierto={platillo !== null}
      onCerrar={onCerrar}
      titulo={platillo ? `Reseñas de ${platillo.nombre}` : "Reseñas"}
    >
      <section aria-busy={!listo} aria-label="Reseñas">
        {!listo && <ResenasSkeleton />}

        {listo?.error && (
          <EmptyState mensaje={listo.error} variante="error">
            <Button onClick={() => setReintento((n) => n + 1)}>
              Reintentar
            </Button>
          </EmptyState>
        )}

        {datos && datos.total === 0 && (
          <EmptyState mensaje="Este platillo aún no tiene reseñas" />
        )}

        {datos && datos.total > 0 && (
          <>
            <CalificacionPlatillo
              promedio={datos.promedio}
              total={datos.total}
            />

            <ul className="mt-6 space-y-4">
              {datos.resenas.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-zinc-800 bg-[#18181b] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span aria-label={`${r.estrellas} de 5 estrellas`}>
                      <Estrellas valor={r.estrellas} />
                    </span>
                    <time dateTime={r.fecha} className="text-xs text-zinc-400">
                      {formatoFecha(r.fecha)}
                    </time>
                  </div>
                  {r.comentario && (
                    <p className="mt-2 break-words text-sm text-zinc-200">
                      {r.comentario}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-zinc-400">{r.cliente}</p>
                </li>
              ))}
            </ul>

            {datos.totalPaginas > 1 && (
              <nav
                aria-label="Paginación de reseñas"
                className="mt-6 flex items-center justify-between gap-2"
              >
                <Button
                  className="px-4 py-2 text-sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span aria-live="polite" className="text-sm text-zinc-300">
                  Página {datos.pagina} de {datos.totalPaginas}
                </span>
                <Button
                  className="px-4 py-2 text-sm"
                  disabled={pagina >= datos.totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </Drawer>
  );
}
