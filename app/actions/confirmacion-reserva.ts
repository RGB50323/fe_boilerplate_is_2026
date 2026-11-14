"use server";

import { revalidatePath } from "next/cache";
import { llamar, ERROR_GENERICO } from "@/lib/api";
import {
  esReservacion,
  validarReserva,
  type CamposReserva,
  type ErroresReserva,
  type Reservacion,
  type MisReservaciones,
} from "@/lib/confirmacion-reserva";

export type ConfirmacionResultado = {
  reserva?: Reservacion;
  error?: string;
  errores?: ErroresReserva;
  sinSesion?: boolean;
  sinDisponibilidad?: boolean;
};

export async function confirmarReservacion(
  formData: FormData,
): Promise<ConfirmacionResultado> {
  const campos = [
    "mesaId",
    "sucursalId",
    "fecha",
    "hora",
    "personas",
    "nombre",
    "telefono",
    "correo",
  ] as const;
  const datos = Object.fromEntries(
    campos.map((campo) => [campo, String(formData.get(campo) ?? "").trim()]),
  ) as CamposReserva;
  const errores = validarReserva(datos);
  if (Object.keys(errores).length) return { errores };
  const respuesta = await llamar<unknown>("reservaciones", {
    metodo: "POST",
    detallarErrores: true,
    cuerpo: {
      mesaId: Number(datos.mesaId),
      fecha: datos.fecha,
      hora: datos.hora,
      personas: Number(datos.personas),
      nombre: datos.nombre,
      telefono: datos.telefono,
      correo: datos.correo,
    },
    mensajes: {
      400: "Revisá los campos indicados.",
      404: "La mesa no existe o está inactiva. Elegí otra mesa.",
      409: "La mesa ya no está disponible en ese horario. Elegí otra mesa.",
    },
  });
  if (!respuesta.ok) {
    const errores: ErroresReserva = {};
    for (const campo of campos)
      if (respuesta.errores?.[campo]) errores[campo] = respuesta.errores[campo];
    return {
      error: respuesta.error,
      errores,
      sinSesion: respuesta.sinSesion,
      sinDisponibilidad: respuesta.estado === 409 || respuesta.estado === 404,
    };
  }
  if (!esReservacion(respuesta.datos))
    return {
      error:
        "No pudimos leer la confirmación. Revisá Mis reservaciones antes de volver a confirmar.",
    };
  revalidatePath("/perfil/reservaciones");
  return { reserva: respuesta.datos };
}

export async function listarMisReservaciones(
  pagina = 1,
): Promise<{ datos?: MisReservaciones; error?: string; sinSesion?: boolean }> {
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > 1000)
    return { error: "Página inválida." };
  const respuesta = await llamar<MisReservaciones>(
    `reservaciones/mias?pagina=${pagina}`,
  );
  if (!respuesta.ok)
    return { error: respuesta.error, sinSesion: respuesta.sinSesion };
  const lista = respuesta.datos;
  if (
    !lista ||
    !Array.isArray(lista.datos) ||
    !lista.datos.every(esReservacion) ||
    !Number.isInteger(lista.pagina) ||
    lista.pagina !== pagina ||
    !Number.isInteger(lista.total) ||
    lista.total < 0 ||
    !Number.isInteger(lista.totalPaginas) ||
    lista.totalPaginas < 0
  )
    return { error: ERROR_GENERICO };
  return { datos: lista };
}
