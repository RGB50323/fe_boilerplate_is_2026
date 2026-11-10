import { fechaLocal, fechaValida } from "@/lib/reservaciones";

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

export type Periodo = "hoy" | "semana" | "mes" | "rango";

export const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "rango", label: "Personalizado" },
];


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
  desde: string; 
  hasta: string; 
  sucursalId: string; 
  dia: string;
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


const redondear = (n: number) => Math.round(n * 100) / 100;

export function ticketPromedio(ventas: number, pedidos: number): number {
  if (pedidos <= 0) return 0;
  return Math.round((ventas * 100) / pedidos) / 100;
}

export function resumenGeneral(sucursales: VentasSucursal[]) {
  const ventas = redondear(sucursales.reduce((t, s) => t + s.ventas, 0));
  const pedidos = sucursales.reduce((t, s) => t + s.pedidos, 0);
  return { ventas, pedidos, ticket: ticketPromedio(ventas, pedidos) };
}

export function ordenarPlatillos(platillos: PlatilloVendido[]): PlatilloVendido[] {
  return [...platillos].sort(
    (a, b) =>
      b.cantidad - a.cantidad ||
      b.monto - a.monto ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
}

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

function celdaCsv(valor: string | number): string {
  const texto = String(valor);
  return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function generarCsv(
  sucursales: VentasSucursal[],
  rango: { desde: string; hasta: string },
): string {
  const filas: (string | number)[][] = [
    ["Desde", rango.desde],
    ["Hasta", rango.hasta],
    [],
    ["Sucursal", "Ventas", "Pedidos", "Ticket promedio"],
    ...sucursales.map((s) => [
      s.nombre,
      redondear(s.ventas).toFixed(2),
      s.pedidos,
      ticketPromedio(s.ventas, s.pedidos).toFixed(2),
    ]),
  ];
  const total = resumenGeneral(sucursales);
  filas.push([
    "Total",
    total.ventas.toFixed(2),
    total.pedidos,
    total.ticket.toFixed(2),
  ]);
  return filas.map((fila) => fila.map(celdaCsv).join(",")).join("\r\n");
}

export function nombreArchivoCsv(rango: { desde: string; hasta: string }) {
  return `ventas-por-sucursal_${rango.desde}_${rango.hasta}.csv`;
}
