import type { Platillo } from "@/lib/platillos";

export const NOTA_MAX = 200;

export type Mesa = {
  id: number;
  numero: number;
  capacidad: number;
  zona: string | null;
  activa: boolean;
  pedidoAbiertoId: number | null;
};

export type ItemNuevo = {
  platilloId: number;
  cantidad: number;
  nota?: string | null;
};

export type PedidoCreado = {
  pedidoId: number;
  numero: string;
  estado: string;
  total: number;
  creadoEn: string;
};

export type ItemAgregado = {
  itemId: number;
  platilloId: number;
  cantidad: number;
  estado: string;
};

export type ItemsAgregados = {
  pedidoId: number;
  total: number;
  itemsAgregados: ItemAgregado[];
};

export type PedidoTotal = { pedidoId: number; total: number };

export type ItemDetalle = {
  itemId: number;
  platilloId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  nota: string | null;
  estado: string;
};

export type PedidoDetalle = {
  pedidoId: number;
  numero: string | null;
  estado: string;
  mesaId: number | null;
  total: number;
  creadoEn: string;
  items: ItemDetalle[];
};

export type LineaPedido = {
  platillo: Platillo;
  cantidad: number;
  nota: string;
};

export function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function totalPedido(lineas: LineaPedido[]): number {
  const centavos = lineas.reduce(
    (suma, l) => suma + Math.round(l.platillo.precio * 100) * l.cantidad,
    0,
  );
  return centavos / 100;
}

export function formatearPrecio(valor: number): string {
  return `$ ${valor.toFixed(2)}`;
}

export function itemsParaEnviar(lineas: LineaPedido[]): ItemNuevo[] {
  return lineas.map((l) => ({
    platilloId: l.platillo.id,
    cantidad: l.cantidad,
    nota: l.nota.trim() || null,
  }));
}
