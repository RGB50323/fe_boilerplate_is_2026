import type { DashboardRespuesta, PlatilloVendido } from "@/lib/dashboard";
import { fechaLocal } from "@/lib/reservaciones";
import { SUCURSALES } from "@/lib/sucursales";

export function usarDatosDePrueba(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DASHBOARD_DATOS_PRUEBA === "true"
  );
}

const PLATILLOS = [
  { platilloId: 1, nombre: "Burle clásica", precio: 8.5 },
  { platilloId: 2, nombre: "Burle doble queso", precio: 10.25 },
  { platilloId: 3, nombre: "Burle BBQ", precio: 9.75 },
  { platilloId: 4, nombre: "Pollo crujiente", precio: 9.0 },
  { platilloId: 5, nombre: "Papas fritas", precio: 3.25 },
  { platilloId: 6, nombre: "Aros de cebolla", precio: 3.75 },
  { platilloId: 7, nombre: "Alitas picantes", precio: 7.5 },
  { platilloId: 8, nombre: "Ensalada César", precio: 6.5 },
  { platilloId: 9, nombre: "Horchata", precio: 2.5 },
  { platilloId: 10, nombre: "Limonada", precio: 2.25 },
  { platilloId: 11, nombre: "Malteada de vainilla", precio: 4.5 },
  { platilloId: 12, nombre: "Brownie con helado", precio: 4.75 },
  { platilloId: 13, nombre: "Burle vegetariana", precio: 8.75 },
  { platilloId: 14, nombre: "Nuggets", precio: 5.5 },
];

// Peso relativo de ventas por hora (almuerzo y cena más fuertes).
const PESO_HORA: Record<number, number> = {
  10: 0.3, 11: 0.6, 12: 1.4, 13: 1.3, 14: 0.7, 15: 0.4,
  16: 0.4, 17: 0.6, 18: 1.0, 19: 1.5, 20: 1.2, 21: 0.6,
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

function diasEntre(desde: string, hasta: string): number {
  const ms =
    new Date(`${hasta}T00:00:00Z`).getTime() -
    new Date(`${desde}T00:00:00Z`).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000) + 1);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function datosDePrueba(
  consulta: { desde: string; hasta: string; sucursalId?: number; dia?: number },
  ahora = new Date(),
): DashboardRespuesta {
  const hoy = fechaLocal(ahora);
  const hastaReal = consulta.hasta > hoy ? hoy : consulta.hasta;
  const dias = consulta.desde > hoy ? 0 : diasEntre(consulta.desde, hastaReal);

  const sucursales = SUCURSALES.filter(
    (s) => consulta.sucursalId === undefined || s.id === consulta.sucursalId,
  );

  const ventasSucursal = sucursales.map((s) => {
    const azar = generador(`${s.id}|${consulta.desde}|${consulta.hasta}`);
    const pedidos = Math.round(dias * (25 + azar() * 35));
    const ventas = r2(pedidos * (10 + azar() * 6));
    return { sucursalId: s.id, nombre: s.nombre, ventas, pedidos };
  });

  const totalPedidos = ventasSucursal.reduce((t, s) => t + s.pedidos, 0);
  const azar = generador(`platillos|${consulta.desde}|${consulta.sucursalId ?? "todas"}`);
  const platillos: PlatilloVendido[] =
    totalPedidos === 0
      ? []
      : PLATILLOS.map(({ precio, ...p }) => {
          const cantidad = Math.max(1, Math.round(totalPedidos * azar() * 0.45));
          return { ...p, cantidad, monto: r2(cantidad * precio) };
        });

  const horariosPico = ventasSucursal.map((s) => {
    const azarHora = generador(`horas|${s.sucursalId}|${consulta.desde}|${consulta.dia ?? "todos"}`);
    const factorDia = consulta.dia === undefined ? 1 : 1 / 7;
    const pesos = Object.entries(PESO_HORA).map(
      ([hora, peso]) => [Number(hora), peso * (0.75 + azarHora() * 0.5)] as const,
    );
    const sumaPesos = pesos.reduce((t, [, p]) => t + p, 0);
    return {
      sucursalId: s.sucursalId,
      nombre: s.nombre,
      franjas: pesos.map(([hora, peso]) => ({
        hora,
        ventas: r2((s.ventas * factorDia * peso) / sumaPesos),
      })),
    };
  });

  return {
    desde: consulta.desde,
    hasta: consulta.hasta,
    sucursales: ventasSucursal,
    platillos,
    horariosPico,
  };
}
