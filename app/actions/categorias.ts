"use server";

import { getSession } from "@/lib/session";
import {
  validarNombre,
  type Categoria,
  type CategoriaGuardada,
  type PlatilloDeCategoria,
} from "@/lib/categorias";

export type Resultado<T> =
  | { ok: true; datos: T }
  | { ok: false; error: string; sinSesion?: boolean };

const ERROR_GENERICO = "No pudimos completar la operación. Intenta de nuevo.";
const SIN_SESION = "Tu sesión expiró. Inicia sesión de nuevo.";
const SIN_PERMISO = "No tienes permiso para realizar esta acción.";

type Opciones = {
  metodo?: "GET" | "POST" | "PUT" | "PATCH";
  cuerpo?: unknown;
  mensajes?: Partial<Record<number, string>>;
};

async function llamar<T>(
  ruta: string,
  { metodo = "GET", cuerpo, mensajes = {} }: Opciones = {},
): Promise<Resultado<T>> {
  try {
    const token = await getSession();
    if (!token) return { ok: false, error: SIN_SESION, sinSesion: true };

    const apiUrl = process.env.API_URL;
    if (!apiUrl) throw new Error("Falta API_URL.");

    const response = await fetch(new URL(ruta, apiUrl.replace(/\/?$/, "/")), {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(cuerpo === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 401) {
      return { ok: false, error: SIN_SESION, sinSesion: true };
    }
    if (response.status === 403) return { ok: false, error: SIN_PERMISO };
    if (!response.ok) {
      return { ok: false, error: mensajes[response.status] ?? ERROR_GENERICO };
    }
    return { ok: true, datos: (await response.json()) as T };
  } catch (error) {
    console.error(`Error en ${metodo} ${ruta}:`, error);
    return { ok: false, error: ERROR_GENERICO };
  }
}

const MENSAJES_NOMBRE = {
  400: "El nombre de la categoría es obligatorio.",
  404: "La categoría no existe.",
  409: "Ya existe una categoría con ese nombre.",
};

export async function listarCategorias() {
  return llamar<Categoria[]>("categorias");
}

export async function crearCategoria(
  nombre: string,
): Promise<Resultado<CategoriaGuardada>> {
  const invalido = validarNombre(nombre);
  if (invalido) return { ok: false, error: invalido };
  return llamar<CategoriaGuardada>("categorias", {
    metodo: "POST",
    cuerpo: { nombre: nombre.trim() },
    mensajes: MENSAJES_NOMBRE,
  });
}

export async function renombrarCategoria(
  id: number,
  nombre: string,
): Promise<Resultado<CategoriaGuardada>> {
  const invalido = validarNombre(nombre);
  if (invalido) return { ok: false, error: invalido };
  return llamar<CategoriaGuardada>(`categorias/${id}`, {
    metodo: "PUT",
    cuerpo: { nombre: nombre.trim() },
    mensajes: MENSAJES_NOMBRE,
  });
}

export async function deshabilitarCategoria(id: number) {
  return llamar<{ id: number; activa: boolean; deshabilitadaEn: string }>(
    `categorias/${id}/deshabilitar`,
    {
      metodo: "PATCH",
      mensajes: {
        404: "La categoría no existe.",
        409: "La categoría ya está deshabilitada.",
        422: "Esta categoría tiene platillos asociados. Reasígnalos antes de deshabilitarla.",
      },
    },
  );
}

export async function listarPlatillosDeCategoria(id: number) {
  return llamar<PlatilloDeCategoria[]>(`categorias/${id}/platillos`, {
    mensajes: { 404: "La categoría no existe." },
  });
}

export async function cambiarCategoriaDePlatillo(
  platilloId: number,
  categoriaId: number,
) {
  return llamar<{ platilloId: number; categoriaId: number }>(
    `platillos/${platilloId}/categoria`,
    {
      metodo: "PATCH",
      cuerpo: { categoriaId },
      mensajes: {
        404: "El platillo o la categoría ya no existe.",
        422: "La categoría destino está deshabilitada.",
      },
    },
  );
}
