"use server";

import type {
  DashboardRespuesta,
  FiltrosDashboard,
  VentasPagina,
} from "@/lib/dashboard";
import { VENTAS_POR_PAGINA } from "@/lib/dashboard";
import {
  ERROR_GENERAL,
  esError,
  pedirApi,
  prepararConsulta,
  type ErrorDashboard,
} from "@/lib/dashboard-api";
import { datosDePrueba, ventasDePrueba } from "@/lib/dashboard-datos-prueba";

type ConError = { [K in "dashboard" | "ventas"]?: undefined } & ErrorDashboard;

export type ResultadoDashboard =
  | { dashboard: DashboardRespuesta; error?: undefined }
  | ConError;

export type ResultadoVentas =
  | { ventas: VentasPagina; error?: undefined }
  | ConError;

// Indicadores, platillos y horarios pico (GET /dashboard/ventas).
export async function consultarDashboard(
  filtros: FiltrosDashboard,
): Promise<ResultadoDashboard> {
  const consulta = await prepararConsulta(filtros);
  if (esError(consulta)) return consulta;
  const { rango, sucursalId, dia } = consulta;

  if (consulta.datosPrueba) {
    return { dashboard: datosDePrueba({ ...rango, sucursalId, dia }) };
  }

  const res = await pedirApi("dashboard/ventas", {
    ...rango,
    sucursalId,
    diaSemana: dia,
  });
  if (esError(res)) return res;
  try {
    return { dashboard: (await res.json()) as DashboardRespuesta };
  } catch {
    return { error: ERROR_GENERAL, motivo: "error" };
  }
}

// Lista paginada de ventas confirmadas (GET /dashboard/ventas/detalle).
export async function consultarVentas(
  filtros: FiltrosDashboard,
  pagina: number,
): Promise<ResultadoVentas> {
  if (!Number.isInteger(pagina) || pagina < 1) {
    return { error: "La página no es válida.", motivo: "error" };
  }
  const consulta = await prepararConsulta(filtros);
  if (esError(consulta)) return consulta;
  const { rango, sucursalId } = consulta;

  if (consulta.datosPrueba) {
    return { ventas: ventasDePrueba({ ...rango, sucursalId }, pagina) };
  }

  const res = await pedirApi("dashboard/ventas/detalle", {
    ...rango,
    sucursalId,
    pagina,
    porPagina: VENTAS_POR_PAGINA,
  });
  if (esError(res)) return res;
  try {
    return { ventas: (await res.json()) as VentasPagina };
  } catch {
    return { error: ERROR_GENERAL, motivo: "error" };
  }
}
