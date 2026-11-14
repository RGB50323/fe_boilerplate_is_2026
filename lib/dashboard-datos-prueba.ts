import {
  VENTAS_POR_PAGINA,
  type DashboardRespuesta,
  type TipoPedido,
  type VentaConfirmada,
  type VentasPagina,
} from "@/lib/dashboard";
import { fechaLocal } from "@/lib/reservaciones";
import { SUCURSALES } from "@/lib/sucursales";

// Datos de prueba mientras el backend no tenga los endpoints.
// Se activan con DASHBOARD_DATOS_PRUEBA=true y NUNCA en producción.
export function usarDatosDePrueba(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DASHBOARD_DATOS_PRUEBA === "true"
  );
}

export type ConsultaPrueba = {
  desde: string;
  hasta: string;
  sucursalId?: number;
  dia?: number;
};

const PLATILLOS = [
  { platilloId: 1, nombre: "Pupusa revuelta", precio: 1.25 },
  { platilloId: 2, nombre: "Hamburguesa", precio: 8.99 },
  { platilloId: 3, nombre: "Papas fritas", precio: 4.0 },
  { platilloId: 4, nombre: "Refresco natural", precio: 2.5 },
  { platilloId: 5, nombre: "Nachos con queso", precio: 6.5 },
  { platilloId: 6, nombre: "Alitas BBQ", precio: 9.0 },
  { platilloId: 7, nombre: "Pizza personal", precio: 9.0 },
  { platilloId: 8, nombre: "Tacos (3 uds.)", precio: 7.0 },
  { platilloId: 9, nombre: "Limonada", precio: 2.5 },
  { platilloId: 10, nombre: "Ensalada César", precio: 7.0 },
  { platilloId: 11, nombre: "Brownie con helado", precio: 4.75 },
  { platilloId: 12, nombre: "Café americano", precio: 1.75 },
  { platilloId: 13, nombre: "Costillas BBQ", precio: 12.5 },
  { platilloId: 14, nombre: "Yuca frita", precio: 3.5 },
];

// Horario de prueba: 11:00 a 21:00 todos los días.
const APERTURA = 11;
const CIERRE = 21;

// Peso relativo de pedidos por hora (almuerzo y cena más fuertes).
const PESO_HORA: Record<number, number> = {
  11: 0.4, 12: 1.3, 13: 1.2, 14: 0.5, 15: 0.4,
  16: 0.5, 17: 0.9, 18: 1.4, 19: 1.0, 20: 0.5,
};

