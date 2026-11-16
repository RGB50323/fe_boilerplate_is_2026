"use server";

import { llamar, ERROR_GENERICO } from "@/lib/api";
import {
  esDetalleReserva,
  idReservaValido,
  type CamposEdicion,
  type ResultadoEdicion,
} from "@/lib/edicion-reserva";
import {
  validarVisita,
  esMesa,
  type MesaDisponible,
} from "@/lib/reservaciones";

export async function obtenerReservacion(
  id: string,
): Promise<ResultadoEdicion> {
  if (!idReservaValido(id)) return { error: "Reservación no encontrada." };
  const resultado = await llamar<unknown>(`reservaciones/${id}`, {
    mensajes: { 404: "Reservación no encontrada." },
  });
  if (!resultado.ok) return resultado;
  return esDetalleReserva(resultado.datos)
    ? { reserva: resultado.datos }
    : { error: ERROR_GENERICO };
}

export async function modificarReservacion(
  id: string,
  datos: CamposEdicion,
): Promise<ResultadoEdicion> {
  if (!idReservaValido(id)) return { error: "Reservación no encontrada." };
  // La API valida horarios y capacidad con datos actuales de la base.
  const errores: Record<string, string> = validarVisita({
    fecha: datos.fecha,
    hora: datos.hora,
    personas: datos.personas,
  });
  if (
    !Number.isInteger(datos.mesaId) ||
    datos.mesaId < 1 ||
    datos.mesaId > 2147483647
  )
    errores.mesaId = "Seleccioná una mesa válida.";
  if (
    typeof datos.version !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(datos.version)
  )
    return { error: "Recargá los datos de la reservación.", recargar: true };
  if (Object.keys(errores).length) return { errores };
  const resultado = await llamar<unknown>(`reservaciones/${id}`, {
    metodo: "PATCH",
    cuerpo: {
      mesaId: datos.mesaId,
      fecha: datos.fecha,
      hora: datos.hora,
      personas: Number(datos.personas),
      version: datos.version,
    },
    detallarErrores: true,
    mensajes: {
      400: "No se pudo modificar. Revisá los campos y que la reservación siga confirmada.",
      404: "Reservación no encontrada.",
      409: "La mesa ya no está disponible. Tus datos originales se conservaron.",
    },
  });
  if (resultado.ok)
    return esDetalleReserva(resultado.datos)
      ? { reserva: resultado.datos }
      : {
          error:
            "No pudimos leer la respuesta. Revisá Mis reservaciones antes de intentar de nuevo.",
          recargar: true,
        };
  if (resultado.estado !== 409) return resultado;
  if (resultado.codigo === "RESERVA_MODIFICADA")
    return {
      error: "La reservación cambió. Recargá sus datos antes de editar.",
      recargar: true,
    };
  if (resultado.codigo !== "MESA_NO_DISPONIBLE")
    return {
      error:
        "No pudimos confirmar el estado de la reservación. Recargá sus datos.",
      recargar: true,
    };
  const query = new URLSearchParams({
    fecha: datos.fecha,
    hora: datos.hora,
    personas: datos.personas,
  });
  const alternativas = await llamar<MesaDisponible[]>(
    `reservaciones/${id}/mesas-disponibles?${query}`,
  );
  if (!alternativas.ok)
    return {
      ...alternativas,
      error:
        resultado.error +
        " No pudimos cargar las alternativas. Intentá de nuevo.",
    };
  if (!Array.isArray(alternativas.datos) || !alternativas.datos.every(esMesa))
    return { error: ERROR_GENERICO };
  return { error: resultado.error, alternativas: alternativas.datos };
}
