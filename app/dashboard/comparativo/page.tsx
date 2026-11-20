import type { Metadata } from "next";
import { listarSucursales } from "@/app/actions/reservaciones";
import { motivoSinAcceso } from "@/lib/dashboard-acceso";
import { DashboardSinAcceso } from "../sin-acceso";
import { ComparativoView } from "./comparativo-view";

export const metadata: Metadata = {
  title: "Comparativo de sucursales",
};

export default async function ComparativoPage() {
  const motivo = await motivoSinAcceso();
  if (motivo) return <DashboardSinAcceso motivo={motivo} />;

  const { sucursales, error } = await listarSucursales();
  if (error) return <DashboardSinAcceso motivo="error" />;

  return <ComparativoView sucursales={sucursales} />;
}
