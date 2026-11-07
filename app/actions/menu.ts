"use server";

import { validarFiltros, type FiltrosMenu, type MenuRespuesta } from "@/lib/menu";
import { obtenerMenuMock } from "@/lib/menu-mock";

export type MenuResultado = { menu?: MenuRespuesta; error?: string };

export async function consultarMenu(
  sucursalId: number,
  filtros: FiltrosMenu,
): Promise<MenuResultado> {
  if (Object.keys(validarFiltros(filtros)).length) {
    return { error: "Revisá los filtros indicados." };
  }
  try {
    return { menu: await obtenerMenuMock(sucursalId, filtros) };
  } catch (error) {
    console.error("Error al cargar el menú:", error);
    return { error: "No pudimos cargar el menú" };
  }
}