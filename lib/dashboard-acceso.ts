import type { MotivoSinAcceso } from "@/app/dashboard/sin-acceso";
import { usarDatosDePrueba } from "@/lib/dashboard-datos-prueba";
import { getUsuarioActual, ROLES_DASHBOARD } from "@/lib/session";

export async function motivoSinAcceso(
  roles: readonly string[] = ROLES_DASHBOARD,
): Promise<MotivoSinAcceso | null> {
  const usuario = await getUsuarioActual();

  if (usuario.estado === "sin-sesion") return "sin-sesion";
  if (usuario.estado === "ok" && !roles.includes(usuario.usuario.rol)) {
    return "sin-acceso";
  }

  if (usuario.estado === "error" && !usarDatosDePrueba()) return "error";

  return null;
}
