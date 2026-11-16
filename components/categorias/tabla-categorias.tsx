"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { Categoria } from "@/lib/categorias";

type Props = {
  categorias: Categoria[];
  onVer: (categoria: Categoria) => void;
  onRenombrar: (categoria: Categoria) => void;
  onDeshabilitar: (categoria: Categoria) => void;
};

const celda = "bg-[#2b2b2f] px-4 py-3";
const encabezado = "border-b border-zinc-700 px-4 pb-2 text-lg font-semibold";

function BotonIcono({
  etiqueta,
  onClick,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      className="grid size-9 cursor-pointer place-items-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white focus-visible:outline-2 focus-visible:outline-orange-400"
    >
      {children}
    </button>
  );
}

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

function Estado({ categoria }: { categoria: Categoria }) {
  return (
    <Badge variant={categoria.activa ? "success" : "danger"}>
      {categoria.activa ? "Activa" : "Deshabilitada"}
    </Badge>
  );
}

export function TablaCategorias({
  categorias,
  onVer,
  onRenombrar,
  onDeshabilitar,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-2 text-left">
        <caption className="sr-only">Categorías del menú</caption>
        <thead>
          <tr>
            <th scope="col" className={encabezado}>
              Nombre
            </th>
            <th scope="col" className={`${encabezado} hidden sm:table-cell`}>
              Platillos
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
          {categorias.map((categoria) => (
            <tr key={categoria.id}>
              <td className={`${celda} rounded-l-xl text-lg`}>
                <span className="block">{categoria.nombre}</span>
                <span className="mt-1 block sm:hidden">
                  <Estado categoria={categoria} />
                </span>
              </td>
              <td className={`${celda} hidden sm:table-cell`}>
                {categoria.platillosActivos}
              </td>
              <td className={`${celda} hidden sm:table-cell`}>
                <Estado categoria={categoria} />
              </td>
              <td className={`${celda} rounded-r-xl`}>
                <div className="flex justify-end gap-1">
                  <BotonIcono
                    etiqueta={`Ver platillos de ${categoria.nombre}`}
                    onClick={() => onVer(categoria)}
                  >
                    <Icono d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                  </BotonIcono>
                  <BotonIcono
                    etiqueta={`Renombrar ${categoria.nombre}`}
                    onClick={() => onRenombrar(categoria)}
                  >
                    <Icono d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" />
                  </BotonIcono>
                  {categoria.activa && (
                    <BotonIcono
                      etiqueta={`Deshabilitar ${categoria.nombre}`}
                      onClick={() => onDeshabilitar(categoria)}
                    >
                      <Icono d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v6m4-6v6" />
                    </BotonIcono>
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
