"use server";

import {
  validarFiltros,
  type FiltrosMenu,
  type MenuRespuesta,
} from "@/lib/menu";

export type MenuResultado = { menu?: MenuRespuesta; error?: string };

function esMenu(valor: unknown): valor is MenuRespuesta {
  if (!valor || typeof valor !== "object") return false;
  const menu = valor as Record<string, unknown>;
  return Number.isInteger(menu.sucursalId) && Array.isArray(menu.categorias);
}

export async function consultarMenu(
  sucursalId: number,
  filtros: FiltrosMenu,
): Promise<MenuResultado> {
  if (Object.keys(validarFiltros(filtros)).length) {
    return { error: "Revisá los filtros indicados." };
  }

  try {
    const apiUrl = process.env.API_URL;
    if (!apiUrl) throw new Error("Falta API_URL.");

    const url = new URL(
      `sucursales/${sucursalId}/menu`,
      apiUrl.replace(/\/?$/, "/"),
    );
    (Object.entries(filtros) as [keyof FiltrosMenu, string][]).forEach(
      ([campo, valor]) => {
        if (valor.trim() !== "") url.searchParams.set(campo, valor.trim());
      },
    );

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Menú respondió ${response.status}.`);

    const menu: unknown = await response.json();
    if (!esMenu(menu)) throw new Error("Respuesta de menú inválida.");
    return { menu };
  } catch (error) {
    console.error("Error al cargar el menú:", error);
    return { error: "No pudimos cargar el menú" };
  }
}