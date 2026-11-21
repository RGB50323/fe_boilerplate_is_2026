"use server";

import { ERROR_GENERICO, llamar, type Resultado } from "@/lib/api";
import { Pagina } from "@/lib/paginacion";
import type {
  ItemNuevo,
  ItemsAgregados,
  Mesa,
  PedidoCreado,
  PedidoDetalle,
  PedidoLlevarCreado,
  PedidoTotal,
} from "@/lib/pedidos";
import { PEDIDO_NO_EXISTE, PedidoCancelado, PedidoResumen, PedidoSeguimiento, YA_EN_PREPARACION } from "@/lib/seguimiento";

const ERROR_ENVIO = "No pudimos enviar el pedido. Intenta de nuevo.";
const ITEM_LISTO = "Este platillo ya está listo y no se puede modificar.";
const REVISA_PLATILLOS =
  "Revisa los platillos: alguno no está disponible o se agotó.";

function cuerpoItems(items: ItemNuevo[]) {
  return items.map((i) => ({
    platilloId: i.platilloId,
    cantidad: i.cantidad,
    ...(i.nota ? { nota: i.nota } : {}),
  }));
}

export async function listarMesas(
  sucursalId: number,
): Promise<Resultado<Mesa[]>> {
  return llamar<Mesa[]>(`sucursales/${sucursalId}/mesas`);
}

export async function obtenerPedido(
  id: number,
): Promise<Resultado<PedidoDetalle>> {
  return llamar<PedidoDetalle>(`pedidos/${id}`, {
    mensajes: { 404: "El pedido no existe." },
  });
}

export async function crearPedido(
  mesaId: number,
  items: ItemNuevo[],
): Promise<Resultado<PedidoCreado>> {
  const resultado = await llamar<PedidoCreado>("pedidos", {
    metodo: "POST",
    cuerpo: { tipo: "MESA", mesaId, items: cuerpoItems(items) },
    mensajes: {
      400: "Revisa los platillos: la cantidad o las notas no son válidas.",
      404: "La mesa o un platillo ya no existe.",
      409: "Esta mesa ya tiene un pedido abierto.",
      422: REVISA_PLATILLOS,
    },
  });
  if (
    !resultado.ok &&
    !resultado.sinSesion &&
    resultado.error === ERROR_GENERICO
  ) {
    return { ok: false, error: ERROR_ENVIO };
  }
  return resultado;
}

export async function agregarItems(
  pedidoId: number,
  items: ItemNuevo[],
): Promise<Resultado<ItemsAgregados>> {
  return llamar<ItemsAgregados>(`pedidos/${pedidoId}/items`, {
    metodo: "POST",
    cuerpo: { items: cuerpoItems(items) },
    mensajes: {
      400: "Revisa los platillos: la cantidad o las notas no son válidas.",
      404: "El pedido o un platillo ya no existe.",
      409: "El pedido ya está cerrado.",
      422: REVISA_PLATILLOS,
    },
  });
}

export async function cambiarItem(
  pedidoId: number,
  itemId: number,
  cambios: { cantidad?: number; nota?: string | null },
): Promise<Resultado<PedidoTotal>> {
  return llamar<PedidoTotal>(`pedidos/${pedidoId}/items/${itemId}`, {
    metodo: "PATCH",
    cuerpo: cambios,
    mensajes: {
      400: "Revisa la cantidad o la nota del platillo.",
      404: "El platillo del pedido no existe.",
      409: ITEM_LISTO,
      422: "No hay disponibilidad suficiente de este platillo.",
    },
  });
}

export async function quitarItem(
  pedidoId: number,
  itemId: number,
): Promise<Resultado<PedidoTotal>> {
  return llamar<PedidoTotal>(`pedidos/${pedidoId}/items/${itemId}`, {
    metodo: "DELETE",
    mensajes: {
      404: "El platillo del pedido no existe.",
      409: ITEM_LISTO,
    },
  });
}


export async function crearPedidoLlevar(
  sucursalId: number,
  nombreCliente: string,
  items: ItemNuevo[],
): Promise<Resultado<PedidoLlevarCreado>> {
  return llamar<PedidoLlevarCreado>("pedidos", {
    metodo: "POST",
    cuerpo: {
      tipo: "LLEVAR",
      sucursalId,
      nombreCliente: nombreCliente.trim(),
      items: cuerpoItems(items),
    },
    mensajes: {
      400: "Ingresa tu nombre completo.",
      404: "La sucursal o un platillo ya no existe.",
      422: "Algunos platillos ya no están disponibles.",
    },
  });
}

export async function obtenerSeguimiento(
  id: number,
): Promise<Resultado<PedidoSeguimiento>> {
  return llamar<PedidoSeguimiento>(`pedidos/${id}/seguimiento`, {
    mensajes: { 404: PEDIDO_NO_EXISTE },
  });
}

export async function cancelarPedidoLlevar(
  id: number,
): Promise<Resultado<PedidoCancelado>> {
  return llamar<PedidoCancelado>(`pedidos/${id}/cancelar`, {
    metodo: "POST",
    detallarErrores: true,
    mensajes: { 404: PEDIDO_NO_EXISTE, 409: YA_EN_PREPARACION },
  });
}

export async function listarMisPedidos(
  pagina = 1,
): Promise<Resultado<Pagina<PedidoResumen>>> {
  if (!Number.isInteger(pagina) || pagina < 1) {
    return { ok: false, error: "Página inválida." };
  }
  return llamar<Pagina<PedidoResumen>>(`pedidos/mios?pagina=${pagina}`);
}