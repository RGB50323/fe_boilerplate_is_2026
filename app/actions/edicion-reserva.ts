"use server";

import { llamar, ERROR_GENERICO } from "@/lib/api";
import {
  esDetalleReserva,
  idReservaValido,
  type CamposEdicion,
  type ResultadoEdicion,
} from "@/lib/edicion-reserva";
import { validarFiltros, type MesaDisponible } from "@/lib/reservaciones";

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
  const errores: Record<string, string> = validarFiltros({
    sucursalId: "1",
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
  // Distingue un horario ocupado de una edición concurrente sin sobrescribir la versión.
  const actual = await obtenerReservacion(id);
  if (!actual.reserva) return actual;
  if (
    actual.reserva.version !== datos.version ||
    actual.reserva.estado !== "CONFIRMADA"
  )
    return {
      error: "La reservación cambió. Recargá sus datos antes de editar.",
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
  if (
    !Array.isArray(alternativas.datos) ||
    !alternativas.datos.every(
      (m) =>
        m &&
        Number.isInteger(m.mesaId) &&
        Number.isInteger(m.numero) &&
        Number.isInteger(m.capacidad),
    )
  )
    return { error: ERROR_GENERICO };
  return { error: resultado.error, alternativas: alternativas.datos };
}
