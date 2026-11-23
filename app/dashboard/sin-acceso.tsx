"use client";

import { useTransition } from "react";
import { Fraunces } from "next/font/google";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
});

export type MotivoSinAcceso = "sin-acceso" | "sin-sesion" | "error";

const MENSAJES: Record<MotivoSinAcceso, { mensaje: string; descripcion: string }> = {
  "sin-acceso": {
    mensaje: "No tenés acceso al dashboard de ventas",
    descripcion: "Esta sección es para el gerente general y los gerentes de sucursal.",
  },
  "sin-sesion": {
    mensaje: "Tu sesión expiró",
    descripcion: "Iniciá sesión de nuevo para continuar.",
  },
  error: {
    mensaje: "No pudimos verificar tu acceso",
    descripcion: "Intentá de nuevo en unos minutos.",
  },
};

export function DashboardSinAcceso({
  motivo,
  soloGerenteGeneral = false,
}: {
  motivo: MotivoSinAcceso;
  soloGerenteGeneral?: boolean;
}) {
  const router = useRouter();
  const [saliendo, salir] = useTransition();
  const { mensaje } = MENSAJES[motivo];
  const descripcion =
    motivo === "sin-acceso" && soloGerenteGeneral
      ? "Esta sección es solo para el gerente general."
      : MENSAJES[motivo].descripcion;

  return (
    <main
      className={`${fraunces.className} grid min-h-dvh place-items-center bg-[#101012] px-4 text-zinc-100 scheme-dark`}
    >
      <EmptyState
        mensaje={mensaje}
        descripcion={descripcion}
        variante="error"
        className="w-full max-w-xl"
      >
        <div className="flex flex-wrap justify-center gap-3">
          {motivo === "sin-acceso" && (
            <Button onClick={() => router.push("/menu")}>Ir al menú</Button>
          )}
          {motivo === "sin-sesion" && (
            <Button
              disabled={saliendo}
              onClick={() =>
                salir(async () => {
                  await logout();
                  router.replace("/login");
                })
              }
            >
              Iniciar sesión
            </Button>
          )}
          {motivo === "error" && (
            <Button onClick={() => router.refresh()}>Reintentar</Button>
          )}
        </div>
      </EmptyState>
    </main>
  );
}
