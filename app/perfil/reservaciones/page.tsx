import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { MarcoReservas } from "@/components/reservaciones/marco-reservas";
import { MisReservacionesView } from "./mis-reservaciones-view";

export const metadata: Metadata = { title: "Mis reservaciones | Los Burle" };
export default async function MisReservacionesPage() {
  if (!(await getSession())) redirect("/login?next=%2Fperfil%2Freservaciones");
  return (
    <MarcoReservas
      titulo="Mis reservaciones"
      descripcion="Tu espacio personal para consultar las visitas que reservaste con esta cuenta."
    >
      <MisReservacionesView />
    </MarcoReservas>
  );
}
