"use server";

import { llamar } from "@/lib/api";
import { obtenerUsuarioActual } from "@/lib/usuario";
import {
  esOcupacionProyectada,
  SIN_PERMISO_OCUPACION,
  type OcupacionProyectada,
} from "@/lib/ocupacion";

export type OcupacionResultado =
  | { ocupacion: OcupacionProyectada }
  | { sinSesion: true }
  | { error: string };

export async function consultarOcupacion(
  fecha: string,
): Promise<OcupacionResultado> {
  const formato = /^\d{4}-\d{2}-\d{2}$/;
  if (!fecha || !formato.test(fecha)) {
    return { error: "La fecha debe tener formato YYYY-MM-DD." };
  }

  const usuario = await obtenerUsuarioActual();
  if (!usuario) return { sinSesion: true };
  if (usuario.rol !== "GERENTE" || usuario.sucursalId === null) {
    return { error: SIN_PERMISO_OCUPACION };
  }

  const resultado = await llamar<unknown>(
    `sucursales/${usuario.sucursalId}/ocupacion?fecha=${fecha}`,
    {
      mensajes: {
        400: "Revisa la fecha ingresada.",
        403: SIN_PERMISO_OCUPACION,
        404: "Sucursal no encontrada.",
      },
    },
  );

  if (!resultado.ok) {
    if (resultado.sinSesion) return { sinSesion: true };
    return {
      error:
        resultado.error === "No tienes permiso para realizar esta acción."
          ? SIN_PERMISO_OCUPACION
          : resultado.error,
    };
  }

  if (!esOcupacionProyectada(resultado.datos)) {
    console.error("Respuesta de ocupación proyectada inválida.");
    return {
      error: "No pudimos cargar la ocupación proyectada. Intenta de nuevo.",
    };
  }

  return { ocupacion: resultado.datos };
}
