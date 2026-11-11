import Image from "next/image";

type Props = {
  nombre: string;
  descripcion: string;
  precio: string;
  disponibilidad: string;
  imagenSrc: string | null;
};

function formatearPrecio(texto: string): string {
  const numero = Number(texto.trim().replace(",", "."));
  return texto.trim() !== "" && Number.isFinite(numero) && numero > 0
    ? `$${numero.toFixed(2)}`
    : "$0.00";
}

export function VistaPreviaPlatillo({
  nombre,
  descripcion,
  precio,
  disponibilidad,
  imagenSrc,
}: Props) {
  const disponible = Number(disponibilidad) > 0;

  return (
    <section aria-labelledby="vista-previa-titulo" className="grid gap-4">
      <div>
        <h2 id="vista-previa-titulo" className="text-2xl">
          Vista previa
        </h2>
        <p className="text-sm text-zinc-400">Así se verá en el menú</p>
      </div>

      <div className="grid justify-items-center gap-3 text-center">
        <div className="relative size-48">
          <div className="grid size-48 place-items-center overflow-hidden rounded-full bg-zinc-800">
            {imagenSrc ? (
              <Image
                src={imagenSrc}
                alt={nombre || "Vista previa del platillo"}
                width={192}
                height={192}
                unoptimized
                className="size-48 object-cover"
              />
            ) : (
              <span className="text-sm text-zinc-500">Sin imagen</span>
            )}
          </div>
          <span
            className={`absolute -left-2 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white ${
              disponible ? "bg-green-800" : "bg-red-900"
            }`}
          >
            {disponible ? "Disponible" : "Agotado"}
          </span>
          <span className="absolute -right-3 top-2 rounded-full border border-zinc-700 bg-black px-3 py-1 text-lg font-semibold text-white">
            {formatearPrecio(precio)}
          </span>
        </div>

        <h3 className="text-2xl font-semibold">
          {nombre.trim() || "Nombre del platillo"}
        </h3>
        <p className="max-w-xs text-sm text-zinc-200">
          {descripcion.trim() || "Descripción del platillo"}
        </p>
      </div>
    </section>
  );
}
