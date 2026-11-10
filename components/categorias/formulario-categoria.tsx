"use client";

import { useState, type FormEvent } from "react";
import { FieldError } from "@/components/ui/error";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { validarNombre } from "@/lib/categorias";

type Props = {
  abierto: boolean;
  categoria?: { id: number; nombre: string } | null;
  onCerrar: () => void;
  onGuardar: (nombre: string) => Promise<string | undefined>;
};

export function FormularioCategoria(props: Props) {
  if (!props.abierto) return null;
  return <Contenido {...props} />;
}

function Contenido({ categoria, onCerrar, onGuardar }: Props) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const invalido = validarNombre(nombre);
    if (invalido) {
      setError(invalido);
      return;
    }
    setGuardando(true);
    setError(undefined);
    const mensaje = await onGuardar(nombre.trim());
    setGuardando(false);
    if (mensaje) setError(mensaje);
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={categoria ? "Renombrar categoría" : "Nueva categoría"}
    >
      <form onSubmit={enviar} noValidate className="grid gap-5">
        <div className="grid gap-1">
          <label
            htmlFor="nombre-categoria"
            className="text-sm font-medium text-orange-200"
          >
            Nombre *
          </label>
          <Input
            id="nombre-categoria"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la categoría"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "nombre-categoria-error" : undefined}
            disabled={guardando}
          />
          <FieldError id="nombre-categoria-error" message={error} />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Aceptar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
