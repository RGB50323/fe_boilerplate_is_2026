"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatearPrecio } from "@/lib/pedidos";
import type { Platillo } from "@/lib/platillos";

export function ListaPlatillos({
  platillos,
  busqueda,
  onBuscar,
  onAgregar,
}: {
  platillos: Platillo[];
  busqueda: string;
  onBuscar: (texto: string) => void;
  onAgregar: (platillo: Platillo) => void;
}) {
  return (
    <section
      aria-labelledby="titulo-toma"
      className="rounded-xl border-4 border-zinc-600 bg-black p-6"
    >
      <h2 id="titulo-toma" className="mb-4 text-3xl">
        Toma de pedido
      </h2>

      <div className="mb-6 max-w-sm">
        <label htmlFor="buscar-platillo-pedido" className="sr-only">
          Buscar por nombre de platillo
        </label>
        <Input
          id="buscar-platillo-pedido"
          type="search"
          value={busqueda}
          onChange={(e) => onBuscar(e.target.value)}
          placeholder="Buscar por nombre de platillo..."
        />
      </div>

      <h3 className="mb-2 border-b border-zinc-600 pb-1 text-xl text-orange-200">
        Platillos
      </h3>

      {platillos.length === 0 ? (
        <EmptyState
          mensaje="Sin resultados"
          descripcion="Ningún platillo coincide con la búsqueda."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {platillos.map((p) => {
            const agotado = p.disponibilidad <= 0;
            return (
              <li
                key={p.id}
                className="flex items-center gap-4 rounded-xl bg-[#2b2b2f] p-3"
              >
                {p.imagenSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imagenSrc}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-12 w-16 shrink-0 rounded-md bg-zinc-700" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg">{p.nombre}</p>
                  <p className="text-sm text-zinc-300">
                    {formatearPrecio(p.precio)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={agotado}
                  onClick={() => onAgregar(p)}
                  aria-label={
                    agotado ? `${p.nombre} agotado` : `Agregar ${p.nombre}`
                  }
                  className="cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300 disabled:hover:bg-zinc-600"
                >
                  {agotado ? "Agotado" : "Agregar"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
