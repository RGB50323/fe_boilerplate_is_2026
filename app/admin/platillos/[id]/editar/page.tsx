import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { listarCategorias } from "@/app/actions/categorias";
import { FormularioPlatillo } from "@/components/platillos/formulario-platillo";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { listarPlatillos } from "@/app/actions/platillos";

export const metadata: Metadata = {
  title: "Editar platillo | Los Burle",
};

export default async function EditarPlatilloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const platilloId = Number(id);
  if (!Number.isInteger(platilloId) || platilloId < 1) notFound();

  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "GERENTE" || usuario.sucursalId === null) {
    redirect("/menu");
  }

  const [platillos, categorias] = await Promise.all([
    listarPlatillos(usuario.sucursalId),
    listarCategorias(),
  ]);

  if (!platillos.ok) {
    if (platillos.sinSesion) redirect("/login");
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <p role="alert" className="text-red-400">
          {platillos.error}
        </p>
      </main>
    );
  }

  const platillo = platillos.datos.find((p) => p.id === platilloId);
  if (!platillo) notFound();

  const opciones = categorias.ok
    ? categorias.datos
        .filter((c) => c.activa || c.id === platillo.categoriaId)
        .map(({ id: categoriaId, nombre }) => ({ id: categoriaId, nombre }))
    : [{ id: platillo.categoriaId, nombre: platillo.categoriaNombre }];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <FormularioPlatillo
        sucursalId={usuario.sucursalId}
        categorias={opciones}
        platillo={platillo}
      />
    </main>
  );
}