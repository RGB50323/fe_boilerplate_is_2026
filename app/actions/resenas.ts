"use server";

import { llamar } from "@/lib/api";
import {
  MAX_COMENTARIO,
  esPlatilloPendiente,
  esResenasPlatillo,
  type PlatilloPendienteResena,
  type ResenasPlatillo,
} from "@/lib/resenas";

export type ResenasResultado = { datos?: ResenasPlatillo; error?: string };

export async function consultarResenas(
  platilloId: number,
  pagina: number,
): Promise<ResenasResultado> {
  if (!Number.isInteger(platilloId) || platilloId < 1) {
    return { error: "Platillo inválido." };
  }
  if (!Number.isInteger(pagina) || pagina < 1) {
    return { error: "Página inválida." };
  }

  try {
    const apiUrl = process.env.API_URL;
    if (!apiUrl) throw new Error("Falta API_URL.");

    const url = new URL(
      `platillos/${platilloId}/resenas`,
      apiUrl.replace(/\/?$/, "/"),
    );
    url.searchParams.set("pagina", String(pagina));

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) {
      return { error: "Este platillo ya no está disponible." };
    }
    if (!response.ok) throw new Error(`Reseñas respondió ${response.status}.`);

    const datos: unknown = await response.json();
    if (!esResenasPlatillo(datos))
      throw new Error("Respuesta de reseñas inválida.");
    return { datos };
  } catch (error) {
    console.error("Error al cargar las reseñas:", error);
    return { error: "No pudimos cargar las reseñas" };
  }
}

export type PendientesResultado =
  | { pendientes: PlatilloPendienteResena[] }
  | { sinSesion: true }
  | { error: string };

export async function listarPendientesResena(): Promise<PendientesResultado> {
  const resultado = await llamar<unknown>("resenas/pendientes");
  if (!resultado.ok) {
    return resultado.sinSesion
      ? { sinSesion: true }
      : { error: "No pudimos cargar tus platillos por calificar." };
  }
  if (
    !Array.isArray(resultado.datos) ||
    !resultado.datos.every(esPlatilloPendiente)
  ) {
    console.error("Respuesta de pendientes de reseña inválida.");
    return { error: "No pudimos cargar tus platillos por calificar." };
  }
  return { pendientes: resultado.datos };
}

export type PublicarResultado =
  | { ok: true; mensaje: string }
  | { ok: false; error: string; sinSesion?: boolean; yaResenado?: boolean };

export async function publicarResena(datos: {
  pedidoId: number;
  platilloId: number;
  estrellas: number;
  comentario: string;
}): Promise<PublicarResultado> {
  const comentario = datos.comentario.trim();
  if (
    !Number.isInteger(datos.estrellas) ||
    datos.estrellas < 1 ||
    datos.estrellas > 5
  ) {
    return { ok: false, error: "Elige de 1 a 5 estrellas." };
  }
  if (comentario.length > MAX_COMENTARIO) {
    return {
      ok: false,
      error: `El comentario no puede superar los ${MAX_COMENTARIO} caracteres.`,
    };
  }

  const resultado = await llamar<{ mensaje: string }>("resenas", {
    metodo: "POST",
    cuerpo: {
      pedidoId: datos.pedidoId,
      platilloId: datos.platilloId,
      estrellas: datos.estrellas,
      ...(comentario ? { comentario } : {}),
    },
    mensajes: {
      400: "Revisa la calificación y el comentario.",
      404: "Ese platillo ya no está en tu pedido.",
      409: "Ya reseñaste este platillo en este pedido.",
      422: "Solo puedes calificar pedidos pagados en los últimos 7 días.",
    },
    detallarErrores: true,
  });
  if (!resultado.ok) {
    return {
      ok: false,
      error: resultado.error,
      sinSesion: resultado.sinSesion,
      yaResenado: resultado.estado === 409,
    };
  }
  return {
    ok: true,
    mensaje: resultado.datos.mensaje ?? "Reseña publicada correctamente",
  };
}
