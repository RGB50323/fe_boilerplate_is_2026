import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { MarcoReservas } from "@/components/reservaciones/marco-reservas";
import { rutaRetorno } from "@/lib/retorno-login";
import { MisReservacionesView } from "./mis-reservaciones-view";

export const metadata: Metadata = { title: "Mis reservaciones | Los Burle" };
export default async function MisReservacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ reservacion?: string | string[] }>;
}) {
  const { reservacion } = await searchParams;
  // Llega desde una notificación de H26
  const destacada =
    typeof reservacion === "string" && /^R-\d+$/.test(reservacion)
      ? reservacion
      : undefined;
  // Sin sesión, el login regresa a la misma reservación
  if (!(await getSession())) redirect(`/login?next=${rutaRetorno(destacada)}`);
  return (
    <MarcoReservas
      titulo="Mis reservaciones"
      descripcion="Tu espacio personal para consultar las visitas que reservaste con esta cuenta."
    >
      <MisReservacionesView destacada={destacada} />
    </MarcoReservas>
  );
}
