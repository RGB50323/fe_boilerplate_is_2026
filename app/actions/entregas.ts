"use server";

import { ERROR_GENERICO, llamar } from "@/lib/api";
import {
  esItemPorEntregar,
  leerItemEntregado,
  type ItemEntregado,
  type ItemPorEntregar,
} from "@/lib/entregas";

const ERROR_CARGA = "No pudimos cargar los platillos";
const ERROR_ENTREGA = "No pudimos marcar el platillo como entregado. Intenta de nuevo.";

export type ItemsListosResultado =
  | { items: ItemPorEntregar[] }
  | { sinSesion: true }
  | { error: string };

export type MarcarEntregadoResultado =
  | { entregado: ItemEntregado }
  | { refrescar: true }
  | { sinSesion: true }
  | { error: string };

export async function listarItemsListos(): Promise<ItemsListosResultado> {
  const resultado = await llamar<unknown>("mesero/items-listos");
  if (!resultado.ok) {
    return resultado.sinSesion ? { sinSesion: true } : { error: ERROR_CARGA };
  }
  const { datos } = resultado;
  if (!Array.isArray(datos) || !datos.every(esItemPorEntregar)) {
    console.error("Respuesta de platillos por entregar inválida.");
    return { error: ERROR_CARGA };
  }
  return { items: datos };
}

export async function marcarItemEntregado(
  itemId: number,
): Promise<MarcarEntregadoResultado> {
  if (!Number.isInteger(itemId) || itemId <= 0) return { error: ERROR_ENTREGA };

  const resultado = await llamar<unknown>(`mesero/items/${itemId}/entregado`, {
    metodo: "PATCH",
    detallarErrores: true,
    mensajes: { 404: "Este platillo ya no existe en el pedido." },
  });
  if (!resultado.ok) {
    if (resultado.sinSesion) return { sinSesion: true };
    if (resultado.estado === 409 || resultado.estado === 422) return { refrescar: true };
    return { error: resultado.error === ERROR_GENERICO ? ERROR_ENTREGA : resultado.error };
  }

  const entregado = leerItemEntregado(resultado.datos);
  if (!entregado || entregado.itemId !== itemId) {
    console.error("Respuesta al marcar el platillo como entregado inválida.");
    return { error: ERROR_ENTREGA };
  }
  return { entregado };
}
