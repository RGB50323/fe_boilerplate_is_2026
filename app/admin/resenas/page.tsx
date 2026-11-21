import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SIN_PERMISO_SECCION } from "@/lib/resenas";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { ModeracionView } from "./moderacion-view";

export const metadata: Metadata = {
  title: "Moderar reseñas | Los Burle",
};

export default async function ModeracionResenasPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "GERENTE") redirect("/menu");

  // H24: solo el gerente modera las reseñas de su sucursal
  if (usuario.sucursalId === null) {
    return (
      <main className="py-8">
        <p
          role="alert"
          className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7 text-red-200"
        >
          {SIN_PERMISO_SECCION}
        </p>
      </main>
    );
  }

  return <ModeracionView />;
}
