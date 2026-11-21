import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function EncabezadoInventario({
  sucursalNombre,
  children,
}: {
  sucursalNombre?: string;
  children?: ReactNode;
}) {
  return (
    <div className="my-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-4xl sm:text-5xl">Inventario de insumos</h1>
        {sucursalNombre && <p className="mt-2 text-lg text-zinc-400">{sucursalNombre}</p>}
      </div>
      {children}
    </div>
  );
}

export function EsqueletoInventario() {
  return (
    <div role="status" aria-label="Cargando inventario" className="grid gap-2">
      <Skeleton className="mb-2 h-8 w-full rounded-lg opacity-50" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-17 rounded-xl" />
      ))}
    </div>
  );
}
