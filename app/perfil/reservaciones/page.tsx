import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { MarcoReservas } from "@/components/reservaciones/marco-reservas";
import { MisReservacionesView } from "./mis-reservaciones-view";

export const metadata: Metadata = { title: "Mis reservaciones | Los Burle" };
export default async function MisReservacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ reservacion?: string | string[] }>;
}) {
  if (!(await getSession())) redirect("/login?next=%2Fperfil%2Freservaciones");
  const { reservacion } = await searchParams;
  // Llega desde una notificación de H26
  const destacada =
    typeof reservacion === "string" && /^R-\d+$/.test(reservacion)
      ? reservacion
      : undefined;
  return (
    <MarcoReservas
      titulo="Mis reservaciones"
      descripcion="Tu espacio personal para consultar las visitas que reservaste con esta cuenta."
    >
      <MisReservacionesView destacada={destacada} />
    </MarcoReservas>
  );
}
