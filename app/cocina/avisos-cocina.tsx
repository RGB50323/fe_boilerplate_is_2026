"use client";

import { useEffect } from "react";
import {
  UMBRAL_RETRASO_MIN,
  textoDestino,
  textoNumero,
} from "@/lib/cocina/pedidos";
import type { AvisoCocina } from "./use-tablero-cocina";

const DURACION_AVISO_MS = 6_000;

const ESTILOS = {
  nuevo: "border-green-800 bg-green-950 text-green-100",
  retrasado: "border-red-900 bg-red-950 text-red-100",
  reconectando: "border-amber-800 bg-amber-950 text-amber-100",
};

function texto({ tipo, pedido }: AvisoCocina): string {
  const referencia = `${textoNumero(pedido)} · ${textoDestino(pedido)}`;
  return tipo === "nuevo"
    ? `Nuevo pedido ${referencia}`
    : `Pedido con más de ${UMBRAL_RETRASO_MIN} min de espera: ${referencia}`;
}

function Aviso({
  aviso,
  onCerrar,
}: {
  aviso: AvisoCocina;
  onCerrar: (id: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onCerrar(aviso.id), DURACION_AVISO_MS);
    return () => window.clearTimeout(timer);
  }, [aviso.id, onCerrar]);

  return (
    <li
      className={`rounded-full border px-5 py-3 text-lg shadow-lg shadow-black/40 ${ESTILOS[aviso.tipo]}`}
    >
      {texto(aviso)}
    </li>
  );
}

type Props = {
  avisos: AvisoCocina[];
  reconectando: boolean;
  onCerrar: (id: number) => void;
};

export function AvisosCocina({ avisos, reconectando, onCerrar }: Props) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:left-auto sm:max-w-xl"
    >
      {reconectando && (
        <p
          className={`rounded-full border px-5 py-3 text-lg shadow-lg shadow-black/40 ${ESTILOS.reconectando}`}
        >
          Reconectando… el tablero se actualizará al volver
        </p>
      )}
      <ul className="flex flex-col items-end gap-3">
        {avisos.map((aviso) => (
          <Aviso key={aviso.id} aviso={aviso} onCerrar={onCerrar} />
        ))}
      </ul>
    </div>
  );
}
