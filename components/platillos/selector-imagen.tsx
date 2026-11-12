"use client";

import { useRef, useState, type DragEvent } from "react";
import { FieldError } from "@/components/ui/error";

type Props = {
  subiendo: boolean;
  error?: string;
  onSeleccionar: (archivo: File) => void;
};

export function SelectorImagen({ subiendo, error, onSeleccionar }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);

  function soltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    if (subiendo) return;
    const archivo = e.dataTransfer.files[0];
    if (archivo) onSeleccionar(archivo);
  }

  return (
    <div className="grid gap-1">
      <label
        htmlFor="imagen-platillo"
        className="text-sm font-medium text-orange-200"
      >
        Imagen *
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={soltar}
        className={`grid justify-items-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 text-center ${
          arrastrando
            ? "border-[#FF7A1A] bg-[#2f2f2f]"
            : "border-zinc-600 bg-[#262626]"
        }`}
      >
        <p className="text-sm text-zinc-300">
          {subiendo
            ? "Subiendo imagen..."
            : "Arrastra y suelta una imagen JPG o PNG (máx. 2 MB)"}
        </p>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={subiendo}
          className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Elegir archivo
        </button>
        <input
          ref={input}
          id="imagen-platillo"
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          aria-describedby={error ? "imagen-platillo-error" : undefined}
          disabled={subiendo}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) onSeleccionar(archivo);
            e.target.value = "";
          }}
        />
      </div>
      <FieldError id="imagen-platillo-error" message={error} />
    </div>
  );
}
