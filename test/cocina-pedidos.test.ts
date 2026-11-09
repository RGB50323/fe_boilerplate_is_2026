import { describe, expect, it } from "vitest";
import {
  agregarPedido,
  conRecepcion,
  esPedidoCocina,
  estaRetrasado,
  formatearHora,
  minutosDeEspera,
  prepararLista,
  quitarPedido,
  reemplazarPedido,
  textoDestino,
  textoMinutos,
  textoNumero,
  urlSocketCocina,
} from "@/lib/cocina/pedidos";
import { crearPedido } from "./cocina-helpers";

const T0 = Date.parse("2026-11-06T15:30:00.000Z");
const ids = (lista: { id: number }[]) => lista.map((p) => p.id);

describe("orden de llegada", () => {
  it("ordena del más antiguo al más reciente por creadoEn", () => {
    const lista = prepararLista(
      [
        crearPedido({ id: 1, creadoEn: "2026-11-06T15:20:00.000Z" }),
        crearPedido({ id: 2, creadoEn: "2026-11-06T15:05:00.000Z" }),
        crearPedido({ id: 3, creadoEn: "2026-11-06T15:12:00.000Z" }),
      ],
      T0,
    );
    expect(ids(lista)).toEqual([2, 3, 1]);
  });

  it("desempata por id, igual que el backend", () => {
    const lista = prepararLista([crearPedido({ id: 7 }), crearPedido({ id: 4 })], T0);
    expect(ids(lista)).toEqual([4, 7]);
  });

  it("descarta pedidos sin platillos pendientes", () => {
    const completo = crearPedido({
      id: 9,
      items: [{ id: 1, platillo: "Sopa", cantidad: 1, nota: null, estado: "LISTO" }],
    });
    expect(ids(prepararLista([completo, crearPedido({ id: 1 })], T0))).toEqual([1]);
  });
});

describe("pedido:nuevo", () => {
  const base = prepararLista(
    [
      crearPedido({ id: 1, creadoEn: "2026-11-06T15:00:00.000Z" }),
      crearPedido({ id: 2, creadoEn: "2026-11-06T15:10:00.000Z" }),
    ],
    T0,
  );

  it("agrega el pedido al final", () => {
    const nuevo = conRecepcion(crearPedido({ id: 3, creadoEn: "2026-11-06T15:29:00.000Z" }), T0);
    expect(ids(agregarPedido(base, nuevo))).toEqual([1, 2, 3]);
  });

  it("no duplica un pedido que ya está por id", () => {
    const repetido = conRecepcion(crearPedido({ id: 2, creadoEn: "2026-11-06T15:10:00.000Z" }), T0);
    expect(agregarPedido(base, repetido)).toBe(base);
  });
});

describe("pedido:actualizado", () => {
  const base = prepararLista(
    [crearPedido({ id: 1 }), crearPedido({ id: 2, creadoEn: "2026-11-06T15:10:00.000Z" })],
    T0,
  );

  it("reemplaza el pedido por id conservando el orden", () => {
    const resultado = reemplazarPedido(
      base,
      crearPedido({
        id: 1,
        items: [{ id: 10, platillo: "Pupusa revuelta", cantidad: 4, nota: "Bien tostadas", estado: "PENDIENTE" }],
      }),
      T0,
    );
    expect(ids(resultado)).toEqual([1, 2]);
    expect(resultado[0].items[0]).toMatchObject({ cantidad: 4, nota: "Bien tostadas" });
  });

  it("marca como nuevos los ítems agregados a un pedido que ya estaba", () => {
    const conAgregado = crearPedido({
      id: 1,
      items: [
        { id: 10, platillo: "Pupusa revuelta", cantidad: 2, nota: null, estado: "PENDIENTE" },
        { id: 11, platillo: "Horchata", cantidad: 1, nota: null, estado: "PENDIENTE" },
      ],
    });
    const [pedido] = reemplazarPedido(base, conAgregado, T0);
    expect(pedido.itemsNuevos).toEqual([11]);

    const [otraVez] = reemplazarPedido([pedido], conAgregado, T0);
    expect(otraVez.itemsNuevos).toEqual([11]);
    expect(prepararLista([conAgregado], T0, [otraVez])[0].itemsNuevos).toEqual([11]);
  });

  it("saca el pedido si todos sus platillos están listos", () => {
    const listo = crearPedido({
      id: 1,
      items: [{ id: 10, platillo: "Pupusa revuelta", cantidad: 2, nota: null, estado: "LISTO" }],
    });
    expect(ids(reemplazarPedido(base, listo, T0))).toEqual([2]);
  });

  it("ignora pedidos que no están en la lista", () => {
    expect(reemplazarPedido(base, crearPedido({ id: 99 }), T0)).toBe(base);
  });
});

