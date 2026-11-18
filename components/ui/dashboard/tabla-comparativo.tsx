"use client";

import { useState } from "react";
import { formatoDiferencia, type FilaComparativo } from "@/lib/comparativo";
import { formatoEntero, formatoMoneda } from "@/lib/dashboard";
import { EtiquetaEstado } from "./etiqueta-estado";

type Columna = "nombre" | "ventas" | "pedidos" | "ticketPromedio" | "diferencia";
type Orden = { columna: Columna; direccion: "asc" | "desc" };

const COLUMNAS: { columna: Columna; label: string; numerica: boolean }[] = [
  { columna: "nombre", label: "Sucursal", numerica: false },
  { columna: "ventas", label: "Ventas", numerica: true },
  { columna: "pedidos", label: "Pedidos", numerica: true },
  { columna: "ticketPromedio", label: "Ticket promedio", numerica: true },
  { columna: "diferencia", label: "Dif. vs. promedio", numerica: true },
];

export function colorDiferencia(pct: number) {
  const valor = Math.round(pct * 10) / 10;
  if (valor > 0) return "text-green-400";
  if (valor < 0) return "text-red-300";
  return "text-zinc-300";
}

// Detalle del comparativo; clic en un encabezado para ordenar.
export function TablaComparativo({ filas }: { filas: FilaComparativo[] }) {
  const [orden, setOrden] = useState<Orden>({ columna: "ventas", direccion: "desc" });

  const ordenadas = [...filas].sort((a, b) => {
    const signo = orden.direccion === "asc" ? 1 : -1;
    if (orden.columna === "nombre") return signo * a.nombre.localeCompare(b.nombre, "es");
    return signo * (a[orden.columna] - b[orden.columna]) || a.nombre.localeCompare(b.nombre, "es");
  });

  function ordenarPor(columna: Columna) {
    setOrden((o) =>
      o.columna === columna
        ? { columna, direccion: o.direccion === "asc" ? "desc" : "asc" }
        : { columna, direccion: columna === "nombre" ? "asc" : "desc" },
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left">
        <thead className="border-b border-zinc-700 text-sm text-zinc-400">
          <tr>
            {COLUMNAS.map(({ columna, label, numerica }) => {
              const activa = orden.columna === columna;
              return (
                <th
                  key={columna}
                  scope="col"
                  aria-sort={activa ? (orden.direccion === "asc" ? "ascending" : "descending") : "none"}
                  className={`py-3 font-normal ${numerica ? "pl-4 text-right" : "pr-4"}`}
                >
                  <button
                    type="button"
                    onClick={() => ordenarPor(columna)}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-orange-400 ${
                      activa ? "text-zinc-100" : ""
                    }`}
                  >
                    {label}
                    <span aria-hidden="true" className="text-xs">
                      {activa ? (orden.direccion === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
            <th scope="col" className="py-3 pl-6 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f) => (
            <tr key={f.sucursalId} className="border-b border-zinc-800">
              <th scope="row" className="py-3 pr-4 font-normal">{f.nombre}</th>
              <td className="py-3 pl-4 text-right tabular-nums">{formatoMoneda(f.ventas)}</td>
              <td className="py-3 pl-4 text-right tabular-nums">{formatoEntero(f.pedidos)}</td>
              <td className="py-3 pl-4 text-right tabular-nums">{formatoMoneda(f.ticketPromedio)}</td>
              <td className={`py-3 pl-4 text-right tabular-nums ${colorDiferencia(f.diferencia)}`}>
                {formatoDiferencia(f.diferencia)}
              </td>
              <td className="py-3 pl-6">
                <EtiquetaEstado requiereAtencion={f.requiereAtencion} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
