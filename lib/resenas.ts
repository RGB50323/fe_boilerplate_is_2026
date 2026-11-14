export const RESENAS_POR_PAGINA = 10;

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
