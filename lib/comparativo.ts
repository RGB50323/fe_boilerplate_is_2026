import {
  FILTROS_INICIALES,
  filtrosDesdeParams,
  periodoAQuery,
  type FiltrosPeriodo,
  type VentasSucursal,
} from "@/lib/dashboard";

// H29: una sucursal requiere atención si sus ventas están MÁS de 20 % por
// debajo del promedio de las sucursales comparadas.
export const UMBRAL_ATENCION = 0.2;
export const MINIMO_SUCURSALES = 2;

// ---------------------------------------------------------------------------
// Filtros (URL): periodo + sucursales elegidas
// ---------------------------------------------------------------------------

export type FiltrosComparativo = FiltrosPeriodo & {
  // null = todas (por defecto); si no, ids elegidos.
  sucursales: number[] | null;
};

export const COMPARATIVO_INICIAL: FiltrosComparativo = {
  periodo: FILTROS_INICIALES.periodo,
  desde: "",
  hasta: "",
  sucursales: null,
};

type Params = Record<string, string | string[] | undefined>;

export function comparativoDesdeParams(
  p: Params,
  idsValidos: number[],
): FiltrosComparativo {
  const { periodo, desde, hasta } = filtrosDesdeParams(p);
  const crudo = Array.isArray(p.sucursales) ? p.sucursales[0] : p.sucursales;
  return {
    periodo,
    desde,
    hasta,
    sucursales:
      crudo === undefined
        ? null
        : idsValidos.filter((id) => crudo.split(",").includes(String(id))),
  };
}

export function comparativoAQuery(f: FiltrosComparativo): string {
  const qs = new URLSearchParams(periodoAQuery(f));
  if (f.sucursales !== null) qs.set("sucursales", f.sucursales.join(","));
  return qs.toString();
}

export function sucursalesElegidas(f: FiltrosComparativo, idsValidos: number[]) {
  return f.sucursales ?? idsValidos;
}

// Marca o desmarca una sucursal. Si quedan todas marcadas vuelve a "todas".
export function alternarSucursal(
  f: FiltrosComparativo,
  id: number,
  idsValidos: number[],
): FiltrosComparativo {
  const actuales = sucursalesElegidas(f, idsValidos);
  const siguientes = actuales.includes(id)
    ? actuales.filter((x) => x !== id)
    : idsValidos.filter((x) => x === id || actuales.includes(x));
  return {
    ...f,
    sucursales: siguientes.length === idsValidos.length ? null : siguientes,
  };
}

// ---------------------------------------------------------------------------
// Cálculos
// ---------------------------------------------------------------------------

// ventas, pedidos y ticketPromedio vienen del backend, calculados igual que en
// H28 (criterio 2); aquí solo se agrega la comparación con el promedio.
export type FilaComparativo = VentasSucursal & {
  diferencia: number; // % respecto al promedio (sin redondear)
  requiereAtencion: boolean;
};

export type Comparativo = {
  promedio: number;
  umbral: number; // promedio × (1 − 20 %)
  sinVentas: boolean;
  filas: FilaComparativo[];
  enAtencion: FilaComparativo[];
};

const enCentavos = (n: number) => Math.round(n * 100);

export function calcularComparativo(sucursales: VentasSucursal[]): Comparativo {
  const n = sucursales.length;
  const totalCentavos = sucursales.reduce((t, s) => t + enCentavos(s.ventas), 0);
  const promedio = n ? Math.round(totalCentavos / n) / 100 : 0;
  const sinVentas = sucursales.every((s) => s.pedidos === 0 && s.ventas === 0);

  const filas = sucursales.map((s) => {
    // ventas < promedio × 0.8, comparado en centavos enteros para que un
    // caso exacto de −20 % no se marque por errores de redondeo:
    // ventas·n·5 < total·4
    const requiereAtencion =
      !sinVentas && totalCentavos > 0 && enCentavos(s.ventas) * n * 5 < totalCentavos * 4;
    const diferencia =
      totalCentavos > 0 ? ((enCentavos(s.ventas) * n - totalCentavos) / totalCentavos) * 100 : 0;
    return {
      ...s,
      diferencia,
      requiereAtencion,
    };
  });

  return {
    promedio,
    // Desde el total sin redondear el promedio: 5,076.833 × 0.8 = 4,061.47.
    umbral: n ? Math.round((totalCentavos * (1 - UMBRAL_ATENCION)) / n) / 100 : 0,
    sinVentas,
    filas,
    enAtencion: filas.filter((f) => f.requiereAtencion),
  };
}

// +59.9 % / −15.1 % / 0.0 %
export function formatoDiferencia(pct: number): string {
  const valor = Math.round(pct * 10) / 10;
  if (valor === 0) return "0.0 %";
  return `${valor > 0 ? "+" : "−"}${Math.abs(valor).toFixed(1)} %`;
}

export function mensajeAtencion(enAtencion: FilaComparativo[]): string {
  return enAtencion
    .map((f) => `${f.nombre} tiene ventas ${formatoDiferencia(f.diferencia).replace("−", "")} por debajo del promedio`)
    .join("; ");
}
