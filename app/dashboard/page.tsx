import type { Metadata } from "next";
import { usarDatosDePrueba } from "@/lib/dashboard-datos-prueba";
import { getUsuarioActual, ROL_GERENTE_GENERAL } from "@/lib/session";
import { DashboardView } from "./dashboard-view";
import { DashboardSinAcceso } from "./sin-acceso";

export const metadata: Metadata = {
  title: "Dashboard de ventas",
};

export default async function DashboardPage() {
  const usuario = await getUsuarioActual();

  if (usuario.estado === "sin-sesion") {
    return <DashboardSinAcceso motivo="sin-sesion" />;
  }
  if (usuario.estado === "ok" && usuario.usuario.rol !== ROL_GERENTE_GENERAL) {
    return <DashboardSinAcceso motivo="sin-acceso" />;
  }
  
  if (usuario.estado === "error" && !usarDatosDePrueba()) {
    return <DashboardSinAcceso motivo="error" />;
  }

  return <DashboardView />;
}