function generador(semilla: string) {
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

type Linea = { platilloId: number; nombre: string; cantidad: number; monto: number };
type VentaConLineas = VentaConfirmada & { lineas: Linea[]; horaLocal: number; diaSemana: number };

// Ventas de un día de una sucursal. Siempre las mismas para la misma fecha,
// así la lista, la paginación y los totales coinciden entre consultas.
function ventasDelDia(sucursal: { id: number; nombre: string }, fecha: string): VentaConLineas[] {
  const azar = generador(`${sucursal.id}|${fecha}`);
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  const cantidad = Math.round((10 + azar() * 14) * (diaSemana >= 5 ? 1.4 : 1) / sucursal.id ** 0.4);
  const horas = Object.entries(PESO_HORA).map(([h, p]) => [Number(h), p] as const);
  const pesoTotal = horas.reduce((t, [, p]) => t + p, 0);

  const ventas: VentaConLineas[] = [];
  for (let i = 0; i < cantidad; i++) {
    let x = azar() * pesoTotal;
    const hora = horas.find(([, p]) => (x -= p) < 0)?.[0] ?? APERTURA;
    const minuto = Math.floor(azar() * 60);
    const fechaIso = new Date(
      `${fecha}T${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00-06:00`,
    ).toISOString();

    const lineas = new Map<number, Linea>();
    const cuantas = 1 + Math.floor(azar() * 3);
    for (let l = 0; l < cuantas; l++) {
      const p = PLATILLOS[Math.floor(azar() ** 1.7 * PLATILLOS.length)];
      const cant = 1 + Math.floor(azar() * (p.precio < 3 ? 4 : 2));
      const previa = lineas.get(p.platilloId);
      lineas.set(p.platilloId, {
        platilloId: p.platilloId,
        nombre: p.nombre,
        cantidad: (previa?.cantidad ?? 0) + cant,
        monto: r2((previa?.monto ?? 0) + cant * p.precio),
      });
    }
    const lista = [...lineas.values()];
    const subtotal = r2(lista.reduce((t, l) => t + l.monto, 0));
    const descuentos = azar() < 0.15 ? r2(subtotal * 0.1) : 0;
    const tipo: TipoPedido = azar() < 0.7 ? "MESA" : "LLEVAR";

    ventas.push({
      pedidoId: sucursal.id * 100_000_000 + Number(fecha.replaceAll("-", "").slice(2)) * 100 + i,
      numero: `${sucursal.nombre.slice(0, 3).toUpperCase()}-${fecha.slice(5).replace("-", "")}-${String(i + 1).padStart(2, "0")}`,
      sucursalId: sucursal.id,
      sucursal: sucursal.nombre,
      fecha: fechaIso,
      tipo,
      articulos: lista.reduce((t, l) => t + l.cantidad, 0),
      subtotal,
      descuentos,
      venta: r2(subtotal - descuentos),
      lineas: lista,
      horaLocal: hora,
      diaSemana,
    });
  }
  return ventas;
}

function ventasDelPeriodo(consulta: ConsultaPrueba, ahora: Date): VentaConLineas[] {
  const hoy = fechaLocal(ahora);
  const hasta = consulta.hasta > hoy ? hoy : consulta.hasta;
  const sucursales = SUCURSALES.filter(
    (s) => consulta.sucursalId === undefined || s.id === consulta.sucursalId,
  );
  const ventas: VentaConLineas[] = [];
  for (let f = consulta.desde; f <= hasta; f = sumarDias(f, 1)) {
    for (const s of sucursales) ventas.push(...ventasDelDia(s, f));
  }
  // Solo ventas que ya ocurrieron.
  return ventas.filter((v) => new Date(v.fecha).getTime() <= ahora.getTime());
}

function sinLineas(v: VentaConLineas): VentaConfirmada {
  return {
    pedidoId: v.pedidoId,
    numero: v.numero,
    sucursalId: v.sucursalId,
    sucursal: v.sucursal,
    fecha: v.fecha,
    tipo: v.tipo,
    articulos: v.articulos,
    subtotal: v.subtotal,
    descuentos: v.descuentos,
    venta: v.venta,
  };
}

export function datosDePrueba(
  consulta: ConsultaPrueba,
  ahora = new Date(),
): DashboardRespuesta {
  const ventas = ventasDelPeriodo(consulta, ahora);
  const sucursales = SUCURSALES.filter(
    (s) => consulta.sucursalId === undefined || s.id === consulta.sucursalId,
  );

  const platillos = new Map<number, { platilloId: number; nombre: string; cantidad: number; monto: number }>();
  for (const v of ventas) {
    for (const l of v.lineas) {
      const p = platillos.get(l.platilloId) ?? { platilloId: l.platilloId, nombre: l.nombre, cantidad: 0, monto: 0 };
      p.cantidad += l.cantidad;
      p.monto = r2(p.monto + l.monto);
      platillos.set(l.platilloId, p);
    }
  }

  return {
    desde: consulta.desde,
    hasta: consulta.hasta,
    sucursales: sucursales.map((s) => {
      const propias = ventas.filter((v) => v.sucursalId === s.id);
      return {
        sucursalId: s.id,
        nombre: s.nombre,
        ventas: r2(propias.reduce((t, v) => t + v.venta, 0)),
        pedidos: propias.length,
      };
    }),
    platillos: [...platillos.values()].sort(
      (a, b) => b.cantidad - a.cantidad || b.monto - a.monto,
    ),
    horariosPico: sucursales.map((s) => ({
      sucursalId: s.id,
      nombre: s.nombre,
      franjas: Array.from({ length: CIERRE - APERTURA }, (_, i) => {
        const hora = APERTURA + i;
        const total = ventas
          .filter(
            (v) =>
              v.sucursalId === s.id &&
              v.horaLocal === hora &&
              (consulta.dia === undefined || v.diaSemana === consulta.dia),
          )
          .reduce((t, v) => t + v.venta, 0);
        return { hora, ventas: r2(total) };
      }),
    })),
  };
}

// Todas las ventas del periodo, de la más reciente a la más antigua.
export function todasLasVentasDePrueba(
  consulta: ConsultaPrueba,
  ahora = new Date(),
): VentaConfirmada[] {
  return ventasDelPeriodo(consulta, ahora)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.pedidoId - a.pedidoId)
    .map(sinLineas);
}

export function ventasDePrueba(
  consulta: ConsultaPrueba,
  pagina: number,
  ahora = new Date(),
): VentasPagina {
  const todas = todasLasVentasDePrueba(consulta, ahora);
  const inicio = (pagina - 1) * VENTAS_POR_PAGINA;
  return {
    items: todas.slice(inicio, inicio + VENTAS_POR_PAGINA),
    total: todas.length,
    pagina,
    porPagina: VENTAS_POR_PAGINA,
  };
}
