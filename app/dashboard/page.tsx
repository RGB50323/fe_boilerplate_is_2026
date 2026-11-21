import type { Metadata } from "next";
import { listarSucursales } from "@/app/actions/reservaciones";
import { motivoSinAcceso } from "@/lib/dashboard-acceso";
import { getUsuarioActual, ROL_GERENTE } from "@/lib/session";
import { DashboardView } from "./dashboard-view";
import { DashboardSinAcceso } from "./sin-acceso";

export const metadata: Metadata = {
  title: "Dashboard de ventas",
};

export default async function DashboardPage() {
  const motivo = await motivoSinAcceso();
  if (motivo) return <DashboardSinAcceso motivo={motivo} />;

  const { sucursales, error } = await listarSucursales();
  if (error) return <DashboardSinAcceso motivo="error" />;

  const usuario = await getUsuarioActual();
  const sucursalFija =
    usuario.estado === "ok" && usuario.usuario.rol === ROL_GERENTE
      ? sucursales.find((s) => s.id === usuario.usuario.sucursalId)
      : undefined;

  return <DashboardView sucursales={sucursales} sucursalFija={sucursalFija} />;
}
