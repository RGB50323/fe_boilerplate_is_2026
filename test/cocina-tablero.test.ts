import { beforeEach, describe, expect, it, vi } from "vitest";
import { estaRetrasado } from "@/lib/cocina/pedidos";
import {
  NoAutorizadoError,
  SinAccesoError,
  crearTablero,
  type AvisoTablero,
} from "@/lib/cocina/tablero";
import type { PedidoCocina } from "@/lib/cocina/tipos";
import {
  crearPedido,
  crearSocketFalso,
  rechazarHandshake,
  type SocketFalso,
} from "./cocina-helpers";

const ids = (lista: { id: number }[]) => lista.map((p) => p.id);

function montar(respuestas: Array<PedidoCocina[] | Error>) {
  const socket = crearSocketFalso();
  let llamada = 0;
  const obtenerPedidos = vi.fn(async () => {
    const respuesta = respuestas[Math.min(llamada++, respuestas.length - 1)];
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  });
  const alNoAutorizado = vi.fn();
  const avisos: AvisoTablero[] = [];
  const tablero = crearTablero({
    crearSocket: () => socket,
    obtenerPedidos,
    alNoAutorizado,
    alAvisar: (aviso) => avisos.push(aviso),
  });
  return { tablero, socket, obtenerPedidos, alNoAutorizado, avisos };
}

async function vaciar() {
  await vi.advanceTimersByTimeAsync(0);
}

async function conectar(socket: SocketFalso) {
  socket.emitir("connect");
  await vaciar();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-06T15:30:00.000Z"));
});

