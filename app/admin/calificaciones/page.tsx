import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SIN_PERMISO_SECCION } from "@/lib/resenas";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { ReporteCalificacionesView } from "./reporte-view";

export const metadata: Metadata = {
  title: "Calificaciones | Los Burle",
};

export default async function CalificacionesPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");

  // H23: solo el gerente, y siempre de su propia sucursal
  if (usuario.rol !== "GERENTE" || usuario.sucursalId === null) {
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

  return <ReporteCalificacionesView />;
}
