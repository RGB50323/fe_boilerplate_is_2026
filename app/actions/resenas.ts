"use server";

import { llamar } from "@/lib/api";
import type { Pagina } from "@/lib/paginacion";
import {
  MAX_COMENTARIO,
  MOTIVOS,
  YA_OCULTA,
  esResenaModeracion,
  type EstadoResena,
  type MotivoOcultacion,
  type ResenaModeracion,
  SIN_PERMISO_SECCION,
  errorRango,
  esReporteCalificaciones,
  type ReporteCalificaciones,
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

export type ReporteResultado =
  { reporte: ReporteCalificaciones } | { sinSesion: true } | { error: string };

export async function consultarReporteCalificaciones(
  desde: string,
  hasta: string,
): Promise<ReporteResultado> {
  const fecha = /^\d{4}-\d{2}-\d{2}$/;
  if ((desde && !fecha.test(desde)) || (hasta && !fecha.test(hasta))) {
    return { error: "Ingresa fechas válidas." };
  }
  const rango = errorRango(desde, hasta);
  if (rango) return { error: rango };

  const query = new URLSearchParams();
  if (desde) query.set("desde", desde);
  if (hasta) query.set("hasta", hasta);
  const resultado = await llamar<unknown>(
    `resenas/reporte${query.size ? `?${query}` : ""}`,
    {
      mensajes: {
        400: "Revisa las fechas del filtro.",
        403: SIN_PERMISO_SECCION,
      },
    },
  );
  if (!resultado.ok) {
    if (resultado.sinSesion) return { sinSesion: true };
    // llamar responde 403 con un texto genérico
    return {
      error:
        resultado.error === "No tienes permiso para realizar esta acción."
          ? SIN_PERMISO_SECCION
          : resultado.error,
    };
  }
  if (!esReporteCalificaciones(resultado.datos)) {
    console.error("Respuesta del reporte de calificaciones inválida.");
    return { error: "No pudimos cargar el reporte. Intenta de nuevo." };
  }
  return { reporte: resultado.datos };
}

export type ModeracionResultado =
  | { pagina: Pagina<ResenaModeracion> }
  | { sinSesion: true }
  | { error: string };

export async function listarModeracion(
  pagina: number,
  estado?: EstadoResena,
): Promise<ModeracionResultado> {
  if (!Number.isInteger(pagina) || pagina < 1) {
    return { error: "Página inválida." };
  }
  const query = new URLSearchParams({ pagina: String(pagina) });
  if (estado) query.set("estado", estado);
  const resultado = await llamar<unknown>(`resenas/moderacion?${query}`);
  if (!resultado.ok) {
    if (resultado.sinSesion) return { sinSesion: true };
    return {
      error:
        resultado.error === "No tienes permiso para realizar esta acción."
          ? SIN_PERMISO_SECCION
          : "No pudimos cargar las reseñas. Intenta de nuevo.",
    };
  }
  const d = resultado.datos as Partial<Pagina<unknown>> | null;
  if (
    !d ||
    !Array.isArray(d.datos) ||
    !d.datos.every(esResenaModeracion) ||
    !Number.isInteger(d.pagina) ||
    !Number.isInteger(d.totalPaginas) ||
    !Number.isInteger(d.total)
  ) {
    console.error("Respuesta de moderación de reseñas inválida.");
    return { error: "No pudimos cargar las reseñas. Intenta de nuevo." };
  }
  return { pagina: d as Pagina<ResenaModeracion> };
}

export type OcultarResultado =
  | { ok: true; resena: ResenaModeracion }
  | { ok: false; error: string; sinSesion?: boolean; yaOculta?: boolean };

export async function ocultarResena(
  id: number,
  motivo: MotivoOcultacion,
): Promise<OcultarResultado> {
  if (!Number.isInteger(id) || id < 1) {
    return { ok: false, error: "Reseña inválida." };
  }
  if (!MOTIVOS.some((m) => m.valor === motivo)) {
    return { ok: false, error: "Elige un motivo." };
  }
  const resultado = await llamar<unknown>(`resenas/${id}/ocultar`, {
    metodo: "PATCH",
    cuerpo: { motivo },
    mensajes: {
      400: "Elige un motivo.",
      404: "Esta reseña ya no existe.",
      409: YA_OCULTA,
    },
    detallarErrores: true,
  });
  if (!resultado.ok) {
    return {
      ok: false,
      error: resultado.error,
      sinSesion: resultado.sinSesion,
      yaOculta: resultado.estado === 409,
    };
  }
  if (!esResenaModeracion(resultado.datos)) {
    console.error("Respuesta de ocultar reseña inválida.");
    return {
      ok: false,
      error: "No pudimos ocultar la reseña. Intenta de nuevo.",
    };
  }
  return { ok: true, resena: resultado.datos };
}
