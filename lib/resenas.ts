export type Resena = {
  id: number;
  estrellas: number;
  comentario: string | null;
  fecha: string;
  cliente: string;
};

export type Distribucion = Record<1 | 2 | 3 | 4 | 5, number>;

export type ResenasPlatillo = {
  promedio: number | null;
  total: number;
  distribucion: Distribucion;
  pagina: number;
  totalPaginas: number;
  resenas: Resena[];
};

// Siempre con un decimal: 4 -> "4.0"
export function formatoPromedio(promedio: number): string {
  return promedio.toFixed(1);
}

const fechaCorta = new Intl.DateTimeFormat("es-SV", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

// "2026-10-28" -> "28 oct 2026"
export function formatoFecha(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return fecha;
  return fechaCorta.format(d).replace(/\./g, "");
}

export function textoTotal(total: number): string {
  return `${total} ${total === 1 ? "reseña" : "reseñas"}`;
}

function esDistribucion(valor: unknown): valor is Distribucion {
  if (!valor || typeof valor !== "object") return false;
  const d = valor as Record<string, unknown>;
  return [1, 2, 3, 4, 5].every((n) => Number.isInteger(d[n]));
}

export function esResenasPlatillo(valor: unknown): valor is ResenasPlatillo {
  if (!valor || typeof valor !== "object") return false;
  const r = valor as Record<string, unknown>;
  return (
    Number.isInteger(r.total) &&
    esDistribucion(r.distribucion) &&
    Number.isInteger(r.pagina) &&
    Number.isInteger(r.totalPaginas) &&
    (r.promedio === null || typeof r.promedio === "number") &&
    Array.isArray(r.resenas)
  );
}

export const MAX_COMENTARIO = 500;

// Platillo de un pedido pagado que el cliente todavía puede calificar
export type PlatilloPendienteResena = {
  pedidoId: number;
  numero: string | null;
  sucursal: string;
  platilloId: number;
  nombre: string;
  disponibleHasta: string;
};

export function esPlatilloPendiente(
  valor: unknown,
): valor is PlatilloPendienteResena {
  if (!valor || typeof valor !== "object") return false;
  const p = valor as Record<string, unknown>;
  return (
    Number.isInteger(p.pedidoId) &&
    Number.isInteger(p.platilloId) &&
    typeof p.nombre === "string" &&
    typeof p.sucursal === "string" &&
    typeof p.disponibleHasta === "string" &&
    (p.numero === null || typeof p.numero === "string")
  );
}

const fechaHora = new Intl.DateTimeFormat("es-SV", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/El_Salvador",
});

// Fecha límite para calificar en hora de El Salvador
export function formatoLimite(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fechaHora.format(d);
}

export const RANGO_INVALIDO =
  "La fecha final no puede ser anterior a la inicial.";
export const SIN_RESENAS_PERIODO = "Sin reseñas en el periodo seleccionado";
export const SIN_PERMISO_SECCION = "No tienes permiso para ver esta sección";

// H23: reporte de calificaciones de la sucursal del gerente
export type ReporteCalificaciones = {
  sucursal: string;
  promedio: number | null;
  total: number;
  distribucion: Distribucion;
  desde: string | null;
  hasta: string | null;
};

export function esReporteCalificaciones(
  valor: unknown,
): valor is ReporteCalificaciones {
  if (!valor || typeof valor !== "object") return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r.sucursal === "string" &&
    (r.promedio === null || typeof r.promedio === "number") &&
    Number.isInteger(r.total) &&
    esDistribucion(r.distribucion)
  );
}

// Valida el rango antes de pedir el reporte; null si está bien
export function errorRango(desde: string, hasta: string): string | null {
  return desde && hasta && hasta < desde ? RANGO_INVALIDO : null;
}
