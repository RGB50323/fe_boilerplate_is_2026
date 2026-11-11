import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarCategorias } from "@/app/actions/categorias";
import { FormularioPlatillo } from "@/components/platillos/formulario-platillo";
import { obtenerUsuarioActual } from "@/lib/usuario";

export const metadata: Metadata = {
  title: "Nuevo platillo | Los Burle",
};

export default async function NuevoPlatilloPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "GERENTE" || usuario.sucursalId === null) {
    redirect("/menu");
  }

  const resultado = await listarCategorias();
  const categorias = resultado.ok
    ? resultado.datos
        .filter((categoria) => categoria.activa)
        .map(({ id, nombre }) => ({ id, nombre }))
    : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <FormularioPlatillo
        sucursalId={usuario.sucursalId}
        categorias={categorias}
      />
    </main>
  );
}