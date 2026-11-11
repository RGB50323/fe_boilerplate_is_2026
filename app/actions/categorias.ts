"use server";

import { llamar, type Resultado } from "@/lib/api";
import {
  validarNombre,
  type Categoria,
  type CategoriaGuardada,
  type PlatilloDeCategoria,
} from "@/lib/categorias";

export type { Resultado };

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
