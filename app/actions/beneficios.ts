"use server";

import { ERROR_GENERICO, llamar, type Resultado } from "@/lib/api";
import {
  validarBeneficio,
  type Beneficio,
  type DatosBeneficio,
  type EstadoBeneficio,
  type PlatilloBeneficio,
} from "@/lib/beneficios";
import type { Pagina } from "@/lib/paginacion";

const MENSAJES = {
  400: "Revisa los datos de la solicitud.",
  404: "El beneficio ya no existe.",
  409: "Este beneficio ya fue deshabilitado y no puede modificarse.",
};

async function solicitar<T>(
  ruta: string,
  opciones?: Parameters<typeof llamar>[1],
): Promise<Resultado<T>> {
  const respuesta = await llamar<T>(ruta, {
    mensajes: MENSAJES,
    detallarErrores: true,
    ...opciones,
  });
  if (
    !respuesta.ok &&
    respuesta.error === ERROR_GENERICO &&
    respuesta.estado === undefined
  ) {
    return {
      ...respuesta,
      error: "No se pudo conectar con el servidor. Intenta de nuevo.",
    };
  }
  return respuesta;
}

export async function listarBeneficios(pagina = 1, estado?: EstadoBeneficio) {
  const consulta = new URLSearchParams({ pagina: String(pagina) });
  if (estado) consulta.set("estado", estado);
  return solicitar<Pagina<Beneficio>>(`beneficios?${consulta}`);
}

export async function obtenerBeneficio(id: number) {
  return solicitar<Beneficio>(`beneficios/${id}`);
}

export async function buscarPlatillosBeneficio(pagina: number, buscar: string) {
  const consulta = new URLSearchParams({ pagina: String(pagina) });
  if (buscar.trim()) consulta.set("buscar", buscar.trim());
  return solicitar<Pagina<PlatilloBeneficio>>(
    `beneficios/platillos?${consulta}`,
  );
}

export async function guardarBeneficio(datos: DatosBeneficio, id?: number) {
  const { platilloId, costoPuntos, vigenteDesde, vigenteHasta } = datos;
  const cuerpo = { platilloId, costoPuntos, vigenteDesde, vigenteHasta };
  const errores = validarBeneficio(cuerpo);
  if (Object.keys(errores).length) {
    return { ok: false, estado: 400, error: MENSAJES[400], errores } as const;
  }
  return solicitar<Beneficio>(
    id === undefined ? "beneficios" : `beneficios/${id}`,
    {
      metodo: id === undefined ? "POST" : "PATCH",
      cuerpo,
      mensajes: {
        ...MENSAJES,
        404:
          id === undefined
            ? "El platillo ya no existe."
            : "El beneficio o el platillo ya no existe.",
      },
    },
  );
}

export async function deshabilitarBeneficio(id: number) {
  return solicitar<Beneficio>(`beneficios/${id}/deshabilitar`, {
    metodo: "PATCH",
  });
}
