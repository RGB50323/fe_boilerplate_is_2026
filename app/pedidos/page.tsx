import type { Metadata } from "next";
import { MarcoPedidos } from "@/components/pedidos/marco-pedidos";
import { MisPedidosView } from "@/components/pedidos/mis-pedidos-view";
import { soloClientes } from "@/lib/solo-clientes";

export const metadata: Metadata = { title: "Mis pedidos | Los Burle" };

export default async function MisPedidosPage() {
  await soloClientes();

  return (
    <MarcoPedidos titulo="Mis pedidos">
      <MisPedidosView />
    </MarcoPedidos>
  );
}