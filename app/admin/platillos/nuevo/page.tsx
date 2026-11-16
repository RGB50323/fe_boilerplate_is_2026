import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarCategoriasActivas } from "@/app/actions/categorias";
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

  const resultado = await listarCategoriasActivas();
  const categorias = resultado.ok
    ? resultado.datos.map(({ id, nombre }) => ({ id, nombre }))
    : [];

  return (
    <main className="py-8">
      <FormularioPlatillo
        sucursalId={usuario.sucursalId}
        categorias={categorias}
      />
    </main>
  );
}
