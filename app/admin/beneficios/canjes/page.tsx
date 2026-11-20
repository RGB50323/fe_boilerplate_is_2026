import type { Metadata } from "next";
import { VerificarCupon } from "@/components/lealtad/verificar-cupon";

export const metadata: Metadata = { title: "Canje de puntos | Los Burle" };

export default function CanjesGerenciaPage() {
  return <VerificarCupon />;
}

