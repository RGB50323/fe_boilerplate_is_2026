import { getSession } from "@/lib/session";

export type UsuarioActual = { id: string; email: string; rol: string };

export async function obtenerUsuarioActual(): Promise<UsuarioActual | null> {
  const token = await getSession();
  const apiUrl = process.env.API_URL;
  if (!token || !apiUrl) return null;

  try {
    const response = await fetch(
      new URL("auth/me", apiUrl.replace(/\/?$/, "/")),
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as UsuarioActual;
  } catch {
    return null;
  }
}