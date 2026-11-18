import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarSucursales } from "@/app/actions/reservaciones";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { InventarioView } from "./inventario-view";

export const metadata: Metadata = {
  title: "Inventario de insumos | Los Burle",
};

export default async function InventarioPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "GERENTE" || usuario.sucursalId === null) {
    redirect("/menu");
  }

  const { sucursales } = await listarSucursales();
  const sucursalNombre = sucursales.find((s) => s.id === usuario.sucursalId)?.nombre;

  return <InventarioView sucursalNombre={sucursalNombre} />;
}
