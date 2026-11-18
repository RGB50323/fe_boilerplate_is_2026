import { formatoCantidad, type EstadoInsumo, type Insumo } from "@/lib/inventario";

type Props = {
  insumos: Insumo[];
  onMovimiento: (insumo: Insumo) => void;
  onHistorial: (insumo: Insumo) => void;
};

const celda = "bg-[#2b2b2f] px-3 py-3 sm:px-4";
const encabezado = "border-b border-zinc-700 px-3 pb-2 text-lg font-semibold sm:px-4";
const claseIcono =
  "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white focus-visible:outline-2 focus-visible:outline-orange-400";

export function IconoMovimiento({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 20V4M3 8l4-4 4 4M17 4v16M13 16l4 4 4-4" />
    </svg>
  );
}

export function IconoHistorial({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function EstadoInsumoBadge({ estado }: { estado: EstadoInsumo }) {
  if (estado === "BAJO") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-500/60 bg-amber-950 px-3 py-1 text-sm font-semibold text-amber-200">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="M12 3 2.5 20h19Z" />
          <path d="M12 10v4M12 17.2v.1" />
        </svg>
        Bajo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-green-900 px-3 py-1 text-sm text-green-100">
      Normal
    </span>
  );
}

export function TablaInsumos({ insumos, onMovimiento, onHistorial }: Props) {
  return (
    <table className="w-full border-separate border-spacing-y-2 text-left">
      <caption className="sr-only">Insumos de la sucursal</caption>
      <thead>
        <tr>
          <th scope="col" className={encabezado}>
            Nombre
          </th>
          <th scope="col" className={`${encabezado} hidden sm:table-cell`}>
            Unidad
          </th>
          <th scope="col" className={`${encabezado} hidden sm:table-cell`}>
            Cantidad actual
          </th>
          <th scope="col" className={`${encabezado} hidden sm:table-cell`}>
            Mínimo
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
        {insumos.map((insumo) => (
          <tr key={insumo.id}>
            <th
              scope="row"
              className={`${celda} rounded-l-xl text-lg font-normal wrap-break-word`}
            >
              <span className="block">{insumo.nombre}</span>
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400 sm:hidden">
                <span className="tabular-nums text-zinc-200">
                  {formatoCantidad(insumo.cantidad, insumo.unidad)} {insumo.unidad}
                </span>
                <span className="tabular-nums">
                  mín. {formatoCantidad(insumo.minimo, insumo.unidad)}
                </span>
                <EstadoInsumoBadge estado={insumo.estado} />
              </span>
            </th>
            <td className={`${celda} hidden sm:table-cell`}>{insumo.unidad}</td>
            <td className={`${celda} hidden text-lg tabular-nums sm:table-cell`}>
              {formatoCantidad(insumo.cantidad, insumo.unidad)}
            </td>
            <td className={`${celda} hidden text-lg tabular-nums sm:table-cell`}>
              {formatoCantidad(insumo.minimo, insumo.unidad)}
            </td>
            <td className={`${celda} hidden sm:table-cell`}>
              <EstadoInsumoBadge estado={insumo.estado} />
            </td>
            <td className={`${celda} w-px rounded-r-xl`}>
              <div className="flex justify-end gap-1">
                <button
                  type="button"
                  aria-label={`Registrar movimiento de ${insumo.nombre}`}
                  title="Registrar movimiento"
                  onClick={() => onMovimiento(insumo)}
                  className={claseIcono}
                >
                  <IconoMovimiento />
                </button>
                <button
                  type="button"
                  aria-label={`Ver historial de ${insumo.nombre}`}
                  title="Ver historial"
                  onClick={() => onHistorial(insumo)}
                  className={claseIcono}
                >
                  <IconoHistorial />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
