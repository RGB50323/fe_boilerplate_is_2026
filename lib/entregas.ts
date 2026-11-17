export type ItemPorEntregar = {
  itemId: number;
  pedidoId: number;
  mesa: number;
  platillo: string;
  cantidad: number;
  listoEn: string | null;
};

export type MesaPorEntregar = {
  mesa: number;
  items: ItemPorEntregar[];
};

export type ItemEntregado = {
  itemId: number;
  entregadoEn: string | null;
  pedidoEstado: string | null;
};

function enteroPositivo(valor: unknown): valor is number {
  return Number.isInteger(valor) && (valor as number) > 0;
}

export function esItemPorEntregar(valor: unknown): valor is ItemPorEntregar {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Record<string, unknown>;
  return (
    enteroPositivo(item.itemId) &&
    enteroPositivo(item.pedidoId) &&
    Number.isInteger(item.mesa) &&
    typeof item.platillo === "string" &&
    enteroPositivo(item.cantidad) &&
    (item.listoEn === null || typeof item.listoEn === "string")
  );
}

export function leerItemEntregado(valor: unknown): ItemEntregado | null {
  if (!valor || typeof valor !== "object") return null;
  const datos = valor as Record<string, unknown>;
  if (!enteroPositivo(datos.itemId)) return null;
  if (datos.estado !== undefined && datos.estado !== "ENTREGADO") return null;
  return {
    itemId: datos.itemId,
    entregadoEn: typeof datos.entregadoEn === "string" ? datos.entregadoEn : null,
    pedidoEstado: typeof datos.pedidoEstado === "string" ? datos.pedidoEstado : null,
  };
}

export function agruparPorMesa(items: ItemPorEntregar[]): MesaPorEntregar[] {
  const grupos = new Map<number, ItemPorEntregar[]>();
  for (const item of items) {
    grupos.set(item.mesa, [...(grupos.get(item.mesa) ?? []), item]);
  }
  return [...grupos].map(([mesa, itemsDeMesa]) => ({ mesa, items: itemsDeMesa }));
}

export function quitarItem(items: ItemPorEntregar[], itemId: number): ItemPorEntregar[] {
  return items.some((item) => item.itemId === itemId)
    ? items.filter((item) => item.itemId !== itemId)
    : items;
}

export function textoPorEntregar(cantidad: number): string {
  return `${cantidad} por entregar`;
}
