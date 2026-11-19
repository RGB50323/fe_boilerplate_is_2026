export interface BloqueOcupacion {
  horaInicio: string;
  horaFin: string;
  mesasReservadas: number;
  mesasDisponibles: number;
  porcentajeOcupacion: number | null;
}

export interface OcupacionProyectada {
  fecha: string;
  sucursalId: number;
  sucursal: string;
  mesasActivas: number;
  calculable: boolean;
  bloques: BloqueOcupacion[];
}

export const SIN_MESAS_ACTIVAS =
  "No es posible calcular la ocupación proyectada porque la sucursal no tiene mesas activas registradas.";
export const SIN_HORARIO_ATENCION =
  "La sucursal no atiende en la fecha seleccionada.";
export const SIN_PERMISO_OCUPACION =
  "No tienes permiso para ver la ocupación de esta sucursal.";

export function fechaHoyElSalvador(ahora = new Date()): string {
  // El Salvador está en UTC-6 todo el año
  const local = new Date(ahora.getTime() - 6 * 60 * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatoFechaBonita(fecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const [año, mes, día] = fecha.split("-").map(Number);
  const fechaD = new Date(Date.UTC(año, mes - 1, día, 12, 0, 0));
  return fechaD.toLocaleDateString("es-SV", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

export function esBloqueOcupacion(valor: unknown): valor is BloqueOcupacion {
  if (!esObjeto(valor)) return false;
  return (
    typeof valor.horaInicio === "string" &&
    typeof valor.horaFin === "string" &&
    typeof valor.mesasReservadas === "number" &&
    typeof valor.mesasDisponibles === "number" &&
    (valor.porcentajeOcupacion === null ||
      typeof valor.porcentajeOcupacion === "number")
  );
}

export function esOcupacionProyectada(
  valor: unknown,
): valor is OcupacionProyectada {
  if (!esObjeto(valor)) return false;
  return (
    typeof valor.fecha === "string" &&
    typeof valor.sucursalId === "number" &&
    typeof valor.sucursal === "string" &&
    typeof valor.mesasActivas === "number" &&
    typeof valor.calculable === "boolean" &&
    Array.isArray(valor.bloques) &&
    valor.bloques.every(esBloqueOcupacion)
  );
}

export function urlSocketOcupacion(env: {
  API_URL?: string;
  SOCKET_URL?: string;
}): string {
  const base = env.SOCKET_URL || (env.API_URL && new URL(env.API_URL).origin);
  if (!base) {
    throw new Error("Falta la variable de entorno API_URL (o SOCKET_URL).");
  }
  return `${base.replace(/\/+$/, "")}/ocupacion`;
}
