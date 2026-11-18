import {
    etiquetaFranja,
    formatoMoneda,
    franjasPico,
    type HorarioPicoSucursal,
  } from "@/lib/dashboard";
  

  export function GraficoFranjas({ sucursal }: { sucursal: HorarioPicoSucursal }) {
    const franjas = [...sucursal.franjas].sort((a, b) => a.hora - b.hora);
    const maximo = Math.max(0, ...franjas.map((f) => f.ventas));
    const pico = franjasPico(franjas);
    const tituloId = `franjas-${sucursal.sucursalId}`;
  
    return (
      <article
        aria-labelledby={tituloId}
        className="rounded-2xl border border-zinc-800 bg-[#18181b] p-4 sm:p-5"
      >
        <h3 id={tituloId} className="mb-4 text-xl text-zinc-100">
          {sucursal.nombre}
        </h3>
  
        {maximo === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">
            Sin ventas en esta selección.
          </p>
        ) : (
          <>
            <ol
              aria-label={`Ventas por franja horaria en ${sucursal.nombre}`}
              className="flex h-44 items-end gap-0.5 border-b border-zinc-700"
            >
              {franjas.map((f) => {
                const puesto = pico.indexOf(f.hora) + 1;
                const alto = maximo ? (f.ventas / maximo) * 100 : 0;
                const etiqueta = `${etiquetaFranja(f.hora)}: ${formatoMoneda(f.ventas)}${
                  puesto ? `, franja pico número ${puesto}` : ""
                }`;
                return (
                  <li
                    key={f.hora}
                    tabIndex={0}
                    aria-label={etiqueta}
                    className="group relative flex h-full min-w-0 flex-1 flex-col justify-end outline-none"
                  >
                    {/* Tooltip al pasar el mouse o con el teclado */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-zinc-700 bg-[#262626] px-3 py-2 text-xs text-zinc-100 shadow-lg group-hover:block group-focus-visible:block"
                    >
                      <span className="block text-zinc-400">{etiquetaFranja(f.hora)}</span>
                      {formatoMoneda(f.ventas)}
                    </span>
                    {puesto > 0 && (
                      <span
                        aria-hidden="true"
                        className="mb-1 text-center text-xs font-semibold text-orange-200"
                      >
                        {puesto}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      style={{ height: `${Math.max(alto, f.ventas > 0 ? 2 : 0)}%` }}
                      className={`block w-full rounded-t-[4px] transition-colors group-focus-visible:outline-2 group-focus-visible:outline-orange-400 ${
                        puesto
                          ? "bg-[#FF7A1A] group-hover:bg-orange-400"
                          : "bg-[#FF7A1A]/30 group-hover:bg-[#FF7A1A]/50"
                      }`}
                    />
                  </li>
                );
              })}
            </ol>
  
            {/* Eje horizontal: hora de inicio de cada franja */}
            <div aria-hidden="true" className="mt-1 flex gap-0.5">
              {franjas.map((f) => (
                <span
                  key={f.hora}
                  className="min-w-0 flex-1 text-center text-[11px] tabular-nums text-zinc-400"
                >
                  {f.hora}
                </span>
              ))}
            </div>
  
            <p className="mt-4 mb-2 text-sm text-zinc-400">Franjas con más ventas</p>
            <ol className="space-y-1.5 text-sm">
              {pico.map((hora, i) => (
                <li key={hora} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="grid size-5 place-items-center rounded-full bg-[#FF7A1A] text-xs font-semibold text-[#101012]"
                    >
                      {i + 1}
                    </span>
                    {etiquetaFranja(hora)}
                  </span>
                  <span className="tabular-nums text-zinc-300">
                    {formatoMoneda(franjas.find((f) => f.hora === hora)?.ventas ?? 0)}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </article>
    );
  }
  