import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelarPedidoLlevar,
  obtenerSeguimiento,
} from "@/app/actions/pedidos";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const fetchMock = vi.fn();
const seguimiento = {
  pedidoId: 121,
  numero: "S1-000121",
  estado: "RECIBIDO",
  sucursal: "Centro",
  nombreCliente: "Ana López",
  total: 17.98,
  creadoEn: "2026-11-14T18:00:00.000Z",
  pago: "CONFIRMADO",
  items: [],
};

beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-cliente");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("obtenerSeguimiento", () => {
  it("consulta el seguimiento con el token", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(seguimiento), { status: 200 }),
    );
    expect(await obtenerSeguimiento(121)).toEqual({
      ok: true,
      datos: seguimiento,
    });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/pedidos/121/seguimiento");
    expect(opciones.headers.Authorization).toBe("Bearer token-cliente");
  });

  it("traduce el 404", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    expect(await obtenerSeguimiento(999)).toEqual({
      ok: false,
      error: "El pedido no existe.",
    });
  });

  it("sin sesión no hace la petición", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    expect(await obtenerSeguimiento(121)).toMatchObject({
      ok: false,
      sinSesion: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("cancelarPedidoLlevar", () => {
  it("cancela con POST y devuelve estado y pago", async () => {
    const cancelado = {
      pedidoId: 121,
      estado: "CANCELADO",
      pago: "REEMBOLSADO",
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(cancelado), { status: 200 }),
    );
    expect(await cancelarPedidoLlevar(121)).toEqual({
      ok: true,
      datos: cancelado,
    });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/pedidos/121/cancelar");
    expect(opciones.method).toBe("POST");
  });

  it("el 409 explica que ya está en preparación e indica el estado", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 409 }));
    expect(await cancelarPedidoLlevar(121)).toMatchObject({
      ok: false,
      error: "Tu pedido ya está en preparación y no se puede cancelar.",
      estado: 409,
    });
  });

  it("traduce el 404", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    expect(await cancelarPedidoLlevar(121)).toMatchObject({
      ok: false,
      error: "El pedido no existe.",
    });
  });

  it("el 401 pide iniciar sesión", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 401 }));
    expect(await cancelarPedidoLlevar(121)).toMatchObject({
      ok: false,
      sinSesion: true,
    });
  });

  it("maneja fallos de red sin lanzar", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await cancelarPedidoLlevar(121)).toMatchObject({ ok: false });
  });
});
