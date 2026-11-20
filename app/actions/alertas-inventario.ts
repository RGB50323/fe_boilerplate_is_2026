"use server";

import { ERROR_GENERICO, llamar } from "@/lib/api";
import { leerAlertas, type AlertaInsumo } from "@/lib/alertas-inventario";

const ERROR_ALERTAS = "No pudimos cargar las alertas";
const ERROR_VISTA = "No pudimos marcar la alerta como vista. Intenta de nuevo.";

export type AlertasResultado = { alertas: AlertaInsumo[] } | { sinSesion: true } | { error: string };

export type MarcarVistaResultado =
  | { vista: true }
  | { resuelta: true }
  | { sinSesion: true }
  | { error: string };

export async function listarAlertas(): Promise<AlertasResultado> {
  const resultado = await llamar<unknown>("inventario/alertas");
  if (!resultado.ok) {
    return resultado.sinSesion ? { sinSesion: true } : { error: ERROR_ALERTAS };
  }
  const alertas = leerAlertas(resultado.datos);
  if (!alertas) {
    console.error("Respuesta de alertas de inventario inválida.");
    return { error: ERROR_ALERTAS };
  }
  return { alertas };
}

export async function marcarAlertaVista(alertaId: number): Promise<MarcarVistaResultado> {
  if (!Number.isInteger(alertaId) || alertaId <= 0) return { error: ERROR_VISTA };
  const resultado = await llamar<unknown>(`inventario/alertas/${alertaId}/vista`, {
    metodo: "PATCH",
    detallarErrores: true,
    mensajes: { 404: "Esta alerta ya no existe." },
  });
  if (!resultado.ok) {
    if (resultado.sinSesion) return { sinSesion: true };
    if (resultado.estado === 409) return { resuelta: true };
    return { error: resultado.error === ERROR_GENERICO ? ERROR_VISTA : resultado.error };
  }
  return { vista: true };
}
