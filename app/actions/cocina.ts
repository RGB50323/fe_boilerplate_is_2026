"use server";

import { getSession } from "@/lib/session";
import { esPedidoCocina, leerItemListo } from "@/lib/cocina/pedidos";
import type { ItemListo, PedidoCocina } from "@/lib/cocina/tipos";

const MENSAJE_ERROR = "No pudimos cargar los pedidos";
const MENSAJE_SIN_ACCESO = "No tenés permiso para ver la cocina.";

const MENSAJE_ERROR_LISTO = "No pudimos marcar el platillo. Intenta de nuevo";
const MENSAJES_LISTO: Partial<Record<number, string>> = {
  403: "No tienes permiso para marcar este platillo.",
  404: "Este platillo ya no existe en la comanda.",
};

export type MarcarListoResultado =
  | { item: ItemListo }
  | { conflicto: true }
  | { sinSesion: true }
  | { error: string };

export type PedidosCocinaResultado =
  | { pedidos: PedidoCocina[] }
  | { sinSesion: true }
  | { sinAcceso: string }
  | { error: string };

function urlApi(ruta: string): URL {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) throw new Error("Falta API_URL.");
  return new URL(ruta, apiUrl.replace(/\/?$/, "/"));
}

async function mensajeDe(response: Response): Promise<string | null> {
  try {
    const cuerpo: unknown = await response.json();
    const mensaje = (cuerpo as { message?: unknown } | null)?.message;
    return typeof mensaje === "string" && mensaje.trim() ? mensaje : null;
  } catch {
    return null;
  }
}

export async function listarPedidosCocina(): Promise<PedidosCocinaResultado> {
  try {
    const token = await getSession();
    if (!token) return { sinSesion: true };

    const response = await fetch(urlApi("cocina/pedidos"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) return { sinSesion: true };
    if (response.status === 403) {
      return { sinAcceso: (await mensajeDe(response)) ?? MENSAJE_SIN_ACCESO };
    }
    if (!response.ok) {
      throw new Error(`Cocina respondió ${response.status}.`);
    }

    const pedidos: unknown = await response.json();
    if (!Array.isArray(pedidos) || !pedidos.every(esPedidoCocina)) {
      throw new Error("Respuesta de cocina inválida.");
    }
    return { pedidos };
  } catch (error) {
    console.error("Error al cargar los pedidos de cocina:", error);
    return { error: MENSAJE_ERROR };
  }
}

export async function marcarItemListo(itemId: number): Promise<MarcarListoResultado> {
  if (!Number.isInteger(itemId) || itemId <= 0) return { error: MENSAJE_ERROR_LISTO };
  try {
    const token = await getSession();
    if (!token) return { sinSesion: true };

    const response = await fetch(urlApi(`cocina/items/${itemId}/listo`), {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) return { sinSesion: true };
    if (response.status === 409) return { conflicto: true };
    const mensaje = MENSAJES_LISTO[response.status];
    if (mensaje) return { error: mensaje };
    if (!response.ok) {
      throw new Error(`Cocina respondió ${response.status}.`);
    }

    const item = leerItemListo(await response.json());
    if (!item || item.itemId !== itemId) {
      throw new Error("Respuesta de cocina inválida.");
    }
    return { item };
  } catch (error) {
    console.error(`Error al marcar el platillo ${itemId} como listo:`, error);
    return { error: MENSAJE_ERROR_LISTO };
  }
}
