import { formatoPromedio } from "@/lib/resenas";
import { Estrellas } from "./estrellas";

export function CalificacionPlatillo({
  promedio,
  total,
}: {
  promedio: number | null | undefined;
  total: number;
}) {
  if (!total || promedio == null) {
    return <p className="text-sm text-zinc-400">Sin reseñas</p>;
  }

  return (
    <p
      className="flex items-center gap-2 text-sm text-zinc-200"
      aria-label={`Calificación ${formatoPromedio(promedio)} de 5, ${total} ${total === 1 ? "reseña" : "reseñas"}`}
    >
      <Estrellas valor={promedio} />
      <span>
        {formatoPromedio(promedio)} ({total})
      </span>
    </p>
  );
}
