import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listarMesas, obtenerPedido } from "@/app/actions/pedidos";
import { PagoPedido } from "@/components/pagos/pago-pedido";
import { formatoPrecio } from "@/lib/menu";
import { subtotalItem } from "@/lib/seguimiento";
import { obtenerUsuarioActual } from "@/lib/usuario";

export const metadata: Metadata = { title: "Cobrar pedido | Los Burle" };

export default async function CobroMesaPage({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "MESERO" || usuario.sucursalId === null) redirect("/menu");

  const { id } = await params;
  const pedidoId = Number(id);
  if (!/^\d+$/.test(id) || pedidoId < 1 || pedidoId > 2147483647) notFound();

  const resultado = await obtenerPedido(pedidoId);
  if (!resultado.ok) {
    if (resultado.sinSesion) redirect("/login");
    return (
      <div className="mx-auto mt-8 max-w-2xl space-y-4">
        <p role="alert">{resultado.error}</p>
        <Link href="/menu" className="text-orange-300 underline">Volver al menú principal</Link>
      </div>
    );
  }
  const pedido = resultado.datos;
  if (pedido.mesaId === null) notFound();

  const mesas = await listarMesas(usuario.sucursalId);
  const mesa = mesas.ok ? mesas.datos.find((m) => m.id === pedido.mesaId) : undefined;

  return (
    <main className="mx-auto mt-8 grid max-w-2xl gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Cobrar pedido</h1>
        <p className="mt-2 text-zinc-300">
          {mesa ? `Mesa ${mesa.numero}` : `Mesa (ID ${pedido.mesaId})`} · {pedido.numero ?? `Pedido #${pedido.pedidoId}`}
        </p>
      </header>
      <section aria-label="Detalle del pedido" className="rounded-2xl border border-zinc-800 bg-[#18181b] p-6 sm:p-8">
        <ul className="grid gap-4">
          {pedido.items.map((item) => (
            <li key={item.itemId} className="flex justify-between gap-4">
              <span>{item.cantidad} × {item.nombre}</span>
              <span className="tabular-nums">{formatoPrecio(subtotalItem(item))}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-zinc-800 pt-4 text-xl font-semibold">Total {formatoPrecio(pedido.total)}</p>
      </section>
      <PagoPedido key={pedido.pedidoId} tipo="MESA" usuarioId={usuario.id} pedido={pedido} estadoPedido={pedido.estado} />
    </main>
  );
}
