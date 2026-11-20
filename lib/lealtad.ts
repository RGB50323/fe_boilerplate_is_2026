export type Puntos = {
  saldoDisponible: number;
  puntosPendientes: number;
  movimientos: {
    id: number;
    tipo: "ACUMULACION" | "CANJE" | "AJUSTE";
    puntos: number;
    saldoAnterior: number;
    saldoResultante: number;
    fecha: string;
    motivo: string | null;
  }[];
};

export type DatosBeneficio = {
  nombre: string;
  descripcion: string | null;
  costoPuntos: number;
  activo: boolean;
  vigenteDesde: string;
  vigenteHasta: string;
};

export type Beneficio = DatosBeneficio & {
  id: number;
  deshabilitadoEn: string | null;
};

export type EstadoBeneficio = "ACTIVO" | "INACTIVO" | "FUTURO" | "CADUCADO" | "DESHABILITADO";
export type BeneficioAdministrativo = Beneficio & { estado: EstadoBeneficio };

export type Cupon = {
  id: number;
  codigo: string;
  beneficio: Pick<Beneficio, "id" | "nombre">;
  expiraEn: string;
  utilizadoEn: string | null;
};

export type ReglaPuntos = { puntosPorDolar: number };

export async function ejecutarLealtad<T>(
  accion: Promise<import("@/lib/api").Resultado<T>>,
): Promise<import("@/lib/api").Resultado<T>> {
  try {
    return await accion;
  } catch {
    return { ok: false, error: "No pudimos completar la operación. Intenta de nuevo." };
  }
}

export const fechaLealtad = new Intl.DateTimeFormat("es-SV", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/El_Salvador",
});

