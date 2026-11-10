"use server";

import {
  rangoDelPeriodo,
  validarRango,
  type DashboardRespuesta,
  type FiltrosDashboard,
} from "@/lib/dashboard";
import { datosDePrueba, usarDatosDePrueba } from "@/lib/dashboard-datos-prueba";
import { getSession, getUsuarioActual, ROL_GERENTE_GENERAL } from "@/lib/session";

export type ResultadoDashboard =
  | { dashboard: DashboardRespuesta; error?: undefined }
  | { dashboard?: undefined; error: string; motivo: "sin-sesion" | "sin-acceso" | "error" };

const ERROR_GENERAL = "No pudimos cargar el dashboard";

export async function consultarDashboard(
  filtros: FiltrosDashboard,
): Promise<ResultadoDashboard> {
  const rango = rangoDelPeriodo(filtros);
  if (Object.keys(validarRango(rango.desde, rango.hasta)).length) {
    return { error: "El rango de fechas no es válido.", motivo: "error" };
  }

  const datosPrueba = usarDatosDePrueba();
  const usuario = await getUsuarioActual();
  if (usuario.estado === "sin-sesion") {
    return { error: "Tu sesión expiró. Iniciá sesión de nuevo.", motivo: "sin-sesion" };
  }
  if (usuario.estado === "ok" && usuario.usuario.rol !== ROL_GERENTE_GENERAL) {
    return { error: "No tenés acceso al dashboard de ventas.", motivo: "sin-acceso" };
  }
  if (usuario.estado === "error" && !datosPrueba) {
    return { error: ERROR_GENERAL, motivo: "error" };
  }

  const sucursalId = filtros.sucursalId ? Number(filtros.sucursalId) : undefined;
  const dia = filtros.dia ? Number(filtros.dia) : undefined;

  if (datosPrueba) {
    return { dashboard: datosDePrueba({ ...rango, sucursalId, dia }) };
  }

  const apiUrl = process.env.API_URL;
  const token = await getSession();
  if (!apiUrl || !token) {
    console.error("Falta API_URL o la sesión para consultar el dashboard.");
    return { error: ERROR_GENERAL, motivo: "error" };
  }

  const url = new URL("dashboard/ventas", apiUrl.replace(/\/?$/, "/"));
  url.searchParams.set("desde", rango.desde);
  url.searchParams.set("hasta", rango.hasta);
  if (sucursalId !== undefined) url.searchParams.set("sucursalId", String(sucursalId));
  if (dia !== undefined) url.searchParams.set("diaSemana", String(dia));

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 401) {
      return { error: "Tu sesión expiró. Iniciá sesión de nuevo.", motivo: "sin-sesion" };
    }
    if (res.status === 403) {
      return { error: "No tenés acceso al dashboard de ventas.", motivo: "sin-acceso" };
    }
    if (!res.ok) {
      console.error(`dashboard/ventas respondió ${res.status}`);
      return { error: ERROR_GENERAL, motivo: "error" };
    }
    return { dashboard: (await res.json()) as DashboardRespuesta };
  } catch (error) {
    console.error("Error al consultar el dashboard:", error);
    return { error: ERROR_GENERAL, motivo: "error" };
  }
}
