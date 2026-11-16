import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { obtenerReservacion } from "@/app/actions/edicion-reserva";
import { MarcoReservas } from "@/components/reservaciones/marco-reservas";
import { EditarReservaForm } from "./editar-reserva-form";

export const metadata: Metadata = {
  title: "Modificar reservación | Los Burle",
};
export default async function EditarReservaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resultado = await obtenerReservacion(id);
  if (resultado.sinSesion)
    redirect(
      "/login?next=" + encodeURIComponent(`/perfil/reservaciones/${id}/editar`),
    );
  return (
    <MarcoReservas
      titulo="Modificar reservación"
      descripcion="Ajustá la fecha, la hora o la cantidad de personas de tu visita."
    >
      {resultado.reserva ? (
        <EditarReservaForm
          key={resultado.reserva.version}
          reserva={resultado.reserva}
        />
      ) : (
        <div role="alert">
          <p>{resultado.error}</p>
          <Link
            href="/perfil/reservaciones"
            className="mt-4 inline-block text-orange-300"
          >
            Volver a mis reservaciones
          </Link>
        </div>
      )}
    </MarcoReservas>
  );
}
