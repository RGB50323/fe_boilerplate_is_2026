"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { fechaLealtad, type Cupon } from "@/lib/lealtad";

export function ModalCupon({ cupon, correo, onCerrar }: {
  cupon: Cupon;
  correo: string;
  onCerrar: () => void;
}) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const limite = Date.parse(cupon.expiraEn);
    function actualizar() {
      const segundos = Math.max(0, Math.ceil((limite - Date.now()) / 1000));
      setRestante(segundos);
      if (segundos === 0) window.clearInterval(intervalo);
    }
    const inicial = window.setTimeout(actualizar, 0);
    const intervalo = window.setInterval(actualizar, 250);
    return () => {
      window.clearTimeout(inicial);
      window.clearInterval(intervalo);
    };
  }, [cupon.expiraEn]);

  const vigente = restante !== null && restante > 0 && !cupon.utilizadoEn;
  return (
    <Modal abierto titulo={cupon.beneficio.nombre} onCerrar={onCerrar}>
      <p className="break-all text-sm text-zinc-300">Cuenta: {correo}</p>
      {vigente ? (
        <>
          <p className="mt-4">Presenta este código a un empleado.</p>
          <p className="mt-3 break-all rounded-xl border border-orange-500/40 bg-orange-950/30 px-4 py-3 font-mono text-xl font-semibold text-orange-200">
            {cupon.codigo}
          </p>
          <p role="timer" aria-label="Tiempo restante" className="mt-3 tabular-nums">
            {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, "0")}
          </p>
          <p className="text-sm text-zinc-400">Vence el {fechaLealtad.format(new Date(cupon.expiraEn))}.</p>
        </>
      ) : (
        <p role="status" className="mt-4 text-orange-200">
          {cupon.utilizadoEn ? "Este cupón ya fue utilizado." : restante === 0 ? "El cupón ha expirado." : "Calculando vigencia…"}
        </p>
      )}
      <Button className="mt-5" onClick={onCerrar}>Cerrar</Button>
    </Modal>
  );
}

