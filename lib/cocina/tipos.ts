export type EstadoItemCocina = "PENDIENTE" | "LISTO" | "ENTREGADO";

export type ItemPedidoCocina = {
  id: number;
  platillo: string;
  cantidad: number;
  nota: string | null;
  estado: EstadoItemCocina;
  listoEn?: string | null;
};

export type ItemListo = {
  itemId: number;
  pedidoId?: number;
  listoEn?: string | null;
  pedidoEstado?: string;
};

export type PedidoCocina = {
  id: number;
  numero: string | null;
  tipo: "MESA" | "LLEVAR";
  destino: string;
  mesaNumero: number | null;
  creadoEn: string;
  minutosEspera: number;
  retrasado: boolean;
  items: ItemPedidoCocina[];
};

export type PedidoEnTablero = PedidoCocina & {
  recibidoEn: number;
  itemsNuevos: number[];
};
