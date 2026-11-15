import type { Metadata } from "next";
import { MarcoPedidos } from "@/components/pedidos/marco-pedidos";
import { MisPedidosView } from "@/components/pedidos/mis-pedidos-view";

export const metadata: Metadata = { title: "Mis pedidos | Los Burle" };

export default function MisPedidosPage() {
  return (
    <MarcoPedidos titulo="Mis pedidos">
      <MisPedidosView />
    </MarcoPedidos>
  );
}