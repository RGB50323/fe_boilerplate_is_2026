"use client";

import {
  NOTA_MAX,
  formatearPrecio,
  totalPedido,
  type LineaPedido,
  type Mesa,
} from "@/lib/pedidos";

const BOTON_CANTIDAD =
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded border-2 border-zinc-300 text-lg leading-none transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40";

export function ResumenPedido({
  mesa,
  lineas,
  enviando,
  onMas,
  onMenos,
  onQuitar,
  onNota,
  onEnviar,
}: {
  mesa: Mesa | null;
  lineas: LineaPedido[];
  enviando: boolean;
  onMas: (platilloId: number) => void;
  onMenos: (platilloId: number) => void;
  onQuitar: (platilloId: number) => void;
  onNota: (platilloId: number, texto: string) => void;
  onEnviar: () => void;
}) {
  return (
    <section
      aria-labelledby="titulo-resumen"
      className="rounded-xl border-4 border-zinc-600 bg-black p-6"
    >
      <h2 id="titulo-resumen" className="text-3xl">
        Resumen del pedido
      </h2>
      <p className="mb-4 text-xl text-zinc-400">
        {mesa ? `Mesa ${mesa.numero}` : "Sin mesa seleccionada"}
      </p>

      {lineas.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Agrega platillos para armar el pedido.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lineas.map(({ platillo, cantidad, nota }) => (
            <li key={platillo.id} className="rounded-xl bg-[#2b2b2f] p-3">
              <div className="flex items-start gap-3">
                {platillo.imagenSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={platillo.imagenSrc}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-md bg-zinc-700" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg">{platillo.nombre}</p>
                  <p className="text-sm text-zinc-300">
                    {formatearPrecio(platillo.precio)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => onQuitar(platillo.id)}
                    aria-label={`Quitar ${platillo.nombre}`}
                    className="cursor-pointer rounded-full bg-red-950 px-4 py-1 text-sm font-semibold text-red-100 transition-colors hover:bg-red-900"
                  >
                    Quitar
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onMenos(platillo.id)}
                      disabled={cantidad <= 1}
                      aria-label={`Quitar una unidad de ${platillo.nombre}`}
                      className={BOTON_CANTIDAD}
                    >
                      −
                    </button>
                    <span aria-live="polite" className="w-5 text-center">
                      {cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMas(platillo.id)}
                      disabled={cantidad >= platillo.disponibilidad}
                      aria-label={`Agregar una unidad de ${platillo.nombre}`}
                      className={BOTON_CANTIDAD}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <label className="mt-3 block text-xs text-zinc-400">
                <span className="sr-only">Nota para {platillo.nombre}</span>
                <input
                  type="text"
                  value={nota}
                  maxLength={NOTA_MAX}
                  onChange={(e) => onNota(platillo.id, e.target.value)}
                  placeholder="Nota (opcional)"
                  aria-label={`Nota para ${platillo.nombre}`}
                  className="w-full rounded-md border border-zinc-600 bg-black px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500"
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-2xl text-orange-200">
        Total: {formatearPrecio(totalPedido(lineas))}
      </p>

      <button
        type="button"
        onClick={onEnviar}
        disabled={enviando || lineas.length === 0}
        className="mt-4 w-full cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-3 text-xl font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-600 disabled:text-zinc-300 disabled:hover:bg-zinc-600"
      >
        {enviando ? "Enviando..." : "Enviar a cocina"}
      </button>
    </section>
  );
}
