import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { redirect } from "next/navigation";
import { urlSocketCocina } from "@/lib/cocina/pedidos";
import { ROLES_COCINA, obtenerSucursalId, tieneRolPermitido } from "@/lib/roles";
import { getSession } from "@/lib/session";
import { SUCURSALES } from "@/lib/sucursales";
import { TableroCocina } from "./tablero-cocina";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cocina | Los Burle",
};

export default async function CocinaPage() {
  const token = await getSession();
  if (!token) {
    redirect("/login");
  }
  if (!tieneRolPermitido(token, ROLES_COCINA)) {
    redirect("/menu");
  }

  const sucursalId = obtenerSucursalId(token);
  const sucursal =
    sucursalId === null
      ? null
      : (SUCURSALES.find((s) => s.id === sucursalId)?.nombre ??
        `Sucursal ${sucursalId}`);

  return (
    <main
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-32 pt-6 text-zinc-100 scheme-dark sm:px-8 lg:px-15`}
    >
      <TableroCocina
        socketUrl={urlSocketCocina({
          API_URL: process.env.API_URL,
          SOCKET_URL: process.env.SOCKET_URL,
        })}
        token={token}
        sucursal={sucursal}
      />
    </main>
  );
}
