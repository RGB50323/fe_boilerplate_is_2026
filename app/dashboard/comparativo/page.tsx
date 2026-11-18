import type { Metadata } from "next";
import { motivoSinAcceso } from "@/lib/dashboard-acceso";
import { DashboardSinAcceso } from "../sin-acceso";
import { ComparativoView } from "./comparativo-view";

export const metadata: Metadata = {
  title: "Comparativo de sucursales",
};

// H29: solo el gerente general puede ver el comparativo.
export default async function ComparativoPage() {
  const motivo = await motivoSinAcceso();
  if (motivo) return <DashboardSinAcceso motivo={motivo} />;
  return <ComparativoView />;
}
