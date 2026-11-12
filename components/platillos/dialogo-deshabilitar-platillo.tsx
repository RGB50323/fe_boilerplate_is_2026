"use client";

import { useState } from "react";
import { FieldError } from "@/components/ui/error";
import { Modal } from "@/components/ui/modal";

type Props = {
  platillo: { id: number; nombre: string } | null;
  onCerrar: () => void;
  onConfirmar: () => Promise<string | undefined>;
};

export function DialogoDeshabilitarPlatillo({
  platillo,
  onCerrar,
  onConfirmar,
}: Props) {
  if (!platillo) return null;
  return (
    <Contenido
      nombre={platillo.nombre}
      onCerrar={onCerrar}
      onConfirmar={onConfirmar}
    />
  );
}

function Contenido({
  nombre,
  onCerrar,
  onConfirmar,
}: {
  nombre: string;
  onCerrar: () => void;
  onConfirmar: () => Promise<string | undefined>;
}) {
  const [error, setError] = useState<string>();
  const [procesando, setProcesando] = useState(false);

  async function confirmar() {
    setProcesando(true);
    setError(undefined);
    const mensaje = await onConfirmar();
    setProcesando(false);
    if (mensaje) setError(mensaje);
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="¿Deshabilitar este platillo?"
      descripcion={`"${nombre}" dejará de mostrarse en el menú del cliente.`}
    >
      <div className="grid gap-5">
        <FieldError id="deshabilitar-platillo-error" message={error} />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={procesando}
            className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={procesando}
            className="cursor-pointer rounded-full bg-[#FF7A1A] px-5 py-2 text-sm font-semibold text-[#101012] transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {procesando ? "Deshabilitando..." : "Aceptar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
