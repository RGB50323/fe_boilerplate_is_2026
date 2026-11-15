import type { Metadata } from "next";
import Link from "next/link";
import { obtenerSeguimiento } from "@/app/actions/pedidos";
import { MarcoPedidos } from "@/components/pedidos/marco-pedidos";
import { SeguimientoPedido } from "@/components/pedidos/seguimiento-pedido";
import { PEDIDO_NO_EXISTE } from "@/lib/seguimiento";

export const metadata: Metadata = {
  title: "Seguimiento de tu pedido | Los Burle",
};

export default async function SeguimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pedidoId = Number(id);
  const resultado =
    Number.isInteger(pedidoId) && pedidoId > 0
      ? await obtenerSeguimiento(pedidoId)
      : null;
  const error =
    resultado === null
      ? PEDIDO_NO_EXISTE
      : resultado.ok
        ? null
        : resultado.error;
  const sinSesion = resultado !== null && !resultado.ok && resultado.sinSesion;

  return (
    <MarcoPedidos titulo="Seguimiento de tu pedido">
      {resultado?.ok ? (
        <SeguimientoPedido inicial={resultado.datos} />
      ) : (
        <div
          role="alert"
          className="rounded-2xl border border-zinc-800 bg-[#18181b] p-8"
        >
          <p>{error}</p>
          <Link
            href={sinSesion ? "/login" : "/pedidos"}
            className="mt-5 inline-block text-orange-300 underline"
          >
            {sinSesion ? "Iniciar sesión para continuar" : "Ver mis pedidos"}
          </Link>
        </div>
      )}
    </MarcoPedidos>
  );
}
