import { esUnidad, type Unidad } from "@/lib/inventario";

export type EstadoAlerta = "ACTIVA" | "VISTA";

export type AlertaInsumo = {
  id: number;
  insumoId: number;
  insumo: string;
  cantidad: number;
  minimo: number;
  unidad: Unidad | null;
  estado: EstadoAlerta;
  creadaEn: string;
};

export const INTERVALO_ALERTAS_MS = 60_000;

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

export function leerAlerta(valor: unknown): AlertaInsumo | null {
  if (!esObjeto(valor) || !esId(valor.id) || !esId(valor.insumoId)) return null;
  if (typeof valor.insumo !== "string" || !valor.insumo.trim()) return null;
  if (valor.estado !== "ACTIVA" && valor.estado !== "VISTA") return null;
  const cantidad = leerNumero(valor.cantidad);
  const minimo = leerNumero(valor.minimo);
  const { creadaEn } = valor;
  if (cantidad === null || minimo === null) return null;
  if (typeof creadaEn !== "string" || Number.isNaN(Date.parse(creadaEn))) return null;
  const unidad = typeof valor.unidad === "string" ? valor.unidad.trim().toLowerCase() : null;
  return {
    id: valor.id,
    insumoId: valor.insumoId,
    insumo: valor.insumo,
    cantidad,
    minimo,
    unidad: esUnidad(unidad) ? unidad : null,
    estado: valor.estado,
    creadaEn,
  };
}

export function leerAlertas(valor: unknown): AlertaInsumo[] | null {
  if (!Array.isArray(valor)) return null;
  const pendientes = valor.filter((alerta) => !esObjeto(alerta) || alerta.estado !== "RESUELTA");
  const alertas = pendientes.map(leerAlerta);
  return alertas.every((alerta): alerta is AlertaInsumo => alerta !== null) ? alertas : null;
}

export function contarActivas(alertas: AlertaInsumo[]): number {
  return alertas.filter((alerta) => alerta.estado === "ACTIVA").length;
}

export function ordenarAlertas(alertas: AlertaInsumo[]): AlertaInsumo[] {
  return [...alertas].sort(
    (a, b) =>
      Number(b.estado === "ACTIVA") - Number(a.estado === "ACTIVA") ||
      Date.parse(b.creadaEn) - Date.parse(a.creadaEn),
  );
}

export function formatoContadorAlertas(activas: number): string {
  return activas > 99 ? "99+" : String(activas);
}

export function textoActivas(activas: number): string {
  return activas === 1 ? "1 alerta activa" : `${activas} alertas activas`;
}

const FORMATO_FECHA = new Intl.DateTimeFormat("es-SV", {
  timeZone: "America/El_Salvador",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatoFechaAlerta(iso: string): string {
  return FORMATO_FECHA.format(new Date(iso)).replace(",", "");
}
