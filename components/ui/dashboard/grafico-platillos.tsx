import { formatoEntero, type PlatilloVendido } from "@/lib/dashboard";

// Barras horizontales con la cantidad vendida de cada platillo, en el mismo
// orden que la tabla. Un solo color: el ranking ya lo da la posición.
export function GraficoPlatillos({ platillos }: { platillos: PlatilloVendido[] }) {
  const maximo = Math.max(1, ...platillos.map((p) => p.cantidad));

  return (
    <ol aria-label="Cantidad vendida por platillo" className="space-y-2.5">
      {platillos.map((p, i) => (
        <li
          key={p.platilloId}
          className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-center gap-3 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]"
        >
          <span className="truncate text-zinc-200" title={p.nombre}>
            {i + 1}. {p.nombre}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              style={{ width: `${Math.max(2, (p.cantidad / maximo) * 85)}%` }}
              className="block h-4 shrink-0 rounded-r-[4px] bg-[#FF7A1A]"
            />
            <span className="tabular-nums text-zinc-400">{formatoEntero(p.cantidad)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
