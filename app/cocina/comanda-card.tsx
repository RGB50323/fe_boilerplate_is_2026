import { Badge } from "@/components/ui/badge";
import {
  UMBRAL_RETRASO_MIN,
  estaRetrasado,
  formatearHora,
  minutosDeEspera,
  textoDestino,
  textoMinutos,
  textoNumero,
} from "@/lib/cocina/pedidos";
import type { PedidoEnTablero } from "@/lib/cocina/tipos";

type Props = {
  pedido: PedidoEnTablero;
  ahora: number;
  umbralMin?: number;
};

export function ComandaCard({
  pedido,
  ahora,
  umbralMin = UMBRAL_RETRASO_MIN,
}: Props) {
  const espera = minutosDeEspera(pedido, ahora);
  const retrasado = estaRetrasado(pedido, ahora, umbralMin);
  const destino = textoDestino(pedido);
  const numero = textoNumero(pedido);

  return (
    <article
      aria-label={`Pedido ${numero}, ${destino}${retrasado ? ", retrasado" : ""}`}
      data-retrasado={retrasado}
      className={`flex h-full flex-col rounded-2xl border-4 bg-black p-5 ${
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
              className={`rounded-lg bg-[#2b2b2f] px-4 py-3 ${hecho ? "opacity-50" : ""}`}
            >
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xl">
                <span className={hecho ? "line-through decoration-2" : ""}>
                  <span className="tabular-nums">{item.cantidad}</span> ×{" "}
                  {item.platillo}
                </span>
                {nuevo && (
                  <Badge variant="success" className="text-sm">
                    Nuevo
                  </Badge>
                )}
                {hecho && (
                  <span className="ml-auto text-base text-zinc-300">Listo</span>
                )}
              </p>
              {item.nota && (
                <p className="mt-1 text-lg text-orange-300">
                  <span aria-hidden="true">✎ </span>
                  <span className="sr-only">Nota: </span>
                  {item.nota}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
