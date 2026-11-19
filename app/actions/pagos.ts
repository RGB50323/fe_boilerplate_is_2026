"use server";

import { llamar } from "@/lib/api";
import type { PagoPorPedido, ResultadoPago, SolicitudPago } from "@/lib/pagos";

export async function procesarPago(solicitud: SolicitudPago) {
  return llamar<ResultadoPago & { pagoId: number; ticketId: number }>("pagos/procesar", {
    metodo: "POST",
    cuerpo: solicitud,
    detallarErrores: true,
    mensajes: {
      400: "Revisa el importe, los datos del pago y el detalle del pedido.",
      404: "El pedido ya no está disponible.",
      409: "El pedido cambió o ya tiene un pago activo. Consulta su estado antes de intentar otro cobro.",
      502: "La pasarela simulada no respondió correctamente. Reintenta la misma solicitud.",
    },
  });
}

export async function consultarPago(transaccionId: string) {
  return llamar<ResultadoPago>(`pagos/transaccion/${encodeURIComponent(transaccionId)}`, {
    mensajes: { 404: "No encontramos la transacción." },
  });
}

export async function consultarPagoPedido(pedidoId: number) {
  const respuesta = await llamar<PagoPorPedido | { pago: null }>(`pagos/pedido/${pedidoId}`, {
    mensajes: { 404: "El pedido ya no está disponible." },
  });
  if (!respuesta.ok) return respuesta;
  return { ok: true as const, datos: "pago" in respuesta.datos ? null : respuesta.datos };
}
