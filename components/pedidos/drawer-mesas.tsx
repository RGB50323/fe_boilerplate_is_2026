"use client";

import { Drawer } from "@/components/ui/drawer";
import type { Mesa } from "@/lib/pedidos";

function estadoDe(mesa: Mesa) {
  if (!mesa.activa) return "Fuera de servicio";
  return mesa.pedidoAbiertoId === null ? "Libre" : "Ocupada";
}

export function DrawerMesas({
  abierto,
  mesas,
  seleccionada,
  onCerrar,
  onElegir,
}: {
  abierto: boolean;
  mesas: Mesa[];
  seleccionada: number | null;
  onCerrar: () => void;
  onElegir: (mesa: Mesa) => void;
}) {
  return (
    <Drawer
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Seleccionar mesa"
      descripcion="Escoge la mesa a la que irá el pedido realizado"
    >
      {mesas.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Esta sucursal no tiene mesas registradas.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {mesas.map((mesa) => {
            const estado = estadoDe(mesa);
            const libre = estado === "Libre";
            const elegida = seleccionada === mesa.id;
            return (
              <li key={mesa.id}>
                <button
                  type="button"
                  disabled={!libre}
                  aria-pressed={elegida}
                  onClick={() => onElegir(mesa)}
                  className={`w-full rounded-lg border-2 bg-[#2b2b2f] px-3 py-4 text-center transition-colors enabled:cursor-pointer enabled:hover:bg-zinc-700 disabled:opacity-80 ${
                    elegida
                      ? "border-blue-500"
                      : libre
                        ? "border-green-700"
                        : "border-orange-500"
                  }`}
                >
                  <span className="block text-xl">Mesa {mesa.numero}</span>
                  <span className="mt-1 block text-sm">{estado}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
