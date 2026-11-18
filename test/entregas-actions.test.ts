import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarItemsListos, marcarItemEntregado } from "@/app/actions/entregas";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const ITEM = { itemId: 301, pedidoId: 120, mesa: 7, platillo: "Pupusa revuelta", cantidad: 3, listoEn: "12:18" };

beforeEach(() => {
  vi.stubEnv("API_URL", "http://localhost:3000/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-mesero");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listarItemsListos", () => {
  it("pide GET /mesero/items-listos con el Bearer y sin sucursal", async () => {
    fetchMock.mockResolvedValue(Response.json([ITEM]));

    await expect(listarItemsListos()).resolves.toEqual({ items: [ITEM] });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3000/api/v1/mesero/items-listos");
    expect(init?.method).toBe("GET");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-mesero");
  });

  it("devuelve sinSesion sin token o con 401", async () => {
    vi.mocked(getSession).mockResolvedValueOnce(undefined);
    await expect(listarItemsListos()).resolves.toEqual({ sinSesion: true });

    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(listarItemsListos()).resolves.toEqual({ sinSesion: true });
  });

  it("devuelve error ante 403, 500, red o respuesta inválida", async () => {
    const error = { error: "No pudimos cargar los platillos" };
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(listarItemsListos()).resolves.toEqual(error);

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(listarItemsListos()).resolves.toEqual(error);

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(listarItemsListos()).resolves.toEqual(error);

    fetchMock.mockResolvedValueOnce(Response.json([{ ...ITEM, mesa: null }]));
    await expect(listarItemsListos()).resolves.toEqual(error);
  });
});

describe("marcarItemEntregado", () => {
  it("hace PATCH /mesero/items/{id}/entregado sin cuerpo", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ itemId: 301, estado: "ENTREGADO", entregadoEn: "12:25", pedidoEstado: "ENTREGADO" }),
    );

    await expect(marcarItemEntregado(301)).resolves.toEqual({
      entregado: { itemId: 301, entregadoEn: "12:25", pedidoEstado: "ENTREGADO" },
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3000/api/v1/mesero/items/301/entregado");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBeUndefined();
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-mesero");
  });

  it.each([409, 422])("un %i pide refrescar la lista", async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    await expect(marcarItemEntregado(301)).resolves.toEqual({ refrescar: true });
  });

  it("devuelve sinSesion con 401", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(marcarItemEntregado(301)).resolves.toEqual({ sinSesion: true });
  });

  it("devuelve un mensaje breve ante 403, 404, 500, red o respuesta inválida", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(marcarItemEntregado(301)).resolves.toEqual({ error: "No tienes permiso para realizar esta acción." });

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(marcarItemEntregado(301)).resolves.toEqual({ error: "Este platillo ya no existe en el pedido." });

    const generico = { error: "No pudimos marcar el platillo como entregado. Intenta de nuevo." };
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(marcarItemEntregado(301)).resolves.toEqual(generico);

    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(marcarItemEntregado(301)).resolves.toEqual(generico);

    fetchMock.mockResolvedValueOnce(Response.json({ itemId: 999, estado: "ENTREGADO" }));
    await expect(marcarItemEntregado(301)).resolves.toEqual(generico);
  });

  it("rechaza ids inválidos sin llamar a la API", async () => {
    await expect(marcarItemEntregado(0)).resolves.toHaveProperty("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
