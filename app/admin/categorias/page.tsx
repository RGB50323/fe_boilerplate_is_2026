import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarCategorias } from "@/app/actions/categorias";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { CategoriasView } from "./categorias-view";

export const metadata: Metadata = {
  title: "Categorías | Los Burle",
};

export default async function CategoriasPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "GERENTE") redirect("/menu");

  const resultado = await listarCategorias();
  return (
    <CategoriasView
      inicial={resultado.ok ? resultado.datos : []}
      errorInicial={resultado.ok ? undefined : resultado.error}
    />
  );
}
