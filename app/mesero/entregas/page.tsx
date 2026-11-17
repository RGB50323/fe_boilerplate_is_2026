import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { EntregasView } from "./entregas-view";

export const metadata: Metadata = {
  title: "Platillos por entregar | Los Burle",
};

export default async function EntregasPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "MESERO" || usuario.sucursalId === null) {
    redirect("/menu");
  }

  return <EntregasView />;
}
