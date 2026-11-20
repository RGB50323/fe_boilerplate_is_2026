import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { MenuView } from "./menu-view";
import { listarSucursales } from "@/app/actions/reservaciones";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Menú | Los Burle",
};

export default async function MenuPage() {
  const autenticado = Boolean(await getSession());
  const usuario = autenticado ? await obtenerUsuarioActual() : null;

  const { sucursales, error } = await listarSucursales();

  if (error || sucursales.length === 0) {
    return (
      <main className="min-h-dvh bg-[#101012] p-8 text-zinc-100">
        <EmptyState
          mensaje={error ?? "Aún no hay sucursales disponibles."}
          variante={error ? "error" : undefined}
        />
      </main>
    );
  }

  return (
    <MenuView
      autenticado={autenticado}
      esGerente={usuario?.rol === "GERENTE"}
      esMesero={usuario?.rol === "MESERO"}
      esCocina={usuario?.rol === "COCINA"}
      esGerenteGeneral={usuario?.rol === "GERENTE_GENERAL"}
      sucursales={sucursales}
    />
  );
}
