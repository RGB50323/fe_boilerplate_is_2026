import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { listarCategoriasActivas } from "@/app/actions/categorias";
import { obtenerPlatillo } from "@/app/actions/platillos";
import { FormularioPlatillo } from "@/components/platillos/formulario-platillo";
import { PLATILLO_NO_EXISTE } from "@/lib/platillos";
import { obtenerUsuarioActual } from "@/lib/usuario";

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

  const [resultado, categorias] = await Promise.all([
    obtenerPlatillo(platilloId),
    listarCategoriasActivas(),
  ]);

  if (!resultado.ok) {
    if (resultado.sinSesion) redirect("/login");
    if (resultado.error === PLATILLO_NO_EXISTE) notFound();
    return (
      <main className="py-8">
        <p role="alert" className="text-red-400">
          {resultado.error}
        </p>
      </main>
    );
  }

  const platillo = resultado.datos;
  const activas = categorias.ok
    ? categorias.datos.map(({ id: categoriaId, nombre }) => ({
        id: categoriaId,
        nombre,
      }))
    : [];
  const opciones = activas.some((c) => c.id === platillo.categoriaId)
    ? activas
    : [
        ...activas,
        { id: platillo.categoriaId, nombre: platillo.categoriaNombre },
      ];

  return (
    <main className="py-8">
      <FormularioPlatillo
        sucursalId={usuario.sucursalId}
        categorias={opciones}
        platillo={platillo}
      />
    </main>
  );
}