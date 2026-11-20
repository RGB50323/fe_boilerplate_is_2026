import type { ItemDetalle } from "@/lib/pedidos";
import { subtotalItem } from "@/lib/seguimiento";

export type EstadoPago = "PENDIENTE" | "CONFIRMADO" | "RECHAZADO" | "REEMBOLSADO";
export type MetodoPago = "EFECTIVO" | "TARJETA";
export type PedidoParaPago = { pedidoId: number; total: number; items: ItemDetalle[] };

export function construirTicket(pedido: PedidoParaPago) {
  return {
    id: pedido.pedidoId,
    total: pedido.total,
    items: pedido.items.map((item) => ({
      nombre: item.nombre,
      precio_unitario: item.precioUnitario,
      cantidad: item.cantidad,
      subtotal: subtotalItem(item),
    })),
  };
}

export type SolicitudPago = {
  solicitudId: string;
  ticket: ReturnType<typeof construirTicket>;
  correoLealtad?: string;
} & (
  | { metodo: "EFECTIVO"; montoRecibido: string }
  | { metodo: "TARJETA"; marca: string; ultimosCuatro: string }
);

export type ResultadoPago = {
  estado: EstadoPago;
  comprobanteId: number | null;
  transaccionId: string | null;
};

export type PagoPorPedido = ResultadoPago & {
  pagoId: number;
  pedidoId: number;
  metodo: string | null;
};

export function calcularCambio(recibido: string, total: number): number | null {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(recibido)) return null;
  return (Math.round(Number(recibido) * 100) - Math.round(total * 100)) / 100;
}
