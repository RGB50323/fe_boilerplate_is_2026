import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PanelAlertas } from "@/components/inventario/panel-alertas";
import { obtenerUsuarioActual } from "@/lib/usuario";

export const metadata: Metadata = {
  title: "Alertas de inventario | Los Burle",
};

export default async function AlertasInventarioPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "GERENTE" || usuario.sucursalId === null) {
    redirect("/menu");
  }

  return <PanelAlertas />;
}