describe("tablero de cocina", () => {
  it("carga los pedidos del más antiguo al más reciente", async () => {
    const { tablero, socket } = montar([
      [
        crearPedido({ id: 1, creadoEn: "2026-11-06T15:20:00.000Z" }),
        crearPedido({ id: 2, creadoEn: "2026-11-06T15:01:00.000Z" }),
      ],
    ]);
    tablero.iniciar();
    expect(tablero.obtenerEstado().carga).toBe("cargando");
    await conectar(socket);

    expect(tablero.obtenerEstado()).toMatchObject({ carga: "listo", conexion: "en-vivo" });
    expect(ids(tablero.obtenerEstado().pedidos)).toEqual([2, 1]);
    tablero.detener();
  });

  it("pedido:nuevo agrega al final sin duplicar por id y avisa una vez", async () => {
    const { tablero, socket, avisos } = montar([[crearPedido({ id: 1 })]]);
    tablero.iniciar();
    await conectar(socket);

    const nuevo = crearPedido({ id: 2, creadoEn: "2026-11-06T15:29:00.000Z" });
    socket.emitir("pedido:nuevo", nuevo);
    socket.emitir("pedido:nuevo", nuevo);
    socket.emitir("pedido:nuevo", crearPedido({ id: 1 }));

    expect(ids(tablero.obtenerEstado().pedidos)).toEqual([1, 2]);
    expect(avisos.map((a) => [a.tipo, a.pedido.id])).toEqual([["nuevo", 2]]);
    tablero.detener();
  });

  it("pedido:retirado quita el pedido", async () => {
    const { tablero, socket } = montar([[crearPedido({ id: 1 }), crearPedido({ id: 2 })]]);
    tablero.iniciar();
    await conectar(socket);

    socket.emitir("pedido:retirado", { id: 1 });
    expect(ids(tablero.obtenerEstado().pedidos)).toEqual([2]);
    tablero.detener();
  });

  it("pedido:actualizado reemplaza el pedido por id", async () => {
    const { tablero, socket } = montar([[crearPedido({ id: 1 }), crearPedido({ id: 2 })]]);
    tablero.iniciar();
    await conectar(socket);

    socket.emitir(
      "pedido:actualizado",
      crearPedido({
        id: 2,
        items: [{ id: 20, platillo: "Yuca frita", cantidad: 3, nota: "Extra curtido", estado: "PENDIENTE" }],
      }),
    );

    const pedidos = tablero.obtenerEstado().pedidos;
    expect(ids(pedidos)).toEqual([1, 2]);
    expect(pedidos[1].items).toEqual([
      expect.objectContaining({ platillo: "Yuca frita", nota: "Extra curtido" }),
    ]);
    tablero.detener();
  });

  it("pasa a retrasado al cruzar los 15 min sin eventos nuevos y avisa", async () => {
    const { tablero, socket, avisos } = montar([[crearPedido({ id: 1, minutosEspera: 14 })]]);
    tablero.iniciar();
    await conectar(socket);

    const retrasado = () => {
      const { pedidos, ahora } = tablero.obtenerEstado();
      return estaRetrasado(pedidos[0], ahora);
    };
    expect(retrasado()).toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(retrasado()).toBe(false);
    expect(avisos).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(retrasado()).toBe(true);
    expect(avisos.map((a) => a.tipo)).toEqual(["retrasado"]);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(avisos).toHaveLength(1);
    tablero.detener();
  });

  it("vuelve a pedir GET en cada reconexión", async () => {
    const { tablero, socket, obtenerPedidos } = montar([
      [crearPedido({ id: 1 })],
      [crearPedido({ id: 1 })],
      [crearPedido({ id: 1 }), crearPedido({ id: 5, creadoEn: "2026-11-06T15:25:00.000Z" })],
    ]);
    tablero.iniciar();
    await conectar(socket);
    const llamadas = obtenerPedidos.mock.calls.length;

    socket.emitir("disconnect", "transport close");
    expect(tablero.obtenerEstado().conexion).toBe("reconectando");

    await conectar(socket);
    expect(obtenerPedidos).toHaveBeenCalledTimes(llamadas + 1);
    expect(tablero.obtenerEstado().conexion).toBe("en-vivo");
    expect(ids(tablero.obtenerEstado().pedidos)).toEqual([1, 5]);
    tablero.detener();
  });

  it("reintenta cada 3 s si el servidor corta la conexión", async () => {
    const { tablero, socket } = montar([[]]);
    tablero.iniciar();
    await conectar(socket);
    const conexiones = socket.conexiones;

    socket.active = false;
    socket.emitir("disconnect", "io server disconnect");
    await vi.advanceTimersByTimeAsync(2_999);
    expect(socket.conexiones).toBe(conexiones);
    await vi.advanceTimersByTimeAsync(1);
    expect(socket.conexiones).toBe(conexiones + 1);
    tablero.detener();
  });

  it("no pierde eventos que llegan mientras se resincroniza", async () => {
    const { tablero, socket } = montar([[crearPedido({ id: 1 }), crearPedido({ id: 2 })]]);
    tablero.iniciar();
    socket.emitir("connect");
    socket.emitir("pedido:retirado", { id: 2 });
    await vaciar();
    expect(ids(tablero.obtenerEstado().pedidos)).toEqual([1]);
    tablero.detener();
  });

  it("muestra error si falla la carga y permite reintentar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { tablero } = montar([new Error("boom"), [crearPedido({ id: 1 })]]);
    tablero.iniciar();
    await vaciar();
    expect(tablero.obtenerEstado().carga).toBe("error");

    tablero.reintentar();
    expect(tablero.obtenerEstado().carga).toBe("cargando");
    await vaciar();
    expect(tablero.obtenerEstado().carga).toBe("listo");
    tablero.detener();
  });

  it("cierra la sesión si el socket rechaza el token", async () => {
    const { tablero, socket, alNoAutorizado } = montar([[]]);
    tablero.iniciar();
    rechazarHandshake(socket, "Token de acceso inválido o expirado.");
    expect(alNoAutorizado).toHaveBeenCalledTimes(1);
    expect(socket.desconexiones).toBe(1);
  });

  it("cierra la sesión si el HTTP responde 401", async () => {
    const { tablero, socket, alNoAutorizado } = montar([new NoAutorizadoError()]);
    tablero.iniciar();
    await vaciar();
    expect(alNoAutorizado).toHaveBeenCalledTimes(1);
    expect(socket.desconexiones).toBe(1);
  });

  it("muestra sin acceso si el backend rechaza por rol o sucursal", async () => {
    const porSocket = montar([[]]);
    porSocket.tablero.iniciar();
    rechazarHandshake(porSocket.socket, "El usuario no tiene una sucursal asignada.");
    expect(porSocket.tablero.obtenerEstado()).toMatchObject({
      carga: "sin-acceso",
      mensaje: "El usuario no tiene una sucursal asignada.",
    });
    expect(porSocket.alNoAutorizado).not.toHaveBeenCalled();

    const porHttp = montar([new SinAccesoError("No tenés permiso para acceder a este recurso.")]);
    porHttp.tablero.iniciar();
    await vaciar();
    expect(porHttp.tablero.obtenerEstado().carga).toBe("sin-acceso");
    expect(porHttp.alNoAutorizado).not.toHaveBeenCalled();
  });

  it("un error de red del socket no cierra la sesión", async () => {
    const { tablero, socket, alNoAutorizado } = montar([[]]);
    tablero.iniciar();
    socket.emitir("connect_error", new Error("websocket error"));
    expect(alNoAutorizado).not.toHaveBeenCalled();
    expect(tablero.obtenerEstado().conexion).toBe("reconectando");
    tablero.detener();
  });

  it("abre el socket al iniciar y lo cierra al detener", () => {
    const { tablero, socket } = montar([[]]);
    tablero.iniciar();
    expect(socket.conexiones).toBe(1);
    tablero.detener();
    expect(socket.desconexiones).toBe(1);
    socket.emitir("pedido:nuevo", crearPedido({ id: 1 }));
    expect(tablero.obtenerEstado().pedidos).toHaveLength(0);
  });
});
