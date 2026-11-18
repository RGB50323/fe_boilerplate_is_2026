import type { MotivoSinAcceso } from "@/app/dashboard/sin-acceso";
import { usarDatosDePrueba } from "@/lib/dashboard-datos-prueba";
import { getUsuarioActual, ROL_GERENTE_GENERAL } from "@/lib/session";

export async function motivoSinAcceso(): Promise<MotivoSinAcceso | null> {
  const usuario = await getUsuarioActual();

  if (usuario.estado === "sin-sesion") return "sin-sesion";
  if (usuario.estado === "ok" && usuario.usuario.rol !== ROL_GERENTE_GENERAL) {
    return "sin-acceso";
  }

  if (usuario.estado === "error" && !usarDatosDePrueba()) return "error";

  return null;
}
