import type { NextRequest } from "next/server";
import {
  filtrosDesdeParams,
  generarCsvSucursales,
  nombreArchivoCsv,
} from "@/lib/dashboard";
import {
  esError,
  pedirApi,
  prepararConsulta,
  STATUS_POR_MOTIVO,
  type ErrorDashboard,
} from "@/lib/dashboard-api";
import { datosDePrueba } from "@/lib/dashboard-datos-prueba";

const BOM = "﻿"; // para que Excel respete las tildes

function responderError(e: ErrorDashboard) {
  return Response.json(e, { status: STATUS_POR_MOTIVO[e.motivo] });
}

// GET /dashboard/exportar?periodo=...&sucursal=...
// Descarga el CSV de ventas por sucursal (criterio 14): una fila por sucursal
// con ventas, pedidos y ticket promedio, y el total general. Usa los mismos
// filtros que la URL del dashboard.
export async function GET(request: NextRequest) {
  const filtros = filtrosDesdeParams(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const consulta = await prepararConsulta(filtros);
  if (esError(consulta)) return responderError(consulta);
  const { rango, sucursalId } = consulta;

  let csv: string;
  if (consulta.datosPrueba) {
    csv = generarCsvSucursales(datosDePrueba({ ...rango, sucursalId }));
  } else {
    const res = await pedirApi("dashboard/ventas/exportar", { ...rango, sucursalId });
    if (esError(res)) return responderError(res);
    csv = await res.text();
  }

  return new Response(csv.startsWith(BOM) ? csv : BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivoCsv(rango)}"`,
      "Cache-Control": "no-store",
    },
  });
}
