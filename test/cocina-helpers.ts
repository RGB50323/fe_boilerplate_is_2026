import type { SocketCocina } from "@/lib/cocina/tablero";
import type { PedidoCocina } from "@/lib/cocina/tipos";

export function crearPedido(
  parcial: Partial<PedidoCocina> & { id: number },
): PedidoCocina {
  const { id } = parcial;
  return {
    numero: `C-000${id}`,
    tipo: "MESA",
    destino: "Mesa 1",
    mesaNumero: 1,
    creadoEn: "2026-11-06T15:00:00.000Z",
    minutosEspera: 0,
    retrasado: false,
    items: [
      {
        id: id * 10,
        platillo: "Pupusa revuelta",
        cantidad: 2,
        nota: null,
        estado: "PENDIENTE",
      },
    ],
    ...parcial,
  };
}

type Oyente = (...args: unknown[]) => void;

export type SocketFalso = SocketCocina & {
  active: boolean;
  conexiones: number;
  desconexiones: number;
  emitir: (evento: string, ...args: unknown[]) => void;
};

export function crearSocketFalso(): SocketFalso {
  const oyentes = new Map<string, Oyente[]>();
  const socket: SocketFalso = {
    active: false,
    conexiones: 0,
    desconexiones: 0,
    on(evento, oyente) {
      oyentes.set(evento, [...(oyentes.get(evento) ?? []), oyente as Oyente]);
      return socket;
    },
    connect() {
      socket.active = true;
      socket.conexiones++;
      return socket;
    },
    disconnect() {
      socket.active = false;
      socket.desconexiones++;
      return socket;
    },
    emitir(evento, ...args) {
      (oyentes.get(evento) ?? []).forEach((oyente) => oyente(...args));
    },
  };
  return socket;
}

export function rechazarHandshake(socket: SocketFalso, mensaje: string) {
  socket.active = false;
  socket.emitir("connect_error", new Error(mensaje));
}

export function jwt(payload: object): string {
  const base64url = (valor: string) =>
    Buffer.from(valor).toString("base64url");
  return `${base64url('{"alg":"HS256"}')}.${base64url(JSON.stringify(payload))}.firma`;
}
