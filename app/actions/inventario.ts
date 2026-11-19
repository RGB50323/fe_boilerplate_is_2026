"use server";

import { ERROR_GENERICO, llamar } from "@/lib/api";
import {
  MENSAJE_CANTIDAD,
  MENSAJE_DUPLICADO,
  leerInsumo,
  leerInsumos,
  leerMovimientoRegistrado,
  leerPaginaMovimientos,
  nuevoInsumo,
  nuevoMovimiento,
  type ErroresInsumo,
  type ErroresMovimiento,
  type Insumo,
  type Movimiento,
  type MovimientoRegistrado,
  type ValoresInsumo,
  type ValoresMovimiento,
} from "@/lib/inventario";
import type { Pagina } from "@/lib/paginacion";

const ERROR_CARGA = "No pudimos cargar el inventario";
const ERROR_CREAR = "No pudimos guardar el insumo. Intenta de nuevo.";
const ERROR_MOVIMIENTO = "No pudimos registrar el movimiento. Intenta de nuevo.";
const ERROR_HISTORIAL = "No pudimos cargar el historial";
const INSUMO_INEXISTENTE = "Este insumo ya no existe.";

export type InsumosResultado = { insumos: Insumo[] } | { sinSesion: true } | { error: string };

export type CrearInsumoResultado =
  | { insumo: Insumo }
  | { errores: ErroresInsumo }
  | { sinSesion: true }
  | { error: string };

export type MovimientoResultado =
  | { movimiento: MovimientoRegistrado }
  | { limiteExcedido: true }
  | { errores: ErroresMovimiento }
  | { sinSesion: true }
  | { error: string };

export type HistorialResultado =
  | { historial: Pagina<Movimiento> }
  | { sinSesion: true }
  | { error: string };

function esIdValido(id: number) {
  return Number.isInteger(id) && id > 0;
}

function soloCampos<T extends string>(
  errores: Record<string, string> | undefined,
  campos: readonly T[],
): Partial<Record<T, string>> {
  const resultado: Partial<Record<T, string>> = {};
  for (const campo of campos) {
    if (errores?.[campo]) resultado[campo] = errores[campo];
  }
  return resultado;
}

export async function listarInsumos(q = ""): Promise<InsumosResultado> {
  const texto = q.trim();
  const ruta = texto ? `inventario/insumos?q=${encodeURIComponent(texto)}` : "inventario/insumos";
  const resultado = await llamar<unknown>(ruta);
  if (!resultado.ok) {
    return resultado.sinSesion ? { sinSesion: true } : { error: ERROR_CARGA };
  }
  const insumos = leerInsumos(resultado.datos);
  if (!insumos) {
    console.error("Respuesta de insumos inválida.");
    return { error: ERROR_CARGA };
  }
  return { insumos };
}

export async function crearInsumo(valores: ValoresInsumo): Promise<CrearInsumoResultado> {
  const cuerpo = nuevoInsumo(valores);
  if (!cuerpo) return { error: "Revisa los campos del formulario." };

  const resultado = await llamar<unknown>("inventario/insumos", {
    metodo: "POST",
    cuerpo,
    detallarErrores: true,
  });
  if (!resultado.ok) {
    if (resultado.sinSesion) return { sinSesion: true };
    if (resultado.estado === 409) return { errores: { nombre: MENSAJE_DUPLICADO } };
    if (resultado.estado === 400) {
      const errores = soloCampos(resultado.errores, ["nombre", "unidad", "minimo"] as const);
      return Object.keys(errores).length > 0
        ? { errores }
        : { error: "Revisa los campos del formulario." };
    }
    return { error: resultado.error === ERROR_GENERICO ? ERROR_CREAR : resultado.error };
  }

  const datos = typeof resultado.datos === "object" && resultado.datos !== null ? resultado.datos : {};
  const insumo = leerInsumo({ cantidad: 0, ...cuerpo, ...datos });
  if (!insumo) {
    console.error("Respuesta al crear el insumo inválida.");
    return { error: ERROR_CREAR };
  }
  return { insumo };
}

export async function registrarMovimiento(
  insumoId: number,
  valores: ValoresMovimiento,
): Promise<MovimientoResultado> {
  const cuerpo = nuevoMovimiento(valores);
  if (!esIdValido(insumoId) || !cuerpo) return { error: ERROR_MOVIMIENTO };

  const resultado = await llamar<unknown>(`inventario/insumos/${insumoId}/movimientos`, {
    metodo: "POST",
    cuerpo,
    detallarErrores: true,
    mensajes: { 404: INSUMO_INEXISTENTE },
  });
  if (!resultado.ok) {
    if (resultado.sinSesion) return { sinSesion: true };
    if (resultado.estado === 422) return { limiteExcedido: true };
    if (resultado.estado === 400) {
      const { motivo } = soloCampos(resultado.errores, ["motivo"] as const);
      return { errores: motivo && !resultado.errores?.cantidad ? { motivo } : { cantidad: MENSAJE_CANTIDAD } };
    }
    return { error: resultado.error === ERROR_GENERICO ? ERROR_MOVIMIENTO : resultado.error };
  }

  const movimiento = leerMovimientoRegistrado(resultado.datos);
  if (!movimiento) {
    console.error("Respuesta al registrar el movimiento inválida.");
    return { error: ERROR_MOVIMIENTO };
  }
  return { movimiento };
}

export async function listarMovimientos(insumoId: number, pagina = 1): Promise<HistorialResultado> {
  if (!esIdValido(insumoId) || !Number.isInteger(pagina) || pagina < 1) {
    return { error: ERROR_HISTORIAL };
  }
  const resultado = await llamar<unknown>(
    `inventario/insumos/${insumoId}/movimientos?pagina=${pagina}`,
    { mensajes: { 404: INSUMO_INEXISTENTE } },
  );
  if (!resultado.ok) {
    if (resultado.sinSesion) return { sinSesion: true };
    return { error: resultado.error === ERROR_GENERICO ? ERROR_HISTORIAL : resultado.error };
  }
  const historial = leerPaginaMovimientos(resultado.datos);
  if (!historial) {
    console.error("Respuesta del historial de movimientos inválida.");
    return { error: ERROR_HISTORIAL };
  }
  return { historial };
}
