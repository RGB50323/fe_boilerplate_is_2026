import { ContadorAlertas } from "@/components/inventario/contador-alertas";
import { CampanaNotificaciones } from "@/components/notificaciones/campana-notificaciones";
import { EnlaceConSucursal as Link } from "@/components/ui/enlace-con-sucursal";
import { Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import { ENLACE_BENEFICIOS } from "@/lib/roles";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

const ENLACE = "py-2 text-sm text-zinc-300 underline underline-offset-4 hover:text-white";

export const ENLACES_GERENTE = [
  { href: "/admin/ocupacion", texto: "Ocupación" },
  { href: "/admin/calificaciones", texto: "Calificaciones" },
  { href: "/admin/resenas", texto: "Moderar reseñas" },
  { href: "/admin/inventario", texto: "Inventario" },
  { href: "/admin/platillos", texto: "Platillos" },
  { href: "/cocina", texto: "Cocina" },
  { href: "/dashboard", texto: "Dashboard" },
  ENLACE_BENEFICIOS,
  { href: "/menu", texto: "Ver menú" },
];

const ENLACES_GERENTE_GENERAL = ENLACES_GERENTE.filter(
  ({ href }) => ["/dashboard", "/menu", ENLACE_BENEFICIOS.href].includes(href),
);

export function PanelGerente({
  children,
  gerenteGeneral = false,
}: {
  children: ReactNode;
  gerenteGeneral?: boolean;
}) {
  const enlaces = gerenteGeneral ? ENLACES_GERENTE_GENERAL : ENLACES_GERENTE;
  return (
    <div
      className={`${fraunces.className} min-h-dvh bg-[#101012] px-4 pb-16 pt-6 text-zinc-100 scheme-dark sm:px-8 lg:px-15`}
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-zinc-700 pb-4">
          <div className="flex items-baseline gap-4">
            <Link
              href="/menu"
              className="text-2xl text-[#FF7A1A] hover:text-orange-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-400 sm:text-3xl"
            >
              Los Burle
            </Link>
            <p className="text-lg text-zinc-400 sm:text-2xl">Panel de gerente</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <nav aria-label="Panel de gerente" className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {enlaces.map((e) => (
                <Link key={e.href} href={e.href} className={ENLACE}>
                  {e.texto}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              {!gerenteGeneral && <ContadorAlertas />}
              <CampanaNotificaciones enLinea />
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
