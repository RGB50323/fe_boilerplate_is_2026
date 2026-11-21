import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PanelGerente } from "@/components/admin/panel-gerente";
import { ROLES_DASHBOARD, getUsuarioActual } from "@/lib/session";

export default async function BeneficiosLayout({
  children,
}: {
  children: ReactNode;
}) {
  const resultado = await getUsuarioActual();
  if (resultado.estado !== "ok") redirect("/login?next=/admin/beneficios");
  if (!ROLES_DASHBOARD.includes(resultado.usuario.rol)) redirect("/menu");
  return (
    <PanelGerente
      esGerenteGeneral={resultado.usuario.rol === "GERENTE_GENERAL"}
    >
      {children}
    </PanelGerente>
  );
}
