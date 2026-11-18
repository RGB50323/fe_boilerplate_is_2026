"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UMBRAL_RETRASO_MIN,
  estaRetrasado,
  formatearHora,
  horaListo,
  minutosDeEspera,
  textoDestino,
  textoMinutos,
  textoNumero,
} from "@/lib/cocina/pedidos";
import type { ItemPedidoCocina, PedidoEnTablero } from "@/lib/cocina/tipos";

type MarcarListo = (itemId: number, pedidoId: number) => Promise<void>;

type Props = {
  pedido: PedidoEnTablero;
  ahora: number;
  umbralMin?: number;
  onMarcarListo: MarcarListo;
};

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5 animate-spin motion-reduce:animate-none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function BotonListo({
  item,
  pedidoId,
  onMarcarListo,
}: {
  item: ItemPedidoCocina;
  pedidoId: number;
  onMarcarListo: MarcarListo;
}) {
  const [enviando, setEnviando] = useState(false);

  async function marcar() {
    if (enviando) return;
    setEnviando(true);
    try {
      await onMarcarListo(item.id, pedidoId);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Button
      onClick={marcar}
      disabled={enviando}
      aria-busy={enviando}
      aria-label={`Marcar ${item.cantidad} × ${item.platillo} como listo`}
      className="inline-flex min-h-11 min-w-22 shrink-0 items-center justify-center gap-2 text-lg"
    >
      {enviando && <Spinner />}
      Listo
    </Button>
  );
}

function EstadoHecho({ item }: { item: ItemPedidoCocina }) {
  if (item.estado === "ENTREGADO") {
    return (
      <Badge variant="neutral" className="shrink-0 whitespace-nowrap">
        Entregado
      </Badge>
    );
  }
  const hora = horaListo(item.listoEn);
  return (
    <Badge variant="success" className="shrink-0 whitespace-nowrap tabular-nums">
      Listo
      {hora && (
        <>
          {" "}
          <time dateTime={item.listoEn ?? undefined}>{hora}</time>
        </>
      )}
    </Badge>
  );
}

export function ComandaCard({
  pedido,
  ahora,
  umbralMin = UMBRAL_RETRASO_MIN,
  onMarcarListo,
}: Props) {
  const espera = minutosDeEspera(pedido, ahora);
  const retrasado = estaRetrasado(pedido, ahora, umbralMin);
  const destino = textoDestino(pedido);
  const numero = textoNumero(pedido);

  return (
    <article
      aria-label={`Pedido ${numero}, ${destino}${retrasado ? ", retrasado" : ""}`}
      data-retrasado={retrasado}
      className={`flex h-full flex-col rounded-2xl border-4 bg-black p-4 sm:p-5 ${
        retrasado ? "border-[#FF5A1F]" : "border-zinc-600"
      }`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-zinc-700 pb-4">
        <div className="min-w-0">
          <h2 className="text-3xl tabular-nums">{numero}</h2>
          <p className="mt-1 text-xl text-orange-200">
            {destino} · llegó{" "}
            <time dateTime={pedido.creadoEn} className="tabular-nums">
              {formatearHora(pedido.creadoEn)}
            </time>
          </p>
        </div>
        <Badge
          variant={retrasado ? "danger" : "neutral"}
          className="shrink-0 whitespace-nowrap text-base tabular-nums"
        >
          {retrasado && (
            <span aria-hidden="true" className="mr-1">
              ⚠
            </span>
          )}
          <span className="sr-only">Esperando </span>
          {textoMinutos(espera)}
          {retrasado && <span className="sr-only">, retrasado</span>}
        </Badge>
      </header>

      <ul className="mt-4 flex flex-col gap-3">
        {pedido.items.map((item) => {
          const hecho = item.estado !== "PENDIENTE";
          const nuevo = !hecho && pedido.itemsNuevos.includes(item.id);
          return (
            <li
              key={item.id}
              data-estado={item.estado}
              className={`flex items-center gap-3 rounded-lg bg-[#2b2b2f] py-2 pl-4 pr-2 ${
                hecho ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0 flex-1 py-1">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xl">
                  <span className={`wrap-break-word ${hecho ? "line-through decoration-2" : ""}`}>
                    <span className="tabular-nums">{item.cantidad}</span> ×{" "}
                    {item.platillo}
                  </span>
                  {nuevo && (
                    <Badge variant="success" className="text-sm">
                      Nuevo
                    </Badge>
                  )}
                </p>
                {item.nota && (
                  <p className="mt-1 text-lg text-orange-300">
                    <span aria-hidden="true">✎ </span>
                    <span className="sr-only">Nota: </span>
                    {item.nota}
                  </p>
                )}
              </div>
              {hecho ? (
                <EstadoHecho item={item} />
              ) : (
                <BotonListo item={item} pedidoId={pedido.id} onMarcarListo={onMarcarListo} />
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
