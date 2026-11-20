import { UMBRAL_ATENCION, type Comparativo } from "@/lib/comparativo";
import { formatoMoneda } from "@/lib/dashboard";


export function GraficoComparativo({ comparativo }: { comparativo: Comparativo }) {
  const { filas, promedio, umbral } = comparativo;
  const escala = Math.max(promedio, ...filas.map((f) => f.ventas)) * 1.15 || 1;
  const alto = (valor: number) => `${(valor / escala) * 100}%`;
  const porcentaje = Math.round(UMBRAL_ATENCION * 100);

  return (
    <figure className="font-sans">
      <figcaption className="sr-only">
        Ventas por sucursal. Promedio {formatoMoneda(promedio)}; umbral de atención{" "}
        {formatoMoneda(umbral)}.
      </figcaption>

      <div className="relative h-72">
        {/* Líneas de referencia */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-zinc-200/80"
            style={{ bottom: alto(promedio) }}
          >
            <span className="absolute bottom-1 left-0 text-xs leading-tight text-zinc-200">
              Promedio
              <span className="block font-semibold tabular-nums">{formatoMoneda(promedio)}</span>
            </span>
          </div>
          <div
            className="absolute inset-x-0 border-t-2 border-dashed border-red-400/80"
            style={{ bottom: alto(umbral) }}
          >
            <span className="absolute top-1 left-0 text-xs leading-tight text-red-300">
              Umbral −{porcentaje} %
              <span className="block font-semibold tabular-nums">{formatoMoneda(umbral)}</span>
            </span>
          </div>
        </div>

        {/* Barras */}
        <ol
          aria-label="Ventas por sucursal"
          className="absolute inset-y-0 right-0 left-24 flex items-end gap-4 border-b border-zinc-600 sm:left-32 sm:gap-10"
        >
          {filas.map((f) => (
            <li
              key={f.sucursalId}
              aria-label={`${f.nombre}: ${formatoMoneda(f.ventas)}${
                f.requiereAtencion ? ", requiere atención" : ""
              }`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span aria-hidden="true" className="relative z-10 mb-1 rounded bg-[#2b2b2f] px-1 text-xs tabular-nums text-zinc-200">
                {formatoMoneda(f.ventas)}
              </span>
              <span
                aria-hidden="true"
                style={{ height: alto(f.ventas) }}
                className={`block w-full max-w-48 rounded-t-[4px] ${
                  f.requiereAtencion ? "bg-red-500" : "bg-[#FF7A1A]"
                }`}
              />
            </li>
          ))}
        </ol>
      </div>

      <div aria-hidden="true" className="ml-24 flex gap-4 pt-2 sm:ml-32 sm:gap-10">
        {filas.map((f) => (
          <span key={f.sucursalId} className="min-w-0 flex-1 truncate text-center text-sm text-zinc-300">
            {f.nombre}
          </span>
        ))}
      </div>
    </figure>
  );
}
