import { fechaLocal, fechaValida } from "@/lib/reservaciones";

// ---------------------------------------------------------------------------
// Tipos que devuelve el backend (contrato propuesto para GET /dashboard/ventas)
// ---------------------------------------------------------------------------

// Ventas = subtotal - descuentos, sin IVA ni propina, solo pedidos con pago
// confirmado y sin reembolso (criterio 2). Eso lo calcula el backend.
export type VentasSucursal = {
  sucursalId: number;
  nombre: string;
  ventas: number;
  pedidos: number;
};

export type PlatilloVendido = {
  platilloId: number;
  nombre: string;
  cantidad: number;
  monto: number;
};

// hora = inicio de la franja de 1 hora (12 => 12:00 a 13:00).
export type FranjaHoraria = { hora: number; ventas: number };

export type HorarioPicoSucursal = {
  sucursalId: number;
  nombre: string;
  franjas: FranjaHoraria[];
};

export type DashboardRespuesta = {
  desde: string;
  hasta: string;
  sucursales: VentasSucursal[];
  platillos: PlatilloVendido[];
  horariosPico: HorarioPicoSucursal[];
};

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

export type Periodo = "hoy" | "semana" | "mes" | "rango";

export const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "rango", label: "Personalizado" },
];

// diaSemana usa la misma convención que HorarioSucursal: 0 = domingo.
export const DIAS_SEMANA: { value: number; label: string }[] = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export type FiltrosDashboard = {
  periodo: Periodo;
  desde: string; // solo para periodo "rango"
  hasta: string; // solo para periodo "rango"
  sucursalId: string; // "" = Todas
  dia: string; // "" = todos los días (solo afecta horarios pico)
};

export const FILTROS_INICIALES: FiltrosDashboard = {
  periodo: "mes",
  desde: "",
  hasta: "",
  sucursalId: "",
  dia: "",
};

export type ErroresRango = Partial<Record<"desde" | "hasta", string>>;

export function validarRango(desde: string, hasta: string): ErroresRango {
  const errores: ErroresRango = {};
  if (!fechaValida(desde)) errores.desde = "Ingresá una fecha inicial válida.";
  if (!fechaValida(hasta)) errores.hasta = "Ingresá una fecha final válida.";
  if (!errores.desde && !errores.hasta && hasta < desde) {
    errores.hasta =
      "Rango no válido: la fecha final no puede ser anterior a la inicial.";
  }
  return errores;
}

type Params = Record<string, string | string[] | undefined>;

const uno = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

export function filtrosDesdeParams(p: Params): FiltrosDashboard {
  const periodo = uno(p.periodo);
  const dia = uno(p.dia);
  const sucursal = uno(p.sucursal);
  return {
    periodo: PERIODOS.some((x) => x.value === periodo)
      ? (periodo as Periodo)
      : FILTROS_INICIALES.periodo,
    desde: uno(p.desde),
    hasta: uno(p.hasta),
    sucursalId: /^\d+$/.test(sucursal) ? sucursal : "",
    dia: /^[0-6]$/.test(dia) ? dia : "",
  };
}

