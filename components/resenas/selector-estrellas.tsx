"use client";

import { useId } from "react";

const RUTA =
  "M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z";

// Radios nativos con forma de estrella: teclado y lector de pantalla incluidos
export function SelectorEstrellas({
  valor,
  onCambiar,
  disabled = false,
}: {
  valor: number;
  onCambiar: (estrellas: number) => void;
  disabled?: boolean;
}) {
  const nombre = useId();
  return (
    <fieldset disabled={disabled} className="disabled:opacity-60">
      <legend className="text-sm text-zinc-300">Tu calificación</legend>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name={nombre}
              value={n}
              checked={valor === n}
              onChange={() => onCambiar(n)}
              aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
              className="peer sr-only"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className={`size-10 rounded-md transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-orange-400 ${
                n <= valor
                  ? "fill-[#FF7A1A]"
                  : "fill-zinc-700 hover:fill-zinc-500"
              }`}
            >
              <path d={RUTA} />
            </svg>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
