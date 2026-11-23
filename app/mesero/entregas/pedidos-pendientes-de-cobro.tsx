import Link from "next/link";
import { redirect } from "next/navigation";
import { llamar } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { ActualizarCobrosPendientes } from "./actualizar-cobros-pendientes";

type PedidoPendienteDeCobro = {
  pedidoId: number;
  numero: string | null;
  mesa: number;
  puedeCobrar: boolean;
  pagoBloqueante: "PENDIENTE" | null;
  comprobanteId: number | null;
};

export async function PedidosPendientesDeCobro() {
  const resultado = await llamar<PedidoPendienteDeCobro[]>("mesero/pedidos-pendientes-de-cobro");
  if (!resultado.ok && resultado.sinSesion) redirect("/login");

  return (
    <section aria-labelledby="pedidos-pendientes-cobro" className="my-8 space-y-4">
      <h2 id="pedidos-pendientes-cobro" className="text-3xl">
        Pedidos pendientes de cobro
      </h2>
      {resultado.ok && resultado.datos.some((pedido) => pedido.pagoBloqueante === "PENDIENTE") && (
        <ActualizarCobrosPendientes />
      )}
      {!resultado.ok ? (
        <EmptyState mensaje="No pudimos cargar los pedidos pendientes de cobro" variante="error" />
      ) : resultado.datos.length === 0 ? (
        <EmptyState mensaje="No hay pedidos pendientes de cobro" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resultado.datos.map(({ pedidoId, numero, mesa, puedeCobrar, pagoBloqueante, comprobanteId }) => (
            <li key={pedidoId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
              <div>
                <p className="text-xl">Mesa {mesa}</p>
                <p className="text-zinc-300">{numero || `Pedido #${pedidoId}`}</p>
                {pagoBloqueante && (
                  <p className="text-sm text-zinc-300">Pago pendiente</p>
                )}
              </div>
              {(puedeCobrar || pagoBloqueante || comprobanteId !== null) && <Link
                href={`/mesero/pedidos/${pedidoId}/cobro`}
                prefetch={false}
                className="inline-flex min-h-11 items-center rounded-full bg-[#FF7A1A] px-5 py-2 font-semibold text-[#101012] hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400"
              >
                {comprobanteId !== null ? "Ver comprobante" : pagoBloqueante ? "Consultar pago" : "Cobrar"}
              </Link>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
