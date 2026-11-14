import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarMesas } from "@/app/actions/pedidos";
import { listarPlatillos } from "@/app/actions/platillos";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { PedidoView } from "./pedido-view";

export const metadata: Metadata = {
  title: "Registrar pedido | Los Burle",
};

export default async function PedidoPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "MESERO" || usuario.sucursalId === null) {
    redirect("/menu");
  }

  const [platillos, mesas] = await Promise.all([
    listarPlatillos(usuario.sucursalId),
    listarMesas(usuario.sucursalId),
  ]);
  if (
    (!platillos.ok && platillos.sinSesion) ||
    (!mesas.ok && mesas.sinSesion)
  ) {
    redirect("/login");
  }

  const error = !platillos.ok
    ? platillos.error
    : !mesas.ok
      ? mesas.error
      : undefined;

  return (
    <PedidoView
      sucursalId={usuario.sucursalId}
      platillosIniciales={platillos.ok ? platillos.datos : []}
      mesasIniciales={mesas.ok ? mesas.datos : []}
      errorInicial={error}
    />
  );
}
