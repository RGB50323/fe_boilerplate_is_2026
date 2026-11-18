import type { Pagina } from "@/lib/paginacion";

export const UNIDADES = ["lb", "kg", "l", "unidad"] as const;
export type Unidad = (typeof UNIDADES)[number];

export type EstadoInsumo = "NORMAL" | "BAJO";

export type Insumo = {
  id: number;
  nombre: string;
  unidad: Unidad;
  cantidad: number;
  minimo: number;
  estado: EstadoInsumo;
};

export type TipoMovimiento = "ENTRADA" | "SALIDA";

export type MovimientoRegistrado = {
  movimientoId: number;
  cantidadAnterior: number;
  cantidadActual: number;
};

export type Movimiento = {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  usuario: string | null;
  fecha: string;
  hora: string;
};

export type ValoresInsumo = { nombre: string; unidad: string; minimo: string };
export type ErroresInsumo = Partial<Record<keyof ValoresInsumo, string>>;
export type NuevoInsumo = { nombre: string; unidad: Unidad; minimo: number };

export type ValoresMovimiento = { tipo: TipoMovimiento; cantidad: string; motivo: string };
export type ErroresMovimiento = Partial<Record<"cantidad" | "motivo", string>>;
export type NuevoMovimiento = { tipo: TipoMovimiento; cantidad: number; motivo: string };

export const NOMBRE_MAX = 100;
export const MOTIVO_MAX = 200;
export const MENSAJE_CANTIDAD = "Ingresa una cantidad mayor a 0.";
export const MENSAJE_DUPLICADO = "Ya existe un insumo con ese nombre en la sucursal";

type Objeto = Record<string, unknown>;

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esId(valor: unknown): valor is number {
  return Number.isInteger(valor) && (valor as number) > 0;
}

function leerNumero(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor === "string" && valor.trim() !== "") {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }
  return null;
}

export function esUnidad(valor: unknown): valor is Unidad {
  return typeof valor === "string" && (UNIDADES as readonly string[]).includes(valor);
}

function leerUnidad(valor: unknown): Unidad | null {
  if (typeof valor !== "string") return null;
  const unidad = valor.trim().toLowerCase();
  return esUnidad(unidad) ? unidad : null;
}

export function estadoDe(cantidad: number, minimo: number): EstadoInsumo {
  return cantidad <= minimo ? "BAJO" : "NORMAL";
}

export function leerInsumo(valor: unknown): Insumo | null {
  if (!esObjeto(valor) || !esId(valor.id)) return null;
  if (typeof valor.nombre !== "string" || !valor.nombre.trim()) return null;
  const unidad = leerUnidad(valor.unidad);
  const cantidad = valor.cantidad === undefined ? 0 : leerNumero(valor.cantidad);
  const minimo = leerNumero(valor.minimo);
  if (!unidad || cantidad === null || minimo === null) return null;
  const estado =
    valor.estado === "NORMAL" || valor.estado === "BAJO"
      ? valor.estado
      : estadoDe(cantidad, minimo);
  return { id: valor.id, nombre: valor.nombre, unidad, cantidad, minimo, estado };
}

export function leerInsumos(valor: unknown): Insumo[] | null {
  if (!Array.isArray(valor)) return null;
  const insumos = valor.map(leerInsumo);
  return insumos.every((insumo): insumo is Insumo => insumo !== null) ? insumos : null;
}

export function leerMovimientoRegistrado(valor: unknown): MovimientoRegistrado | null {
  if (!esObjeto(valor) || !esId(valor.movimientoId)) return null;
  const cantidadAnterior = leerNumero(valor.cantidadAnterior);
  const cantidadActual = leerNumero(valor.cantidadActual);
  if (cantidadAnterior === null || cantidadActual === null) return null;
  return { movimientoId: valor.movimientoId, cantidadAnterior, cantidadActual };
}

export function leerMovimiento(valor: unknown): Movimiento | null {
  if (!esObjeto(valor) || !esId(valor.id)) return null;
  if (valor.tipo !== "ENTRADA" && valor.tipo !== "SALIDA") return null;
  const cantidad = leerNumero(valor.cantidad);
  const { fecha, hora, motivo, usuario } = valor;
  if (cantidad === null || typeof motivo !== "string") return null;
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  if (typeof hora !== "string" || !/^\d{2}:\d{2}$/.test(hora)) return null;
  if (usuario !== null && typeof usuario !== "string") return null;
  return { id: valor.id, tipo: valor.tipo, cantidad, motivo, usuario, fecha, hora };
}

