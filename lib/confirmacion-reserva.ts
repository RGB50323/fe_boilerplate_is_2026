import {
  fechaValida,
  validarFiltros,
  type HorarioSucursal,
  type DatosReservacion,
} from "@/lib/reservaciones";

export type CamposReserva = {
  mesaId: string;
  sucursalId: string;
  fecha: string;
  hora: string;
  personas: string;
  nombre: string;
  telefono: string;
  correo: string;
};
export type ErroresReserva = Partial<Record<keyof CamposReserva, string>>;
export type Reservacion = {
  reservacionId: string;
  estado: "CONFIRMADA" | "CANCELADA";
  mesaId: number;
  mesa: number;
  sucursalId: number;
  sucursal: string;
  fecha: string;
  hora: string;
  personas: number;
};
export type MisReservaciones = {
  datos: Reservacion[];
  pagina: number;
  totalPaginas: number;
  total: number;
};

export function validarReserva(
  datos: CamposReserva,
  capacidad?: number,
  horarios?: HorarioSucursal[],
): ErroresReserva {
  const errores: ErroresReserva = validarFiltros(datos, horarios);
  if (
    !/^\d+$/.test(datos.mesaId) ||
    Number(datos.mesaId) < 1 ||
    Number(datos.mesaId) > 2147483647
  )
    errores.mesaId = "Seleccioná una mesa válida.";
  if (!datos.nombre.trim()) errores.nombre = "Ingresá tu nombre completo.";
  else if (datos.nombre.trim().length > 120)
    errores.nombre = "El nombre admite hasta 120 caracteres.";
  if (!/^\d{4}-\d{4}$/.test(datos.telefono.trim()))
    errores.telefono = "Ingresá un teléfono con formato ####-####.";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim()) ||
    datos.correo.trim().length > 160
  )
    errores.correo = "Ingresá un correo electrónico válido.";
  if (capacidad !== undefined && Number(datos.personas) > capacidad)
    errores.personas = `Esta mesa admite hasta ${capacidad} personas.`;
  return errores;
}

export function esReservacion(valor: unknown): valor is Reservacion {
  if (!valor || typeof valor !== "object") return false;
  const r = valor as Record<string, unknown>;
  return (
    typeof r.reservacionId === "string" &&
    /^R-\d+$/.test(r.reservacionId) &&
    (r.estado === "CONFIRMADA" || r.estado === "CANCELADA") &&
    [r.mesaId, r.mesa, r.sucursalId, r.personas].every(
      (n) => Number.isInteger(n) && Number(n) > 0,
    ) &&
    typeof r.sucursal === "string" &&
    typeof r.fecha === "string" &&
    fechaValida(r.fecha) &&
    typeof r.hora === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(r.hora)
  );
}

export function rutaReserva(datos: DatosReservacion): string {
  return (
    "/reservas/nueva?" +
    new URLSearchParams(
      Object.entries(datos).map(([k, v]) => [k, String(v)]),
    ).toString()
  );
}

export function rutaDisponibilidad(
  datos: Pick<CamposReserva, "sucursalId" | "fecha" | "hora" | "personas">,
): string {
  return (
    "/reservas?" +
    new URLSearchParams({
      sucursalId: datos.sucursalId,
      fecha: datos.fecha,
      hora: datos.hora,
      personas: datos.personas,
    }).toString()
  );
}
