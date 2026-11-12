import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarPlatillos } from "@/app/actions/platillos";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { PlatillosView } from "./platillos-view";

export const metadata: Metadata = {
  title: "Platillos | Los Burle",
};

export default async function PlatillosPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const { guardado } = await searchParams;

  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "GERENTE" || usuario.sucursalId === null) {
    redirect("/menu");
  }

  const resultado = await listarPlatillos(usuario.sucursalId);
  if (!resultado.ok && resultado.sinSesion) redirect("/login");

  return (
    <PlatillosView
      sucursalId={usuario.sucursalId}
      inicial={resultado.ok ? resultado.datos : []}
      errorInicial={resultado.ok ? undefined : resultado.error}
      guardado={guardado === "1"}
    />
  );
}
