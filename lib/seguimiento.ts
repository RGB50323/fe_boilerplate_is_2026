import type { ItemDetalle } from "@/lib/pedidos";

export type PedidoSeguimiento = {
  pedidoId: number;
  numero: string | null;
  estado: string;
  sucursal: string;
  nombreCliente: string | null;
  total: number;
  creadoEn: string;
  pago: string | null;
  comprobanteId?: number | null;
  items: ItemDetalle[];
};

export type PedidoCancelado = {
  pedidoId: number;
  estado: string;
  pago: string;
};

export type PedidoResumen = {
  pedidoId: number;
  numero: string | null;
  estado: string;
  sucursal: string;
  total: number;
  creadoEn: string;
};

export const PASOS = ["RECIBIDO", "EN_PREPARACION", "LISTO"] as const;

const ESTADOS: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  RECIBIDO: "Recibido",
  ENVIADO_COCINA: "Enviado a cocina",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const PEDIDO_NO_EXISTE = "El pedido no existe.";
export const YA_EN_PREPARACION =
  "Tu pedido ya está en preparación y no se puede cancelar.";

export function etiquetaEstado(estado: string): string {
  return ESTADOS[estado] ?? estado;
}

export function puedeCancelar(estado: string): boolean {
  return estado === "RECIBIDO";
}

export function subtotalItem(item: ItemDetalle): number {
  return (Math.round(item.precioUnitario * 100) * item.cantidad) / 100;
}
