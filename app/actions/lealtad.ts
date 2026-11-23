"use server";

import { llamar } from "@/lib/api";
import type {
  Beneficio,
  BeneficioAdministrativo,
  Cupon,
  DatosBeneficio,
  Puntos,
  ReglaPuntos,
} from "@/lib/lealtad";

const erroresCupon = {
  404: "No encontramos un cupón con ese código.",
  409: "Este cupón ya fue utilizado.",
  410: "El cupón ha expirado.",
};

const erroresBeneficio = {
  400: "Revisa el costo y las fechas de vigencia.",
  404: "El beneficio ya no está disponible.",
  409: "El beneficio fue deshabilitado definitivamente.",
};

function idValido(id: number) {
  return Number.isInteger(id) && id >= 1 && id <= 2147483647;
}

export async function consultarPuntos() {
  return llamar<Puntos>("lealtad/puntos");
}

export async function consultarCatalogo() {
  return llamar<Beneficio[]>("lealtad/beneficios");
}

export async function consultarMisCupones() {
  return llamar<Cupon[]>("lealtad/mis-cupones");
}

export async function adquirirCupon(
  beneficioId: number,
  claveIdempotencia: string,
) {
  return llamar<Cupon>("lealtad/canjes", {
    metodo: "POST",
    cuerpo: { beneficioId, claveIdempotencia },
    detallarErrores: true,
    mensajes: {
      400: "Revisa los datos del canje.",
      404: "El beneficio ya no está disponible: está inactivo o vencido.",
      409: "No tienes puntos disponibles suficientes para este beneficio.",
    },
  });
}

export async function consultarCupon(codigo: string) {
  return llamar<Cupon>(`lealtad/cupones/${encodeURIComponent(codigo)}`, {
    mensajes: erroresCupon,
    detallarErrores: true,
  });
}

export async function utilizarCupon(codigo: string) {
  return llamar<Cupon>(
    `lealtad/cupones/${encodeURIComponent(codigo)}/utilizar`,
    {
      metodo: "PATCH",
      mensajes: erroresCupon,
      detallarErrores: true,
    },
  );
}

export async function consultarBeneficiosAdministrativos() {
  return llamar<BeneficioAdministrativo[]>("lealtad/admin/beneficios");
}

export async function guardarBeneficio(datos: DatosBeneficio, id?: number) {
  if (id !== undefined && !idValido(id)) {
    return {
      ok: false as const,
      estado: 400,
      error: "Identificador de beneficio inválido.",
    };
  }
  return llamar<Beneficio>(
    id === undefined
      ? "lealtad/admin/beneficios"
      : `lealtad/admin/beneficios/${id}`,
    {
      metodo: id === undefined ? "POST" : "PATCH",
      cuerpo: datos,
      mensajes: erroresBeneficio,
      detallarErrores: true,
    },
  );
}

export async function deshabilitarBeneficio(id: number) {
  if (!idValido(id)) {
    return {
      ok: false as const,
      estado: 400,
      error: "Identificador de beneficio inválido.",
    };
  }
  return llamar<Beneficio>(`lealtad/admin/beneficios/${id}`, {
    metodo: "DELETE",
    mensajes: erroresBeneficio,
    detallarErrores: true,
  });
}

export async function consultarRegla() {
  return llamar<ReglaPuntos | null>("lealtad/admin/regla");
}

export async function guardarRegla(puntosPorDolar: number) {
  return llamar<ReglaPuntos>("lealtad/admin/regla", {
    metodo: "PUT",
    cuerpo: { puntosPorDolar },
    mensajes: { 400: "La tasa debe ser un entero entre 1 y 10." },
  });
}

export async function deshabilitarRegla() {
  return llamar<ReglaPuntos>("lealtad/admin/regla", {
    metodo: "DELETE",
    mensajes: { 404: "No hay una regla vigente para deshabilitar." },
  });
}
