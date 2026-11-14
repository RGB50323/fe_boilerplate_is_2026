import { formatoPromedio, textoTotal } from "@/lib/resenas";
import { Estrellas } from "./estrellas";

// Calificación compacta de la tarjeta; si hay onClick abre las reseñas
export function CalificacionPlatillo({
  promedio,
  total,
  onClick,
}: {
  promedio: number | null | undefined;
  total: number;
  onClick?: () => void;
}) {
  const sinResenas = !total || promedio == null;

  const contenido = sinResenas ? (
    <span className="text-zinc-400">Sin reseñas aún</span>
  ) : (
    <>
      <Estrellas valor={promedio} />
      <span className="font-semibold text-zinc-100">
        {formatoPromedio(promedio)}
      </span>
      <span className="text-zinc-400">· {textoTotal(total)}</span>
    </>
  );

  if (!onClick) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm">{contenido}</p>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        sinResenas
          ? "Ver reseñas, este platillo aún no tiene"
          : `Calificación ${formatoPromedio(promedio)} de 5, ver ${textoTotal(total)}`
      }
      className="group inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm transition-colors hover:bg-zinc-800/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
    >
      {contenido}
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-4 fill-none stroke-zinc-500 stroke-2 transition-transform group-hover:translate-x-0.5 group-hover:stroke-[#FF7A1A] motion-reduce:transition-none"
      >
        <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
