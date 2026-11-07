export type FiltrosDisponibilidad = {
  sucursalId: string;
  fecha: string;
  hora: string;
  personas: string;
};

export type ErroresDisponibilidad = Partial<
  Record<keyof FiltrosDisponibilidad, string>
>;

// Datos que H09 entrega al formulario de H10. clienteId nunca viene del cliente.
export type DatosReservacion = {
  mesaId: number;
  sucursalId: number;
  fecha: string;
  hora: string;
  personas: number;
};

export type MesaDisponible = {
  mesaId: number;
  numero: number;
  capacidad: number;
  zona: string | null;
};

export type HorarioSucursal = {
  diaSemana: number;
  apertura: string;
  cierre: string;
};

export type Sucursal = {
  id: number;
  nombre: string;
  horarios: HorarioSucursal[];
};

export function fechaLocal(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ahora);
  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const valor = new Date(`${fecha}T00:00:00Z`);
  return (
    !Number.isNaN(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha
  );
}

export function horasDisponibles(
  fecha: string,
  horarios: HorarioSucursal[],
  ahora = new Date(),
): string[] {
  if (!fechaValida(fecha)) return [];
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  const horario = horarios.find((item) => item.diaSemana === dia);
  if (!horario) return [];

  const enMinutos = (hora: string) => {
    const [horas, minutos] = hora.split(":").map(Number);
    return horas * 60 + minutos;
  };
  const apertura = enMinutos(horario.apertura);
  const cierre = enMinutos(horario.cierre);
  const horas: string[] = [];
  // Se conservan las reglas de H09: duración de 2 horas e inicios en :00 o :30.
  for (
    let minuto = Math.ceil(apertura / 30) * 30;
    minuto <= cierre - 120;
    minuto += 30
  ) {
    const hora = `${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`;
    if (new Date(`${fecha}T${hora}:00-06:00`).getTime() >= ahora.getTime())
      horas.push(hora);
  }
  return horas;
}

export function validarFiltros(
  filtros: FiltrosDisponibilidad,
  horarios?: HorarioSucursal[],
  ahora = new Date(),
): ErroresDisponibilidad {
  const errores: ErroresDisponibilidad = {};
  if (
    !/^\d+$/.test(filtros.sucursalId) ||
    Number(filtros.sucursalId) < 1 ||
    Number(filtros.sucursalId) > 2147483647
  ) {
    errores.sucursalId = "Seleccioná una sucursal válida.";
  }
  if (!fechaValida(filtros.fecha)) {
    errores.fecha = "Ingresá una fecha válida.";
  } else if (filtros.fecha < fechaLocal(ahora)) {
    errores.fecha = "Horario no válido: la fecha no puede estar en el pasado.";
  }
  if (!/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(filtros.hora)) {
    errores.hora = "Seleccioná una hora en intervalos de 30 minutos.";
  } else if (
    !errores.fecha &&
    (new Date(`${filtros.fecha}T${filtros.hora}:00-06:00`).getTime() <
      ahora.getTime() ||
      (horarios !== undefined &&
        !horasDisponibles(filtros.fecha, horarios, ahora).includes(
          filtros.hora,
        )))
  ) {
    errores.hora =
      "Horario no válido: elegí una hora futura que permita 2 horas dentro del horario de atención.";
  }
  if (
    !/^\d+$/.test(filtros.personas) ||
    Number(filtros.personas) < 1 ||
    Number(filtros.personas) > 2147483647
  ) {
    errores.personas =
      "Ingresá una cantidad entera de personas, mayor o igual a 1.";
  }
  return errores;
}

export function formatoHora(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "p. m." : "a. m."}`;
}

export function formatoFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${fecha}T00:00:00Z`));
}
