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
  correoLealtad?: string;
  ticket: ReturnType<typeof construirTicket>;
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

const MAXIMO_CORREO_LEALTAD = 254;
const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarCorreoLealtad(correo: string) {
  return correo.trim().toLowerCase();
}

export function esCorreoLealtadValido(correo: string) {
  return correo.length <= MAXIMO_CORREO_LEALTAD && formatoCorreo.test(correo);
}

export function calcularCambio(recibido: string, total: number): number | null {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(recibido)) return null;
  return (Math.round(Number(recibido) * 100) - Math.round(total * 100)) / 100;
}
