import { getSession } from "@/lib/session";

export type Resultado<T> =
  | { ok: true; datos: T }
  | {
      ok: false;
      error: string;
      sinSesion?: boolean;
      estado?: number;
      errores?: Record<string, string>;
    };

export const ERROR_GENERICO =
  "No pudimos completar la operación. Intenta de nuevo.";
const SIN_SESION = "Tu sesión expiró. Inicia sesión de nuevo.";
const SIN_PERMISO = "No tienes permiso para realizar esta acción.";

type Opciones = {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  cuerpo?: unknown;
  mensajes?: Partial<Record<number, string>>;
  detallarErrores?: boolean;
};

export async function llamar<T>(
  ruta: string,
  {
    metodo = "GET",
    cuerpo,
    mensajes = {},
    detallarErrores = false,
  }: Opciones = {},
): Promise<Resultado<T>> {
  try {
    const token = await getSession();
    if (!token) return { ok: false, error: SIN_SESION, sinSesion: true };

    const apiUrl = process.env.API_URL;
    if (!apiUrl) throw new Error("Falta API_URL.");

    const esFormData = cuerpo instanceof FormData;
    const response = await fetch(new URL(ruta, apiUrl.replace(/\/?$/, "/")), {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(cuerpo === undefined || esFormData
          ? {}
          : { "Content-Type": "application/json" }),
      },
      body:
        cuerpo === undefined
          ? undefined
          : esFormData
            ? cuerpo
            : JSON.stringify(cuerpo),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 401) {
      return { ok: false, error: SIN_SESION, sinSesion: true };
    }
    if (response.status === 403) return { ok: false, error: SIN_PERMISO };
    if (!response.ok) {
      if (detallarErrores) {
        const detalle =
          response.status === 400
            ? await response.json().catch(() => null)
            : null;
        const errores: Record<string, string> = {};
        if (detalle?.errores && typeof detalle.errores === "object") {
          for (const [campo, mensaje] of Object.entries(detalle.errores)) {
            if (typeof mensaje === "string" && mensaje.trim())
              errores[campo] = mensaje;
          }
        }
        return {
          ok: false,
          error: mensajes[response.status] ?? ERROR_GENERICO,
          estado: response.status,
          errores,
        };
      }
      return { ok: false, error: mensajes[response.status] ?? ERROR_GENERICO };
    }
    return { ok: true, datos: (await response.json()) as T };
  } catch (error) {
    console.error(`Error en ${metodo} ${ruta}:`, error);
    return { ok: false, error: ERROR_GENERICO };
  }
}
