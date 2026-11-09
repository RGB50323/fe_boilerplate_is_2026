"use server";

import { getSession } from "@/lib/session";
import { esPedidoCocina } from "@/lib/cocina/pedidos";
import type { PedidoCocina } from "@/lib/cocina/tipos";

const MENSAJE_ERROR = "No pudimos cargar los pedidos";
const MENSAJE_SIN_ACCESO = "No tenés permiso para ver la cocina.";

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
