"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { fechaLealtad, type Cupon } from "@/lib/lealtad";

// El código se puede volver a abrir desde Mis cupones hasta que se use o venza
export function ModalCupon({
  cupon,
  correo,
  onCerrar,
}: {
  cupon: Cupon;
  correo: string;
  onCerrar: () => void;
}) {
  return (
    <Modal abierto titulo={cupon.beneficio.nombre} onCerrar={onCerrar}>
      <p className="break-all text-sm text-zinc-300">Cuenta: {correo}</p>
      {cupon.estado === "PENDIENTE" ? (
        <>
          <p className="mt-4">Presenta este código a un empleado.</p>
          <p className="mt-3 break-all rounded-xl border border-orange-500/40 bg-orange-950/30 px-4 py-3 font-mono text-xl font-semibold text-orange-200">
            {cupon.codigo}
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            Vence el {fechaLealtad.format(new Date(cupon.expiraEn))}
          </p>
          <p className="text-sm text-zinc-400">
            También lo encuentras en Mis cupones.
          </p>
        </>
      ) : (
        <p role="status" className="mt-4 text-orange-200">
          {cupon.estado === "UTILIZADO"
            ? "Este cupón ya fue utilizado."
            : "El cupón ha expirado."}
        </p>
      )}
      <Button className="mt-5" onClick={onCerrar}>
        Cerrar
      </Button>
    </Modal>
  );
}
