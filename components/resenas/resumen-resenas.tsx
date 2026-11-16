import { formatoPromedio, textoTotal, type Distribucion } from "@/lib/resenas";
import { Estrellas } from "./estrellas";

export function ResumenResenas({
  promedio,
  total,
  distribucion,
}: {
  promedio: number;
  total: number;
  distribucion: Distribucion;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2">
      <div className="text-center">
        <p className="text-6xl leading-none text-zinc-50">
          {formatoPromedio(promedio)}
        </p>
        <div className="mt-2">
          <Estrellas valor={promedio} />
        </div>
        <p className="mt-1 text-xs text-zinc-400">{textoTotal(total)}</p>
      </div>

      <ul aria-label="Reseñas por estrellas" className="space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((n) => {
          const cantidad = distribucion[n];
          const porcentaje = total ? Math.round((cantidad / total) * 100) : 0;
          return (
            <li
              key={n}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}: ${cantidad}`}
              className="grid grid-cols-[1ch_1fr_3ch] items-center gap-2 text-xs text-zinc-400"
            >
              <span aria-hidden="true">{n}</span>
              <span
                aria-hidden="true"
                className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
              >
                <span
                  className="block h-full rounded-full bg-[#FF7A1A]"
                  style={{ width: `${porcentaje}%` }}
                />
              </span>
              <span aria-hidden="true" className="text-right tabular-nums">
                {cantidad}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="col-span-2 mt-3 text-xs text-zinc-500">
        Solo pueden reseñar clientes que pidieron y pagaron este platillo.
      </p>
    </div>
  );
}
