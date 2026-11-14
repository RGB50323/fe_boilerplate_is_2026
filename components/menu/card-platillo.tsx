import Image from "next/image";
import { formatoPrecio, type Platillo } from "@/lib/menu";
import { Badge } from "@/components/ui/badge";
import { CalificacionPlatillo } from "@/components/resenas/calificacion-platillo";

export function CardPlatillo({
  platillo,
  onVerResenas,
}: {
  platillo: Platillo;
  onVerResenas?: () => void;
}) {
  return (
    <article className="flex flex-col items-center text-center">
      <div className="relative">
        <div className="relative size-56 overflow-hidden rounded-full bg-[#2b2b2f]">
          {platillo.imagenUrl ? (
            <Image
              src={platillo.imagenUrl}
              alt=""
              fill
              sizes="224px"
              unoptimized
              className="object-contain p-4"
            />
          ) : (
            <svg
              aria-hidden="true"
              viewBox="0 0 80 80"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute inset-0 m-auto size-24 text-zinc-500"
            >
              <circle cx="40" cy="40" r="26" />
              <circle cx="40" cy="40" r="16" />
            </svg>
          )}
        </div>

        <Badge variant="success" className="absolute -left-2 top-2">
          Disponible
        </Badge>
        <span className="absolute -right-4 top-2 rounded-full border border-zinc-700 bg-[#101012] px-4 py-1 text-xl">
          {formatoPrecio(platillo.precio)}
        </span>
      </div>

      <h3 className="mt-4 text-2xl">{platillo.nombre}</h3>
      {platillo.totalResenas !== undefined && (
        <div className="mt-2">
          <CalificacionPlatillo
            promedio={platillo.promedio}
            total={platillo.totalResenas}
          />
        </div>
      )}
      {platillo.descripcion && (
        <p className="mt-2 max-w-xs text-sm text-zinc-300">
          {platillo.descripcion}
        </p>
      )}
      {onVerResenas && (
        <button
          type="button"
          onClick={onVerResenas}
          className="mt-3 cursor-pointer text-sm text-[#FF7A1A] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
        >
          Ver reseñas
        </button>
      )}
    </article>
  );
}