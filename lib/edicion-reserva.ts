import { esHorarioSucursal } from "@/lib/reservaciones";
import { esReservacion, type Reservacion } from "@/lib/confirmacion-reserva";
import type { HorarioSucursal, MesaDisponible } from "@/lib/reservaciones";

export type DetalleReserva = Reservacion & {
  capacidad: number;
  version: string;
  modificadaEn: string | null;
  horarios: HorarioSucursal[];
};
export type CamposEdicion = {
  fecha: string;
  hora: string;
  personas: string;
  mesaId: number;
  version: string;
};
export type ResultadoEdicion = {
  reserva?: DetalleReserva;
  error?: string;
  errores?: Record<string, string>;
  sinSesion?: boolean;
  recargar?: boolean;
  alternativas?: MesaDisponible[];
};
export function puedeModificarReserva(
  reserva: Pick<Reservacion, "estado" | "fecha" | "hora">,
  ahora = new Date(),
): boolean {
  return (
    reserva.estado === "CONFIRMADA" &&
    new Date(`${reserva.fecha}T${reserva.hora}:00-06:00`).getTime() >
      ahora.getTime()
  );
}

export const idReservaValido = (id: unknown): id is string =>
  typeof id === "string" &&
  /^R-\d{1,10}$/.test(id) &&
  Number(id.slice(2)) > 0 &&
  Number(id.slice(2)) <= 2147483647;
export function esDetalleReserva(valor: unknown): valor is DetalleReserva {
  if (!esReservacion(valor)) return false;
  const dato = valor as DetalleReserva;
  return (
    Number.isInteger(dato.capacidad) &&
    dato.capacidad > 0 &&
    versionValida(dato.version) &&
    Array.isArray(dato.horarios) &&
    dato.horarios.every(esHorarioSucursal)
  );
}

export const versionValida = (valor: unknown): valor is string =>
  typeof valor === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(valor);

export function esCamposEdicion(valor: unknown): valor is CamposEdicion {
  if (!valor || typeof valor !== "object") return false;
  const datos = valor as Record<string, unknown>;
  return (
    typeof datos.fecha === "string" &&
    typeof datos.hora === "string" &&
    typeof datos.personas === "string" &&
    typeof datos.mesaId === "number" &&
    typeof datos.version === "string"
  );
}
const PREFIJO_EDICION = "/perfil/reservaciones/";
const SUFIJO_EDICION = "/editar";
export const rutaEdicion = (id: string) =>
  PREFIJO_EDICION + id + SUFIJO_EDICION;
export const loginEdicion = (id: string) =>
  "/login?next=" + encodeURIComponent(rutaEdicion(id));
export function esRutaEdicion(ruta: string) {
  return (
    ruta.startsWith(PREFIJO_EDICION) &&
    ruta.endsWith(SUFIJO_EDICION) &&
    idReservaValido(ruta.slice(PREFIJO_EDICION.length, -SUFIJO_EDICION.length))
  );
}
