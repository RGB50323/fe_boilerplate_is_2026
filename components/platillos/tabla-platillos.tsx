"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Platillo } from "@/lib/platillos";

type Props = {
  platillos: Platillo[];
  habilitando: number | null;
  onDeshabilitar: (platillo: Platillo) => void;
  onHabilitar: (platillo: Platillo) => void;
};

const celda = "bg-[#2b2b2f] px-4 py-3";
const encabezado = "border-b border-zinc-700 px-4 pb-2 text-lg font-semibold";
const claseIcono =
  "grid size-9 cursor-pointer place-items-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white focus-visible:outline-2 focus-visible:outline-orange-400";

function Icono({ d }: { d: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <path d={d} />
    </svg>
  );
}

function Estado({ platillo }: { platillo: Platillo }) {
  return (
    <Badge variant={platillo.activo ? "success" : "danger"}>
      {platillo.activo ? "Disponible" : "No disponible"}
    </Badge>
  );
}

function precio(valor: number) {
  return `$${valor.toFixed(2)}`;
}

export function TablaPlatillos({
  platillos,
  habilitando,
  onDeshabilitar,
  onHabilitar,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-2 text-left">
        <caption className="sr-only">Platillos del menú</caption>
        <thead>
          <tr>
            <th scope="col" className={encabezado}>
              Nombre
            </th>
            <th scope="col" className={`${encabezado} hidden sm:table-cell`}>
              Categoría
            </th>
            <th scope="col" className={`${encabezado} hidden sm:table-cell`}>
              Precio
            </th>
            <th scope="col" className={`${encabezado} hidden md:table-cell`}>
              Disponibilidad
            </th>
            <th scope="col" className={`${encabezado} hidden sm:table-cell`}>
              Estado
            </th>
            <th scope="col" className={`${encabezado} text-right`}>
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {platillos.map((platillo) => (
            <tr key={platillo.id}>
              <td className={`${celda} rounded-l-xl text-lg`}>
                <span className="block">{platillo.nombre}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400 sm:hidden">
                  {platillo.categoriaNombre} · {precio(platillo.precio)}
                  <Estado platillo={platillo} />
                </span>
              </td>
              <td className={`${celda} hidden sm:table-cell`}>
                {platillo.categoriaNombre}
              </td>
              <td className={`${celda} hidden sm:table-cell`}>
                {precio(platillo.precio)}
              </td>
              <td className={`${celda} hidden md:table-cell`}>
                {platillo.disponibilidad}
              </td>
              <td className={`${celda} hidden sm:table-cell`}>
                <Estado platillo={platillo} />
              </td>
              <td className={`${celda} rounded-r-xl`}>
                <div className="flex justify-end gap-1">
                  <Link
                    href={`/admin/platillos/${platillo.id}/editar`}
                    aria-label={`Editar ${platillo.nombre}`}
                    title={`Editar ${platillo.nombre}`}
                    className={claseIcono}
                  >
                    <Icono d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" />
                  </Link>
                                    {platillo.activo ? (
                    <button
                      type="button"
                      aria-label={`Deshabilitar ${platillo.nombre}`}
                      title={`Deshabilitar ${platillo.nombre}`}
                      onClick={() => onDeshabilitar(platillo)}
                      className={claseIcono}
                    >
                      <Icono d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Habilitar ${platillo.nombre}`}
                      title={`Habilitar ${platillo.nombre}`}
                      disabled={habilitando === platillo.id}
                      onClick={() => onHabilitar(platillo)}
                      className={`${claseIcono} disabled:cursor-wait disabled:opacity-50`}
                    >
                      <Icono d="M5 13l4 4L19 7" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
