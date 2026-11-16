import type {
  ItemPedidoCocina,
  PedidoCocina,
  PedidoEnTablero,
} from "./tipos";

export const UMBRAL_RETRASO_MIN = 15;

export const INTERVALO_RELOJ_MS = 30_000;

export const INTERVALO_RECONEXION_MS = 3_000;

const MS_POR_MINUTO = 60_000;

function itemsNuevosEntre(
  anterior: PedidoEnTablero | undefined,
  pedido: PedidoCocina,
): number[] {
  if (!anterior) return [];
  const conocidos = new Set(anterior.items.map((item) => item.id));
  return pedido.items
    .filter(
      (item) =>
        item.estado === "PENDIENTE" &&
        (!conocidos.has(item.id) || anterior.itemsNuevos.includes(item.id)),
    )
    .map((item) => item.id);
}

export function conRecepcion(
  pedido: PedidoCocina,
  recibidoEn: number,
  anterior?: PedidoEnTablero,
): PedidoEnTablero {
  return { ...pedido, recibidoEn, itemsNuevos: itemsNuevosEntre(anterior, pedido) };
}

export function estaCompleto(pedido: PedidoCocina): boolean {
  return (
    pedido.items.length > 0 &&
    pedido.items.every((item) => item.estado !== "PENDIENTE")
  );
}

export function ordenarPorLlegada<T extends PedidoCocina>(pedidos: T[]): T[] {
  return [...pedidos].sort(
    (a, b) => Date.parse(a.creadoEn) - Date.parse(b.creadoEn) || a.id - b.id,
  );
}

export function prepararLista(
  pedidos: PedidoCocina[],
  recibidoEn: number,
  anterior: PedidoEnTablero[] = [],
): PedidoEnTablero[] {
  const porId = new Map(anterior.map((pedido) => [pedido.id, pedido]));
  return ordenarPorLlegada(
    pedidos
      .filter((pedido) => !estaCompleto(pedido))
      .map((pedido) => conRecepcion(pedido, recibidoEn, porId.get(pedido.id))),
  );
}

export function agregarPedido(
  lista: PedidoEnTablero[],
  pedido: PedidoEnTablero,
): PedidoEnTablero[] {
  if (estaCompleto(pedido) || lista.some((p) => p.id === pedido.id)) {
    return lista;
  }
  return ordenarPorLlegada([...lista, pedido]);
}

export function reemplazarPedido(
  lista: PedidoEnTablero[],
  pedido: PedidoCocina,
  recibidoEn: number,
): PedidoEnTablero[] {
  const anterior = lista.find((p) => p.id === pedido.id);
  if (!anterior) return lista;
  if (estaCompleto(pedido)) return quitarPedido(lista, pedido.id);
  const actualizado = conRecepcion(pedido, recibidoEn, anterior);
  return ordenarPorLlegada(lista.map((p) => (p.id === pedido.id ? actualizado : p)));
}

export function quitarPedido(
  lista: PedidoEnTablero[],
  id: number,
): PedidoEnTablero[] {
  return lista.some((p) => p.id === id) ? lista.filter((p) => p.id !== id) : lista;
}

export function minutosDeEspera(pedido: PedidoEnTablero, ahora: number): number {
  const transcurrido = Math.max(0, ahora - pedido.recibidoEn);
  return Math.floor(pedido.minutosEspera + transcurrido / MS_POR_MINUTO);
}

export function estaRetrasado(
  pedido: PedidoEnTablero,
  ahora: number,
  umbralMin: number = UMBRAL_RETRASO_MIN,
): boolean {
  return minutosDeEspera(pedido, ahora) > umbralMin;
}

export function textoMinutos(minutos: number): string {
  if (minutos < 1) return "<1 min";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

export function formatearHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "--:--";
  const hh = String(fecha.getHours()).padStart(2, "0");
  const mm = String(fecha.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function textoDestino(pedido: PedidoCocina): string {
  if (pedido.tipo === "LLEVAR") return "Para llevar";
  if (pedido.destino) return pedido.destino;
  return pedido.mesaNumero != null ? `Mesa ${pedido.mesaNumero}` : "Mesa";
}

export function textoNumero(pedido: PedidoCocina): string {
  return pedido.numero ?? `#${pedido.id}`;
}

function esItem(valor: unknown): valor is ItemPedidoCocina {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Record<string, unknown>;
  return (
    Number.isInteger(item.id) &&
    typeof item.platillo === "string" &&
    Number.isInteger(item.cantidad) &&
    (item.nota === null || typeof item.nota === "string") &&
    (item.estado === "PENDIENTE" ||
      item.estado === "LISTO" ||
      item.estado === "ENTREGADO")
  );
}

export function esPedidoCocina(valor: unknown): valor is PedidoCocina {
  if (!valor || typeof valor !== "object") return false;
  const pedido = valor as Record<string, unknown>;
  return (
    Number.isInteger(pedido.id) &&
    (pedido.numero === null || typeof pedido.numero === "string") &&
    (pedido.tipo === "MESA" || pedido.tipo === "LLEVAR") &&
    typeof pedido.destino === "string" &&
    (pedido.mesaNumero === null || Number.isInteger(pedido.mesaNumero)) &&
    typeof pedido.creadoEn === "string" &&
    !Number.isNaN(Date.parse(pedido.creadoEn)) &&
    typeof pedido.minutosEspera === "number" &&
    typeof pedido.retrasado === "boolean" &&
    Array.isArray(pedido.items) &&
    pedido.items.every(esItem)
  );
}

export function urlSocketCocina(env: {
  API_URL?: string;
  SOCKET_URL?: string;
}): string {
  const base = env.SOCKET_URL || (env.API_URL && new URL(env.API_URL).origin);
  if (!base) {
    throw new Error("Falta la variable de entorno API_URL (o SOCKET_URL).");
  }
  return `${base.replace(/\/+$/, "")}/cocina`;
}
