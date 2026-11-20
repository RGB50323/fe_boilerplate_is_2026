import { fechaValida } from "@/lib/reservaciones";

export const ESTADOS_BENEFICIO = {
  VIGENTE: { etiqueta: "Vigente", filtro: "Vigentes", variante: "success" },
  PROGRAMADO: {
    etiqueta: "Programado",
    filtro: "Programados",
    variante: "neutral",
  },
  VENCIDO: { etiqueta: "Vencido", filtro: "Vencidos", variante: "neutral" },
  DESHABILITADO: {
    etiqueta: "Deshabilitado",
    filtro: "Deshabilitados",
    variante: "danger",
  },
  SIN_PLATILLO: {
    etiqueta: "Sin platillo",
    filtro: "Sin platillo",
    variante: "neutral",
  },
} as const;

export type EstadoBeneficio = keyof typeof ESTADOS_BENEFICIO;
export type PlatilloBeneficio = {
  id: number;
  nombre: string;
  descripcion: string | null;
};
export type Beneficio = {
  id: number;
  platilloId: number | null;
  nombre: string | null;
  descripcion: string | null;
  costoPuntos: number;
  vigenteDesde: string;
  vigenteHasta: string;
  creadoEn: string;
  modificadoEn: string | null;
  deshabilitadoEn: string | null;
  estado: EstadoBeneficio;
  platillo: PlatilloBeneficio | null;
};

export type DatosBeneficio = {
  platilloId: number;
  costoPuntos: number;
  vigenteDesde: string;
  vigenteHasta: string;
};

export const MAXIMO_PUNTOS = 2_147_483_647;
export type ErroresBeneficio = Partial<Record<keyof DatosBeneficio, string>>;

export function validarBeneficio(
  datos: DatosBeneficio,
  inicioMinimo?: string,
): ErroresBeneficio {
  const errores: ErroresBeneficio = {};
  if (
    !Number.isInteger(datos.platilloId) ||
    datos.platilloId <= 0 ||
    datos.platilloId > MAXIMO_PUNTOS
  ) {
    errores.platilloId = "Selecciona un platillo.";
  }
  if (
    !Number.isInteger(datos.costoPuntos) ||
    datos.costoPuntos <= 0 ||
    datos.costoPuntos > MAXIMO_PUNTOS
  ) {
    errores.costoPuntos =
      "Ingresa una cantidad de puntos válida y mayor que cero.";
  }
  const inicioValido =
    fechaValida(datos.vigenteDesde) && !datos.vigenteDesde.startsWith("0000");
  if (!inicioValido) {
    errores.vigenteDesde = "Ingresa una fecha de inicio válida.";
  } else if (inicioMinimo && datos.vigenteDesde < inicioMinimo) {
    errores.vigenteDesde =
      "La fecha inicial no puede ser anterior al día actual de El Salvador.";
  }
  if (
    !fechaValida(datos.vigenteHasta) ||
    datos.vigenteHasta.startsWith("0000")
  ) {
    errores.vigenteHasta = "Ingresa una fecha de finalización válida.";
  } else if (inicioValido && datos.vigenteHasta < datos.vigenteDesde) {
    errores.vigenteHasta = "La fecha final no puede ser anterior a la inicial.";
  }
  return errores;
}
