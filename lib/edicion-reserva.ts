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
export const idReservaValido = (id: string) =>
  /^R-\d{1,10}$/.test(id) &&
  Number(id.slice(2)) > 0 &&
  Number(id.slice(2)) <= 2147483647;
export function esDetalleReserva(valor: unknown): valor is DetalleReserva {
  if (!esReservacion(valor)) return false;
  const dato = valor as DetalleReserva;
  return (
    Number.isInteger(dato.capacidad) &&
    dato.capacidad > 0 &&
    typeof dato.version === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(dato.version) &&
    Array.isArray(dato.horarios) &&
    dato.horarios.every(
      (h) =>
        h &&
        Number.isInteger(h.diaSemana) &&
        h.diaSemana >= 0 &&
        h.diaSemana <= 6 &&
        typeof h.apertura === "string" &&
        /^\d{2}:\d{2}$/.test(h.apertura) &&
        typeof h.cierre === "string" &&
        /^\d{2}:\d{2}$/.test(h.cierre),
    )
  );
}