export function leerPaginaMovimientos(valor: unknown): Pagina<Movimiento> | null {
  if (!esObjeto(valor) || !Array.isArray(valor.datos)) return null;
  const datos = valor.datos.map(leerMovimiento);
  const { pagina, totalPaginas, total } = valor;
  if (!datos.every((m): m is Movimiento => m !== null)) return null;
  if (!Number.isInteger(pagina) || !Number.isInteger(totalPaginas) || !Number.isInteger(total)) {
    return null;
  }
  return {
    pagina: pagina as number,
    totalPaginas: totalPaginas as number,
    total: total as number,
    datos,
  };
}

export function ordenarInsumos(insumos: Insumo[]): Insumo[] {
  return [...insumos].sort((a, b) => Number(b.estado === "BAJO") - Number(a.estado === "BAJO"));
}

export function agregarInsumo(insumos: Insumo[], nuevo: Insumo): Insumo[] {
  return ordenarInsumos([nuevo, ...insumos.filter((i) => i.id !== nuevo.id)]);
}

export function actualizarCantidad(insumos: Insumo[], id: number, cantidad: number): Insumo[] {
  return ordenarInsumos(
    insumos.map((insumo) =>
      insumo.id === id ? { ...insumo, cantidad, estado: estadoDe(cantidad, insumo.minimo) } : insumo,
    ),
  );
}

function leerDecimal(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  return Number(limpio);
}

function decimalesDe(texto: string): number {
  return texto.trim().replace(",", ".").split(".")[1]?.length ?? 0;
}

export function validarInsumo(valores: ValoresInsumo): ErroresInsumo {
  const errores: ErroresInsumo = {};
  const nombre = valores.nombre.trim();
  if (!nombre) errores.nombre = "El nombre del insumo es obligatorio.";
  else if (nombre.length > NOMBRE_MAX) {
    errores.nombre = `El nombre no puede superar los ${NOMBRE_MAX} caracteres.`;
  }
  if (!esUnidad(valores.unidad)) errores.unidad = "Selecciona una unidad: lb, kg, l o unidad.";
  if (!valores.minimo.trim()) errores.minimo = "La cantidad mínima es obligatoria.";
  else if (leerDecimal(valores.minimo) === null) {
    errores.minimo = "La cantidad mínima debe ser un número mayor o igual a 0.";
  } else if (decimalesDe(valores.minimo) > 3) {
    errores.minimo = "La cantidad mínima admite máximo tres decimales.";
  }
  return errores;
}

export function nuevoInsumo(valores: ValoresInsumo): NuevoInsumo | null {
  if (Object.keys(validarInsumo(valores)).length > 0) return null;
  return {
    nombre: valores.nombre.trim(),
    unidad: valores.unidad as Unidad,
    minimo: leerDecimal(valores.minimo) as number,
  };
}

export function validarMovimiento(valores: ValoresMovimiento): ErroresMovimiento {
  const errores: ErroresMovimiento = {};
  const cantidad = leerDecimal(valores.cantidad);
  if (cantidad === null || cantidad <= 0) errores.cantidad = MENSAJE_CANTIDAD;
  else if (decimalesDe(valores.cantidad) > 3) {
    errores.cantidad = "La cantidad admite máximo tres decimales.";
  }
  const motivo = valores.motivo.trim();
  if (!motivo) errores.motivo = "El motivo es obligatorio.";
  else if (motivo.length > MOTIVO_MAX) {
    errores.motivo = `El motivo no puede superar los ${MOTIVO_MAX} caracteres.`;
  }
  return errores;
}

export function nuevoMovimiento(valores: ValoresMovimiento): NuevoMovimiento | null {
  if (Object.keys(validarMovimiento(valores)).length > 0) return null;
  return {
    tipo: valores.tipo,
    cantidad: leerDecimal(valores.cantidad) as number,
    motivo: valores.motivo.trim(),
  };
}

export function textoCantidad(cantidad: number): string {
  return String(Math.round(cantidad * 1000) / 1000);
}

export function formatoCantidad(cantidad: number, unidad: Unidad): string {
  if (unidad === "unidad" && Number.isInteger(cantidad)) return String(cantidad);
  const redondeada = Math.round(cantidad * 1000) / 1000;
  return Number.isInteger(redondeada * 100) ? redondeada.toFixed(2) : String(redondeada);
}

export function mensajeExcedeExistencia(insumo: Pick<Insumo, "cantidad" | "unidad">): string {
  return `La salida supera la existencia actual (${textoCantidad(insumo.cantidad)} ${insumo.unidad}).`;
}

export const MENSAJE_MAXIMO = "La entrada supera la cantidad máxima permitida.";

export function formatoFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}
