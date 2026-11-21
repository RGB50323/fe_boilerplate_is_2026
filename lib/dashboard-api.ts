
import {
  rangoDelPeriodo,
  validarRango,
  type FiltrosDashboard,
} from "@/lib/dashboard";
import { usarDatosDePrueba } from "@/lib/dashboard-datos-prueba";
import {
  getSession,
  getUsuarioActual,
  ROL_GERENTE,
  ROLES_DASHBOARD,
} from "@/lib/session";

export type MotivoError = "sin-sesion" | "sin-acceso" | "rango-invalido" | "error";
export type ErrorDashboard = { error: string; motivo: MotivoError };

export const ERROR_GENERAL = "No pudimos cargar el dashboard";
const ERROR_SESION = "Tu sesión expiró. Iniciá sesión de nuevo.";
const ERROR_ACCESO = "No tenés acceso al dashboard de ventas.";

export const STATUS_POR_MOTIVO: Record<MotivoError, number> = {
  "sin-sesion": 401,
  "sin-acceso": 403,
  "rango-invalido": 400,
  error: 502,
};

export type ConsultaDashboard = {
  rango: { desde: string; hasta: string };
  sucursalId?: number;
  dia?: number;
  datosPrueba: boolean;
};

export function esError(x: unknown): x is ErrorDashboard {
  return typeof x === "object" && x !== null && "motivo" in x && "error" in x;
}

export async function prepararConsulta(
  filtros: FiltrosDashboard,
): Promise<ConsultaDashboard | ErrorDashboard> {
  const rango = rangoDelPeriodo(filtros);
  if (Object.keys(validarRango(rango.desde, rango.hasta)).length) {
    return { error: "El rango de fechas no es válido.", motivo: "rango-invalido" };
  }

  const datosPrueba = usarDatosDePrueba();
  const usuario = await getUsuarioActual();
  if (usuario.estado === "sin-sesion") {
    return { error: ERROR_SESION, motivo: "sin-sesion" };
  }
  if (usuario.estado === "ok" && !ROLES_DASHBOARD.includes(usuario.usuario.rol)) {
    return { error: ERROR_ACCESO, motivo: "sin-acceso" };
  }
  if (usuario.estado === "error" && !datosPrueba) {
    return { error: ERROR_GENERAL, motivo: "error" };
  }

  // El gerente de sucursal solo consulta la suya, sin importar el filtro.
  const sucursalGerente =
    usuario.estado === "ok" && usuario.usuario.rol === ROL_GERENTE
      ? (usuario.usuario.sucursalId ?? undefined)
      : null;

  return {
    rango,
    sucursalId:
      sucursalGerente !== null
        ? sucursalGerente
        : filtros.sucursalId
          ? Number(filtros.sucursalId)
          : undefined,
    dia: filtros.dia ? Number(filtros.dia) : undefined,
    datosPrueba,
  };
}

export async function pedirApi(
  ruta: string,
  params: Record<string, string | number | undefined>,
): Promise<Response | ErrorDashboard> {
  const apiUrl = process.env.API_URL;
  const token = await getSession();
  if (!apiUrl || !token) {
    console.error("Falta API_URL o la sesión para consultar el dashboard.");
    return { error: ERROR_GENERAL, motivo: "error" };
  }

  const url = new URL(ruta, apiUrl.replace(/\/?$/, "/"));
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined) url.searchParams.set(clave, String(valor));
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 401) return { error: ERROR_SESION, motivo: "sin-sesion" };
    if (res.status === 403) return { error: ERROR_ACCESO, motivo: "sin-acceso" };
    if (!res.ok) {
      console.error(`${ruta} respondió ${res.status}`);
      return { error: ERROR_GENERAL, motivo: "error" };
    }
    return res;
  } catch (error) {
    console.error(`Error al consultar ${ruta}:`, error);
    return { error: ERROR_GENERAL, motivo: "error" };
  }
}
