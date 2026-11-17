import { cache } from "react";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Guarda el token de sesión en una cookie httpOnly (no accesible desde JS del cliente).
export async function createSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const ROL_GERENTE_GENERAL = "GERENTE_GENERAL";

export type UsuarioActual = { id: string; email: string; rol: string };

export type EstadoUsuario =
  | { estado: "ok"; usuario: UsuarioActual }
  | { estado: "sin-sesion" }
  | { estado: "error" };

export const getUsuarioActual = cache(async (): Promise<EstadoUsuario> => {
  const token = await getSession();
  if (!token) return { estado: "sin-sesion" };

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    console.error("Falta la variable de entorno API_URL.");
    return { estado: "error" };
  }

  try {
    const res = await fetch(new URL("auth/me", apiUrl.replace(/\/?$/, "/")), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 401) return { estado: "sin-sesion" };
    if (!res.ok) {
      console.error(`auth/me respondió ${res.status}`);
      return { estado: "error" };
    }

    // Ajustar al formato de respuesta real de la API.
    const data = await res.json();
    const rol: unknown = data.rol ?? data.role;
    if (typeof rol !== "string") {
      console.error("La respuesta de auth/me no incluye el rol.");
      return { estado: "error" };
    }
    return {
      estado: "ok",
      usuario: { id: String(data.id), email: String(data.email ?? ""), rol },
    };
  } catch (error) {
    console.error("Error al consultar auth/me:", error);
    return { estado: "error" };
  }
});