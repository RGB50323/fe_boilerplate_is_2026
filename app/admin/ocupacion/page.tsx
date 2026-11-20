import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SIN_PERMISO_OCUPACION, urlSocketOcupacion } from "@/lib/ocupacion";
import { getSession } from "@/lib/session";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { OcupacionView } from "./ocupacion-view";

export const metadata: Metadata = {
  title: "Ocupación proyectada | Los Burle",
};

export default async function OcupacionPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");
  if (usuario.rol !== "GERENTE") redirect("/menu");

  if (usuario.sucursalId === null) {
    return (
      <main className="py-8">
        <p
          role="alert"
          className="rounded-2xl border border-red-900/60 bg-red-950/20 p-7 text-red-200"
        >
          {SIN_PERMISO_OCUPACION}
        </p>
      </main>
    );
  }

  const token = (await getSession()) ?? "";
  const socketUrl = urlSocketOcupacion({
    API_URL: process.env.API_URL,
    SOCKET_URL: process.env.SOCKET_URL,
  });

  return (
    <OcupacionView
      token={token}
      socketUrl={socketUrl}
      sucursalId={usuario.sucursalId}
    />
  );
}
