"use server";

import {
  validarFiltros,
  type ErroresDisponibilidad,
  type FiltrosDisponibilidad,
  type MesaDisponible,
  type Sucursal,
} from "@/lib/reservaciones";

export type DisponibilidadResultado = {
  mesas: MesaDisponible[];
  error?: string;
  errores?: ErroresDisponibilidad;
};

function esMesa(valor: unknown): valor is MesaDisponible {
  if (!valor || typeof valor !== "object") return false;
  const mesa = valor as Record<string, unknown>;
  return (
    Number.isInteger(mesa.mesaId) &&
    Number.isInteger(mesa.numero) &&
    Number.isInteger(mesa.capacidad) &&
    (mesa.zona === null || typeof mesa.zona === "string")
  );
}

export type SucursalesResultado = {
  sucursales: Sucursal[];
  error?: string;
};

function esSucursal(valor: unknown): valor is Sucursal {
  if (!valor || typeof valor !== "object") return false;
  const sucursal = valor as Record<string, unknown>;
  return (
    Number.isInteger(sucursal.id) &&
    Number(sucursal.id) > 0 &&
    typeof sucursal.nombre === "string" &&
    Array.isArray(sucursal.horarios) &&
    sucursal.horarios.every((valor: unknown) => {
      if (!valor || typeof valor !== "object") return false;
      const horario = valor as Record<string, unknown>;
      const horaValida = (hora: unknown) =>
        typeof hora === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora);
      return (
        Number.isInteger(horario.diaSemana) &&
        Number(horario.diaSemana) >= 0 &&
        Number(horario.diaSemana) <= 6 &&
        horaValida(horario.apertura) &&
        horaValida(horario.cierre)
      );
    })
  );
}

export async function listarSucursales(): Promise<SucursalesResultado> {
  try {
    const apiUrl = process.env.API_URL;
    if (!apiUrl) throw new Error("Falta API_URL.");
    const response = await fetch(
      new URL("sucursales", apiUrl.replace(/\/?$/, "/")),
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok)
      throw new Error(`Sucursales respondió ${response.status}.`);
    const sucursales: unknown = await response.json();
    if (!Array.isArray(sucursales) || !sucursales.every(esSucursal))
      throw new Error("Respuesta de sucursales inválida.");
    return { sucursales };
  } catch (error) {
    console.error("Error al cargar sucursales:", error);
    return {
      sucursales: [],
      error:
        "No pudimos cargar las sucursales y sus horarios. Intentá nuevamente.",
    };
  }
}

export async function consultarDisponibilidad(
  formData: FormData,
): Promise<DisponibilidadResultado> {
  const filtros: FiltrosDisponibilidad = {
    sucursalId: String(formData.get("sucursalId") ?? ""),
    fecha: String(formData.get("fecha") ?? ""),
    hora: String(formData.get("hora") ?? ""),
    personas: String(formData.get("personas") ?? ""),
  };
  const errores = validarFiltros(filtros);
  if (Object.keys(errores).length) return { mesas: [], errores };

  try {
    const apiUrl = process.env.API_URL;
    if (!apiUrl) throw new Error("Falta API_URL.");
    const url = new URL(
      `sucursales/${filtros.sucursalId}/mesas-disponibles`,
      apiUrl.replace(/\/?$/, "/"),
    );
    url.search = new URLSearchParams({
      fecha: filtros.fecha,
      hora: filtros.hora,
      personas: filtros.personas,
    }).toString();
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        const detalle = await response.json();
        const mensaje = Array.isArray(detalle.message)
          ? detalle.message.join(" ")
          : detalle.message;
        return {
          mesas: [],
          error:
            typeof mensaje === "string"
              ? mensaje
              : "Revisá los datos de la búsqueda.",
        };
      }
      throw new Error(`Disponibilidad respondió ${response.status}.`);
    }
    const mesas: unknown = await response.json();
    if (!Array.isArray(mesas) || !mesas.every(esMesa))
      throw new Error("Respuesta de disponibilidad inválida.");
    return { mesas };
  } catch (error) {
    console.error("Error al consultar disponibilidad:", error);
    return {
      mesas: [],
      error:
        "No pudimos consultar la disponibilidad. Intentá de nuevo en un momento.",
    };
  }
}
