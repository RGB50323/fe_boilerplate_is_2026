"use server";

import { esResenasPlatillo, type ResenasPlatillo } from "@/lib/resenas";

export type ResenasResultado = { datos?: ResenasPlatillo; error?: string };

export async function consultarResenas(
  platilloId: number,
  pagina: number,
): Promise<ResenasResultado> {
  if (!Number.isInteger(platilloId) || platilloId < 1) {
    return { error: "Platillo inválido." };
  }
  if (!Number.isInteger(pagina) || pagina < 1) {
    return { error: "Página inválida." };
  }

  try {
    const apiUrl = process.env.API_URL;
    if (!apiUrl) throw new Error("Falta API_URL.");

    const url = new URL(
      `platillos/${platilloId}/resenas`,
      apiUrl.replace(/\/?$/, "/"),
    );
    url.searchParams.set("pagina", String(pagina));

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) {
      return { error: "Este platillo ya no está disponible." };
    }
    if (!response.ok) throw new Error(`Reseñas respondió ${response.status}.`);

    const datos: unknown = await response.json();
    if (!esResenasPlatillo(datos))
      throw new Error("Respuesta de reseñas inválida.");
    return { datos };
  } catch (error) {
    console.error("Error al cargar las reseñas:", error);
    return { error: "No pudimos cargar las reseñas" };
  }
}