export function filtrosAQuery(f: FiltrosDashboard): string {
  const qs = new URLSearchParams();
  qs.set("periodo", f.periodo);
  if (f.periodo === "rango") {
    qs.set("desde", f.desde);
    qs.set("hasta", f.hasta);
  }
  if (f.sucursalId) qs.set("sucursal", f.sucursalId);
  if (f.dia) qs.set("dia", f.dia);
  return qs.toString();
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Traduce el periodo a fechas concretas (zona horaria del restaurante).
// La semana empieza el lunes.
export function rangoDelPeriodo(
  f: FiltrosDashboard,
  ahora = new Date(),
): { desde: string; hasta: string } {
  const hoy = fechaLocal(ahora);
  switch (f.periodo) {
    case "hoy":
      return { desde: hoy, hasta: hoy };
    case "semana": {
      const dia = new Date(`${hoy}T00:00:00Z`).getUTCDay();
      return { desde: sumarDias(hoy, -((dia + 6) % 7)), hasta: hoy };
    }
    case "mes":
      return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
    case "rango":
      return { desde: f.desde, hasta: f.hasta };
  }
}

// ---------------------------------------------------------------------------
// Cálculos
// ---------------------------------------------------------------------------

const redondear = (n: number) => Math.round(n * 100) / 100;

// Criterios 3 y 4: ventas / pedidos a dos decimales; $0.00 sin pedidos.
export function ticketPromedio(ventas: number, pedidos: number): number {
  if (pedidos <= 0) return 0;
  return Math.round((ventas * 100) / pedidos) / 100;
}

export function resumenGeneral(sucursales: VentasSucursal[]) {
  const ventas = redondear(sucursales.reduce((t, s) => t + s.ventas, 0));
  const pedidos = sucursales.reduce((t, s) => t + s.pedidos, 0);
  return { ventas, pedidos, ticket: ticketPromedio(ventas, pedidos) };
}

// Criterios 8 y 9: mayor cantidad primero; si empatan, el que generó más.
export function ordenarPlatillos(platillos: PlatilloVendido[]): PlatilloVendido[] {
  return [...platillos].sort(
    (a, b) =>
      b.cantidad - a.cantidad ||
      b.monto - a.monto ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
}

// Criterios 10 y 11: las 3 franjas con más ventas; si empatan, la más temprana.
export function franjasPico(franjas: FranjaHoraria[], cuantas = 3): number[] {
  return [...franjas]
    .filter((f) => f.ventas > 0)
    .sort((a, b) => b.ventas - a.ventas || a.hora - b.hora)
    .slice(0, cuantas)
    .map((f) => f.hora);
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

export function etiquetaFranja(hora: number): string {
  return `${dosDigitos(hora)}:00 a ${dosDigitos((hora + 1) % 24)}:00`;
}

const moneda = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatoMoneda(n: number): string {
  return moneda.format(redondear(n));
}

export function formatoEntero(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

// ---------------------------------------------------------------------------
// Ventas confirmadas (lista detallada y CSV, criterio 14)
// ---------------------------------------------------------------------------

export type TipoPedido = "MESA" | "LLEVAR";

export const TIPOS_PEDIDO: Record<TipoPedido, string> = {
  MESA: "Mesa",
  LLEVAR: "Para llevar",
};

// Una fila por pedido que cuenta como venta: pago confirmado y sin reembolso.
export type VentaConfirmada = {
  pedidoId: number;
  numero: string | null;
  sucursalId: number;
  sucursal: string;
  fecha: string; // ISO en UTC: momento en que se confirmó el pago
  tipo: TipoPedido;
  articulos: number;
  subtotal: number;
  descuentos: number;
  venta: number; // subtotal - descuentos
};

export type VentasPagina = {
  items: VentaConfirmada[];
  total: number;
  pagina: number;
  porPagina: number;
};

export const VENTAS_POR_PAGINA = 20;

const ZONA_HORARIA = "America/El_Salvador";

const formatoFechaLocal = new Intl.DateTimeFormat("es-SV", {
  timeZone: ZONA_HORARIA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const formatoHoraLocal = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONA_HORARIA,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// "2026-11-08T20:35:00Z" -> { fecha: "08/11/2026", hora: "14:35" } (hora de El Salvador)
export function fechaHoraLocal(iso: string): { fecha: string; hora: string } {
  const d = new Date(iso);
  return { fecha: formatoFechaLocal.format(d), hora: formatoHoraLocal.format(d) };
}

// "2026-11-01" -> "01/11/2026"
export function formatoFechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split("-");
  return a && m && d ? `${d}/${m}/${a}` : fecha;
}

export function etiquetaPedido(v: Pick<VentaConfirmada, "numero" | "pedidoId">) {
  return v.numero ?? `#${v.pedidoId}`;
}

function celdaCsv(valor: string | number): string {
  const texto = String(valor);
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export const ENCABEZADO_CSV_VENTAS = [
  "Fecha",
  "Hora",
  "Pedido",
  "Sucursal",
  "Tipo",
  "Artículos",
  "Subtotal",
  "Descuentos",
  "Venta",
];

// Mismo formato que debe devolver GET /dashboard/ventas/exportar del backend.
export function generarCsvVentas(ventas: VentaConfirmada[]): string {
  const filas: (string | number)[][] = [
    ENCABEZADO_CSV_VENTAS,
    ...ventas.map((v) => {
      const { fecha, hora } = fechaHoraLocal(v.fecha);
      return [
        fecha,
        hora,
        etiquetaPedido(v),
        v.sucursal,
        TIPOS_PEDIDO[v.tipo] ?? v.tipo,
        v.articulos,
        redondear(v.subtotal).toFixed(2),
        redondear(v.descuentos).toFixed(2),
        redondear(v.venta).toFixed(2),
      ];
    }),
  ];
  return filas.map((fila) => fila.map(celdaCsv).join(",")).join("\r\n");
}

export function nombreArchivoCsv(rango: { desde: string; hasta: string }) {
  return `ventas-confirmadas_${rango.desde}_${rango.hasta}.csv`;
}