describe("pedido:retirado", () => {
  it("quita el pedido por id", () => {
    const base = prepararLista([crearPedido({ id: 1 }), crearPedido({ id: 2 })], T0);
    expect(ids(quitarPedido(base, 1))).toEqual([2]);
  });
});

describe("espera y retraso", () => {
  it("parte de minutosEspera y suma lo transcurrido en el cliente", () => {
    const pedido = conRecepcion(crearPedido({ id: 1, minutosEspera: 12 }), T0);
    expect(minutosDeEspera(pedido, T0)).toBe(12);
    expect(minutosDeEspera(pedido, T0 + 3.5 * 60_000)).toBe(15);
  });

  it("se resalta desde el minuto 16 (más de 15)", () => {
    const pedido = conRecepcion(crearPedido({ id: 1, minutosEspera: 15 }), T0);
    expect(estaRetrasado(pedido, T0)).toBe(false);
    expect(estaRetrasado(pedido, T0 + 60_000)).toBe(true);
  });

  it("respeta un umbral configurable", () => {
    const pedido = conRecepcion(crearPedido({ id: 1, minutosEspera: 8 }), T0);
    expect(estaRetrasado(pedido, T0, 5)).toBe(true);
  });

  it("formatea los minutos", () => {
    expect(textoMinutos(0)).toBe("<1 min");
    expect(textoMinutos(17)).toBe("17 min");
    expect(textoMinutos(75)).toBe("1 h 15 min");
  });
});

describe("formato", () => {
  it("muestra la hora de llegada en HH:mm (hora local)", () => {
    expect(formatearHora(new Date(2026, 10, 6, 9, 5).toISOString())).toBe("09:05");
  });

  it('muestra "Para llevar" en los pedidos LLEVAR', () => {
    const llevar = crearPedido({ id: 1, tipo: "LLEVAR", destino: "Para llevar", mesaNumero: null });
    expect(textoDestino(llevar)).toBe("Para llevar");
    expect(textoDestino(crearPedido({ id: 2, destino: "Mesa 3", mesaNumero: 3 }))).toBe("Mesa 3");
  });

  it("usa el número del pedido o el id si no tiene", () => {
    expect(textoNumero(crearPedido({ id: 41, numero: "C-0041" }))).toBe("C-0041");
    expect(textoNumero(crearPedido({ id: 41, numero: null }))).toBe("#41");
  });
});

describe("validación de la respuesta", () => {
  it("acepta un PedidoCocina y rechaza datos incompletos", () => {
    expect(esPedidoCocina(crearPedido({ id: 1 }))).toBe(true);
    expect(esPedidoCocina({ ...crearPedido({ id: 1 }), creadoEn: "ayer" })).toBe(false);
    expect(esPedidoCocina({ ...crearPedido({ id: 1 }), items: [{ id: 1 }] })).toBe(false);
    expect(esPedidoCocina(null)).toBe(false);
  });
});

describe("URL del socket", () => {
  it("usa el origen de API_URL, sin /api/v1", () => {
    expect(urlSocketCocina({ API_URL: "http://localhost:3000/api/v1" })).toBe(
      "http://localhost:3000/cocina",
    );
  });

  it("prefiere SOCKET_URL si está definida", () => {
    expect(
      urlSocketCocina({ API_URL: "http://api/api/v1", SOCKET_URL: "https://ws.example.com/" }),
    ).toBe("https://ws.example.com/cocina");
  });
});
