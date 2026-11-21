"use server";

import { getSession } from "@/lib/session";
import { type Notificacion } from "@/lib/notificaciones";

const MENSAJE_ERROR = "No pudimos cargar tus notificaciones";

export type ListaNotificacionesResultado =
  | {
      datos: Notificacion[];
      total: number;
      pagina: number;
      noLeidas: number;
    }
  | { sinSesion: true }
  | { error: string };

export type MarcarNotificacionResultado =
  | { id: string | number; leida: true; leidaEn: string }
  | { sinSesion: true }
  | { error: string };

function esId(valor: unknown): valor is string | number {
  return (
    (typeof valor === "string" && valor.trim().length > 0) ||
    (typeof valor === "number" && Number.isInteger(valor) && valor > 0)
  );
}

function esNotificacion(valor: unknown): valor is Notificacion {
  if (!valor || typeof valor !== "object") return false;
  const notificacion = valor as Record<string, unknown>;
  const referencia = notificacion.referencia;
  const referenciaValida =
    referencia === null ||
    (typeof referencia === "object" &&
      referencia !== null &&
      typeof (referencia as Record<string, unknown>).tipo === "string" &&
      esId((referencia as Record<string, unknown>).id));

  return (
    esId(notificacion.id) &&
    typeof notificacion.titulo === "string" &&
    typeof notificacion.mensaje === "string" &&
    typeof notificacion.moduloOrigen === "string" &&
    referenciaValida &&
    typeof notificacion.leida === "boolean" &&
    typeof notificacion.creadaEn === "string" &&
    !Number.isNaN(Date.parse(notificacion.creadaEn))
  );
}

function esLista(
  valor: unknown,
): valor is Extract<ListaNotificacionesResultado, { datos: Notificacion[] }> {
  if (!valor || typeof valor !== "object") return false;
  const lista = valor as Record<string, unknown>;
  return (
    Array.isArray(lista.datos) &&
    lista.datos.every(esNotificacion) &&
    Number.isInteger(lista.total) &&
    Number(lista.total) >= 0 &&
    Number.isInteger(lista.pagina) &&
    Number(lista.pagina) > 0 &&
    Number.isInteger(lista.noLeidas) &&
    Number(lista.noLeidas) >= 0
  );
}

function urlApi(ruta: string): URL {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) throw new Error("Falta API_URL.");
  return new URL(ruta, apiUrl.replace(/\/?$/, "/"));
}

export async function listarNotificaciones(
  pagina: number,
): Promise<ListaNotificacionesResultado> {
  if (!Number.isInteger(pagina) || pagina < 1) return { error: MENSAJE_ERROR };

  try {
    const token = await getSession();
    if (!token) return { sinSesion: true };

    const url = urlApi("notificaciones");
    url.searchParams.set("pagina", String(pagina));
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) return { sinSesion: true };
    if (!response.ok)
      throw new Error(`Notificaciones respondió ${response.status}.`);

    const resultado: unknown = await response.json();
    if (!esLista(resultado))
      throw new Error("Respuesta de notificaciones inválida.");
    return resultado;
  } catch (error) {
    console.error("Error al cargar notificaciones:", error);
    return { error: MENSAJE_ERROR };
  }
}

export async function marcarNotificacionLeida(
  id: string | number,
): Promise<MarcarNotificacionResultado> {
  if (!esId(id)) return { error: MENSAJE_ERROR };

  try {
    const token = await getSession();
    if (!token) return { sinSesion: true };

    const response = await fetch(
      urlApi(`notificaciones/${encodeURIComponent(String(id))}/leida`),
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 401) return { sinSesion: true };
    if (!response.ok)
      throw new Error(`Marcar notificación respondió ${response.status}.`);

    const resultado: unknown = await response.json();
    if (!resultado || typeof resultado !== "object")
      throw new Error("Respuesta al marcar notificación inválida.");
    const datos = resultado as Record<string, unknown>;
    if (
      !esId(datos.id) ||
      datos.leida !== true ||
      typeof datos.leidaEn !== "string" ||
      Number.isNaN(Date.parse(datos.leidaEn))
    )
      throw new Error("Respuesta al marcar notificación inválida.");

    return {
      id: datos.id,
      leida: true,
      leidaEn: datos.leidaEn,
    };
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error);
    return { error: MENSAJE_ERROR };
  }
}
