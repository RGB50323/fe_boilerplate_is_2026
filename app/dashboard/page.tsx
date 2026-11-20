import type { Metadata } from "next";
import { listarSucursales } from "@/app/actions/reservaciones";
import { motivoSinAcceso } from "@/lib/dashboard-acceso";
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

  return <DashboardView sucursales={sucursales} />;
}
