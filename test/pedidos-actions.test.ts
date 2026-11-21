import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  agregarItems,
  cambiarItem,
  crearPedido,
  listarMesas,
  obtenerPedido,
  quitarItem,
} from "@/app/actions/pedidos";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/session", () => mocks);

const fetchMock = vi.fn();

function responder(status: number, cuerpo: unknown = {}) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  });
}

function llamada() {
  const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
  return { url: String(url), init };
}

beforeEach(() => {
  fetchMock.mockReset();
  mocks.getSession.mockReset();
  mocks.getSession.mockResolvedValue("token-123");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", "http://api.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("listarMesas", () => {
  it("pide las mesas de la sucursal con el token", async () => {
    const mesas = [
      {
        id: 3,
        numero: 3,
        capacidad: 4,
        zona: null,
        activa: true,
        pedidoAbiertoId: null,
      },
    ];
    responder(200, mesas);

    const resultado = await listarMesas(1);

    const { url, init } = llamada();
    expect(url).toBe("http://api.test/sucursales/1/mesas");
    expect(init.method).toBe("GET");
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-123" });
    expect(resultado).toEqual({ ok: true, datos: mesas });
  });
});

describe("obtenerPedido", () => {
  it("traduce el 404", async () => {
    responder(404);

    expect(await obtenerPedido(99)).toEqual({
      ok: false,
      error: "El pedido no existe.",
    });
  });
});

describe("crearPedido", () => {
  it("envía el pedido de mesa y omite las notas vacías", async () => {
    const creado = {
      pedidoId: 120,
      numero: "S1-000120",
      estado: "ENVIADO_COCINA",
      total: 3.75,
      creadoEn: "2026-11-13T18:05:00.000Z",
    };
    responder(201, creado);

    const resultado = await crearPedido(4, [
      { platilloId: 12, cantidad: 2, nota: "sin cebolla" },
      { platilloId: 13, cantidad: 1, nota: null },
    ]);

    const { url, init } = llamada();
    expect(url).toBe("http://api.test/pedidos");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      tipo: "MESA",
      mesaId: 4,
      items: [
        { platilloId: 12, cantidad: 2, nota: "sin cebolla" },
        { platilloId: 13, cantidad: 1 },
      ],
    });
    expect(resultado).toEqual({ ok: true, datos: creado });
  });

  it.each([
    [400, "Revisa los platillos: la cantidad o las notas no son válidas."],
    [404, "La mesa o un platillo ya no existe."],
    [409, "Esta mesa ya tiene un pedido abierto."],
    [422, "Revisa los platillos: alguno no está disponible o se agotó."],
  ])("traduce el %i", async (status, mensaje) => {
    responder(status);

    expect(await crearPedido(4, [{ platilloId: 1, cantidad: 1 }])).toEqual({
      ok: false,
      error: mensaje,
    });
  });

  it("usa el mensaje de envío en un error 500", async () => {
    responder(500);

    expect(await crearPedido(4, [{ platilloId: 1, cantidad: 1 }])).toEqual({
      ok: false,
      error: "No pudimos enviar el pedido. Intenta de nuevo.",
    });
  });

  it("usa el mensaje de envío si falla la red", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("sin red"));

    expect(await crearPedido(4, [{ platilloId: 1, cantidad: 1 }])).toEqual({
      ok: false,
      error: "No pudimos enviar el pedido. Intenta de nuevo.",
    });
  });

  it("no llama a la API sin sesión", async () => {
    mocks.getSession.mockResolvedValue(null);

    const resultado = await crearPedido(4, [{ platilloId: 1, cantidad: 1 }]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(resultado).toEqual({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
      sinSesion: true,
    });
  });

  it("marca sinSesion cuando la API responde 401", async () => {
    responder(401);

    expect(await crearPedido(4, [{ platilloId: 1, cantidad: 1 }])).toEqual({
      ok: false,
      error: "Tu sesión expiró. Inicia sesión de nuevo.",
      sinSesion: true,
    });
  });

  it("avisa cuando no hay permiso (403)", async () => {
    responder(403);

    expect(await crearPedido(4, [{ platilloId: 1, cantidad: 1 }])).toEqual({
      ok: false,
      error: "No tienes permiso para realizar esta acción.",
    });
  });
});

describe("agregarItems", () => {
  it("agrega platillos a un pedido abierto", async () => {
    const respuesta = {
      pedidoId: 120,
      total: 6.75,
      itemsAgregados: [
        { itemId: 400, platilloId: 12, cantidad: 2, estado: "PENDIENTE" },
      ],
    };
    responder(201, respuesta);

    const resultado = await agregarItems(120, [
      { platilloId: 12, cantidad: 2 },
    ]);

    const { url, init } = llamada();
    expect(url).toBe("http://api.test/pedidos/120/items");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      items: [{ platilloId: 12, cantidad: 2 }],
    });
    expect(resultado).toEqual({ ok: true, datos: respuesta });
  });

  it("traduce el 409 de pedido cerrado", async () => {
    responder(409);

    expect(await agregarItems(120, [{ platilloId: 1, cantidad: 1 }])).toEqual({
      ok: false,
      error: "El pedido ya está cerrado.",
    });
  });

  it("traduce el 422 de disponibilidad", async () => {
    responder(422);

    expect(await agregarItems(120, [{ platilloId: 1, cantidad: 1 }])).toEqual({
      ok: false,
      error: "Revisa los platillos: alguno no está disponible o se agotó.",
    });
  });
});

describe("cambiarItem", () => {
  it("cambia la cantidad con PATCH", async () => {
    responder(200, { pedidoId: 120, total: 11.25 });

    const resultado = await cambiarItem(120, 305, { cantidad: 3 });

    const { url, init } = llamada();
    expect(url).toBe("http://api.test/pedidos/120/items/305");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ cantidad: 3 });
    expect(resultado).toEqual({
      ok: true,
      datos: { pedidoId: 120, total: 11.25 },
    });
  });

  it.each([
    [400, "Revisa la cantidad o la nota del platillo."],
    [404, "El platillo del pedido no existe."],
    [409, "Este platillo ya está listo y no se puede modificar."],
    [422, "No hay disponibilidad suficiente de este platillo."],
  ])("traduce el %i", async (status, mensaje) => {
    responder(status);

    expect(await cambiarItem(120, 305, { cantidad: 2 })).toEqual({
      ok: false,
      error: mensaje,
    });
  });
});

describe("quitarItem", () => {
  it("quita el platillo con DELETE", async () => {
    responder(200, { pedidoId: 120, total: 3.75 });

    const resultado = await quitarItem(120, 305);

    const { url, init } = llamada();
    expect(url).toBe("http://api.test/pedidos/120/items/305");
    expect(init.method).toBe("DELETE");
    expect(resultado).toEqual({
      ok: true,
      datos: { pedidoId: 120, total: 3.75 },
    });
  });

  it.each([
    [404, "El platillo del pedido no existe."],
    [409, "Este platillo ya está listo y no se puede modificar."],
  ])("traduce el %i", async (status, mensaje) => {
    responder(status);

    expect(await quitarItem(120, 305)).toEqual({ ok: false, error: mensaje });
  });
});