import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { MenuView } from "./menu-view";

export const metadata: Metadata = {
  title: "Menú | Los Burle",
};

export default async function MenuPage() {
  const autenticado = Boolean(await getSession());
  const usuario = autenticado ? await obtenerUsuarioActual() : null;
  return (
    <MenuView
      autenticado={autenticado}
      esGerente={usuario?.rol === "GERENTE"}
      esMesero={usuario?.rol === "MESERO"}
    />
  );
}