import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listarBeneficios } from "@/app/actions/beneficios";
import { PanelGerente } from "@/components/admin/panel-gerente";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ENLACE_BENEFICIOS,
  LOGIN_BENEFICIOS,
  ROLES_BENEFICIOS,
} from "@/lib/roles";
import { getUsuarioActual } from "@/lib/session";
import { BeneficiosView } from "./beneficios-view";

export const metadata: Metadata = { title: "Beneficios | Los Burle" };

export default async function BeneficiosPage() {
  const acceso = await getUsuarioActual();
  if (acceso.estado === "sin-sesion") redirect(LOGIN_BENEFICIOS);
  if (acceso.estado === "error") {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          mensaje="No se pudo verificar tu sesión. Intenta de nuevo."
          variante="error"
        >
          <Link className="underline" href={ENLACE_BENEFICIOS.href}>
            Volver a cargar
          </Link>
        </EmptyState>
      </main>
    );
  }
  if (!ROLES_BENEFICIOS.includes(acceso.usuario.rol)) redirect("/menu");

  const inicial = await listarBeneficios();
  return (
    <PanelGerente gerenteGeneral={acceso.usuario.rol === "GERENTE_GENERAL"}>
      <BeneficiosView inicial={inicial} />
    </PanelGerente>
  );
}
