import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { consultarCatalogo, consultarPuntos } from "@/app/actions/lealtad";
import { obtenerUsuarioActual } from "@/lib/usuario";
import { MisBeneficios } from "./mis-beneficios";

export const metadata: Metadata = { title: "Mis beneficios | Los Burle" };

export default async function BeneficiosPage() {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login?next=/perfil/beneficios");
  if (usuario.rol !== "CLIENTE") redirect("/menu");

  const [puntos, catalogo] = await Promise.all([consultarPuntos(), consultarCatalogo()]);
  return <MisBeneficios correo={usuario.email} puntosIniciales={puntos} catalogoInicial={catalogo} />;
}

