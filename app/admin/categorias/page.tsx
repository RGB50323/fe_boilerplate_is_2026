import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  listarCategorias,
  listarCategoriasActivas,
} from "@/app/actions/categorias";
import type { Categoria } from "@/lib/categorias";
import { paginaVacia } from "@/lib/paginacion";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { CategoriasView } from "./categorias-view";

export const metadata: Metadata = {
  title: "Categorías | Los Burle",
};

export default async function CategoriasPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "GERENTE") redirect("/menu");

  const [resultado, activas] = await Promise.all([
    listarCategorias(1),
    listarCategoriasActivas(),
  ]);
  return (
    <CategoriasView
      inicial={resultado.ok ? resultado.datos : paginaVacia<Categoria>()}
      destinosIniciales={activas.ok ? activas.datos : []}
      errorInicial={resultado.ok ? undefined : resultado.error}
    />
  );
}