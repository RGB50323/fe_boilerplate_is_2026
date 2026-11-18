"use server";

import { llamar, ERROR_GENERICO } from "@/lib/api";
import { esReservacion, type Reservacion } from "@/lib/confirmacion-reserva";
import { idReservaValido } from "@/lib/edicion-reserva";

export async function cancelarReservacion(id: string): Promise<{
  reserva?: Reservacion;
  error?: string;
  sinSesion?: boolean;
}> {
  if (!idReservaValido(id)) return { error: "Reservación no encontrada." };
  const resultado = await llamar<unknown>("reservaciones/" + id + "/cancelar", {
    metodo: "PATCH",
    mensajes: {
      400: "Solo podés cancelar reservaciones confirmadas y futuras. Actualizá Mis reservaciones.",
      404: "Reservación no encontrada.",
    },
  });
  if (!resultado.ok) return resultado;
  if (!esReservacion(resultado.datos) || resultado.datos.estado !== "CANCELADA")
    return {
      error: ERROR_GENERICO + " Revisá Mis reservaciones antes de reintentar.",
    };
  return { reserva: resultado.datos };
}
