"use server";

import { llamar, type Resultado } from "@/lib/api";
import {
  cuerpoPlatillo,
  PLATILLO_NO_EXISTE,
  validarImagen,
  validarPlatillo,
  type ImagenSubida,
  type Platillo,
  type PlatilloDeshabilitado,
  type ValoresPlatillo,
} from "@/lib/platillos";
import type { Pagina } from "@/lib/paginacion";

type PlatilloApi = Omit<Platillo, "imagenSrc">;

const MENSAJES_GUARDAR = {
  400: "Revisa los campos del formulario.",
  404: "La categoría o el platillo ya no existe.",
  409: "Ya existe un platillo con ese nombre.",
  422: "La categoría seleccionada está deshabilitada.",
};

function urlImagen(ruta: string | null): string | null {
  if (!ruta) return null;
  if (/^https?:\/\//.test(ruta)) return ruta;
  const apiUrl = process.env.API_URL;
  return apiUrl ? new URL(ruta, apiUrl).toString() : null;
}

function conImagen(platillo: PlatilloApi): Platillo {
  return { ...platillo, imagenSrc: urlImagen(platillo.imagenUrl) };
}

function primerError(valores: ValoresPlatillo): string | undefined {
  return Object.values(validarPlatillo(valores))[0];
}

export async function listarPlatillos(
  sucursalId: number,
  pagina = 1,
  q = "",
): Promise<Resultado<Pagina<Platillo>>> {
  const consulta = new URLSearchParams({ pagina: String(pagina) });
  if (q.trim()) consulta.set("q", q.trim());

  const resultado = await llamar<Pagina<PlatilloApi>>(
    `sucursales/${sucursalId}/platillos?${consulta.toString()}`,
  );
  return resultado.ok
    ? {
        ok: true,
        datos: {
          ...resultado.datos,
          datos: resultado.datos.datos.map(conImagen),
        },
      }
    : resultado;
}

export async function obtenerPlatillo(
  id: number,
): Promise<Resultado<Platillo>> {
  const resultado = await llamar<PlatilloApi>(`platillos/${id}`, {
    mensajes: { 404: PLATILLO_NO_EXISTE },
  });
  return resultado.ok
    ? { ok: true, datos: conImagen(resultado.datos) }
    : resultado;
}

export async function crearPlatillo(
  sucursalId: number,
  valores: ValoresPlatillo,
): Promise<Resultado<Platillo>> {
  const invalido = primerError(valores);
  if (invalido) return { ok: false, error: invalido };

  const resultado = await llamar<PlatilloApi>(
    `sucursales/${sucursalId}/platillos`,
    {
      metodo: "POST",
      cuerpo: cuerpoPlatillo(valores),
      mensajes: MENSAJES_GUARDAR,
    },
  );
  return resultado.ok
    ? { ok: true, datos: conImagen(resultado.datos) }
    : resultado;
}

export async function editarPlatillo(
  id: number,
  valores: ValoresPlatillo,
): Promise<Resultado<Platillo>> {
  const invalido = primerError(valores);
  if (invalido) return { ok: false, error: invalido };

  const resultado = await llamar<PlatilloApi>(`platillos/${id}`, {
    metodo: "PUT",
    cuerpo: cuerpoPlatillo(valores),
    mensajes: MENSAJES_GUARDAR,
  });
  return resultado.ok
    ? { ok: true, datos: conImagen(resultado.datos) }
    : resultado;
}

export async function deshabilitarPlatillo(
  id: number,
): Promise<Resultado<PlatilloDeshabilitado>> {
  return llamar<PlatilloDeshabilitado>(`platillos/${id}/deshabilitar`, {
    metodo: "PATCH",
    mensajes: {
      404: "El platillo no existe.",
      409: "El platillo ya está deshabilitado.",
    },
  });
}

export async function habilitarPlatillo(
  id: number,
): Promise<Resultado<PlatilloDeshabilitado>> {
  return llamar<PlatilloDeshabilitado>(`platillos/${id}/habilitar`, {
    metodo: "PATCH",
    mensajes: {
      404: "El platillo o su categoría ya no existe.",
      409: "El platillo ya está habilitado.",
      422: "La categoría del platillo está deshabilitada. Habilítala primero.",
    },
  });
}

export async function subirImagenPlatillo(
  formData: FormData,
): Promise<Resultado<ImagenSubida>> {
  const archivo = formData.get("imagen");
  if (!(archivo instanceof File)) {
    return { ok: false, error: "Selecciona una imagen." };
  }
  const invalido = validarImagen(archivo);
  if (invalido) return { ok: false, error: invalido };

  const cuerpo = new FormData();
  cuerpo.append("imagen", archivo);

  const resultado = await llamar<{ imagenUrl: string }>("platillos/imagen", {
    metodo: "POST",
    cuerpo,
    mensajes: {
      400: "Selecciona una imagen.",
      413: "La imagen no puede superar los 2 MB.",
      415: "La imagen debe ser JPG o PNG.",
    },
  });
  return resultado.ok
    ? {
        ok: true,
        datos: {
          imagenUrl: resultado.datos.imagenUrl,
          imagenSrc: urlImagen(resultado.datos.imagenUrl),
        },
      }
    : resultado;
}
