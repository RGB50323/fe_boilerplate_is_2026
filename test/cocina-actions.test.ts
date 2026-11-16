import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarPedidosCocina, marcarItemListo } from "@/app/actions/cocina";
import { getSession } from "@/lib/session";
import { crearPedido } from "./cocina-helpers";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const sesion = vi.mocked(getSession);
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("API_URL", "http://localhost:3000/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  sesion.mockResolvedValue("token-123");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listarPedidosCocina", () => {
  it("pide GET /cocina/pedidos con el Bearer y sin sucursalId", async () => {
    const pedidos = [crearPedido({ id: 1 })];
    fetchMock.mockResolvedValue(Response.json(pedidos));

    await expect(listarPedidosCocina()).resolves.toEqual({ pedidos });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3000/api/v1/cocina/pedidos");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-123");
    expect(String(url)).not.toMatch(/sucursal/i);
  });

  it("devuelve sinSesion sin token o con 401", async () => {
    sesion.mockResolvedValueOnce(undefined);
    await expect(listarPedidosCocina()).resolves.toEqual({ sinSesion: true });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(listarPedidosCocina()).resolves.toEqual({ sinSesion: true });
  });

  it("devuelve el motivo del backend ante un 403", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { message: "El usuario no tiene una sucursal asignada.", statusCode: 403 },
        { status: 403 },
      ),
    );
    await expect(listarPedidosCocina()).resolves.toEqual({
      sinAcceso: "El usuario no tiene una sucursal asignada.",
    });
  });

  it("devuelve error ante fallos o respuestas inválidas", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(listarPedidosCocina()).resolves.toHaveProperty("error");

    fetchMock.mockResolvedValueOnce(Response.json([{ id: "x" }]));
    await expect(listarPedidosCocina()).resolves.toHaveProperty("error");

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(listarPedidosCocina()).resolves.toHaveProperty("error");
  });
});

describe("marcarItemListo", () => {
  it("hace PATCH /cocina/items/{id}/listo sin cuerpo y devuelve el ítem", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ itemId: 301, estado: "LISTO", listoEn: "12:18", pedidoId: 120, pedidoEstado: "LISTO" }),
    );

    await expect(marcarItemListo(301)).resolves.toEqual({
      item: { itemId: 301, listoEn: "12:18", pedidoId: 120, pedidoEstado: "LISTO" },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3000/api/v1/cocina/items/301/listo");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-123");
  });

  it("un 409 indica que ya estaba listo", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 409 }));
    await expect(marcarItemListo(301)).resolves.toEqual({ yaListo: true });
  });

  it("devuelve sinSesion sin token o con 401", async () => {
    sesion.mockResolvedValueOnce(undefined);
    await expect(marcarItemListo(301)).resolves.toEqual({ sinSesion: true });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(marcarItemListo(301)).resolves.toEqual({ sinSesion: true });
  });

  it("devuelve un mensaje breve ante 403, 404, 500, red o respuesta inválida", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(marcarItemListo(301)).resolves.toEqual({ error: "No tienes permiso para marcar este platillo." });

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(marcarItemListo(301)).resolves.toEqual({ error: "Este platillo ya no existe en la comanda." });

    const generico = { error: "No pudimos marcar el platillo. Intenta de nuevo" };
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(marcarItemListo(301)).resolves.toEqual(generico);

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(marcarItemListo(301)).resolves.toEqual(generico);

    fetchMock.mockResolvedValueOnce(Response.json({ itemId: 999, estado: "LISTO" }));
    await expect(marcarItemListo(301)).resolves.toEqual(generico);
  });

  it("rechaza ids inválidos sin llamar a la API", async () => {
    await expect(marcarItemListo(0)).resolves.toHaveProperty("error");
    await expect(marcarItemListo(1.5)).resolves.toHaveProperty("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
