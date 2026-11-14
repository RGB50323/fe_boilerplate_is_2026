export const RESENAS_POR_PAGINA = 10;

export type Resena = {
  id: number;
  estrellas: number;
  comentario: string | null;
  fecha: string;
  cliente: string;
};

export type ResenasPlatillo = {
  promedio: number | null;
  total: number;
  pagina: number;
  totalPaginas: number;
  resenas: Resena[];
};

// Siempre con un decimal: 4 -> "4.0"
export function formatoPromedio(promedio: number): string {
  return promedio.toFixed(1);
}

// "2026-10-28" -> "28/10/2026"
export function formatoFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}

export function esResenasPlatillo(valor: unknown): valor is ResenasPlatillo {
  if (!valor || typeof valor !== "object") return false;
  const r = valor as Record<string, unknown>;
  return (
    Number.isInteger(r.total) &&
    Number.isInteger(r.pagina) &&
    Number.isInteger(r.totalPaginas) &&
    (r.promedio === null || typeof r.promedio === "number") &&
    Array.isArray(r.resenas)
  );
}
