"use server";

import { llamar, type Resultado } from "@/lib/api";
import {
  cuerpoPlatillo,
  validarImagen,
  validarPlatillo,
  type ImagenSubida,
  type Platillo,
  type PlatilloDeshabilitado,
  type ValoresPlatillo,
} from "@/lib/platillos";

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
): Promise<Resultado<Platillo[]>> {
  const resultado = await llamar<PlatilloApi[]>(
    `sucursales/${sucursalId}/platillos`,
  );
  return resultado.ok
    ? { ok: true, datos: resultado.datos.map(conImagen) }
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
