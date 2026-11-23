import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { EntregasView } from "./entregas-view";
import { PedidosPendientesDeCobro } from "./pedidos-pendientes-de-cobro";

export const metadata: Metadata = {
  title: "Platillos por entregar | Los Burle",
};

export default async function EntregasPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "MESERO" || usuario.sucursalId === null) {
    redirect("/menu");
  }

  return (
    <>
      <Suspense fallback={<p className="my-8" role="status">Cargando pedidos pendientes de cobro…</p>}>
        <PedidosPendientesDeCobro />
      </Suspense>
      <EntregasView />
    </>
  );
}
