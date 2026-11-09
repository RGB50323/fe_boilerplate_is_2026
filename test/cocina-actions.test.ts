import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarPedidosCocina } from "@/app/actions/cocina";
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
