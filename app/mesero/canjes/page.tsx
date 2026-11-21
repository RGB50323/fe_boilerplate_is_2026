import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerificarCupon } from "@/components/lealtad/verificar-cupon";
import { obtenerUsuarioActual } from "@/lib/usuario";

export const metadata: Metadata = { title: "Canje de puntos | Los Burle" };

export default async function CanjesMeseroPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?next=/mesero/canjes");
  if (usuario.rol !== "MESERO") redirect("/menu");
  return <VerificarCupon />;
}
