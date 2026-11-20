import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarAlertas, marcarAlertaVista } from "@/app/actions/alertas-inventario";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const ALERTA = {
  id: 9,
  insumoId: 5,
  insumo: "Masa de maíz",
  cantidad: 18,
  minimo: 20,
  unidad: "lb",
  estado: "ACTIVA",
  creadaEn: "2026-11-12T12:40:00-06:00",
};

beforeEach(() => {
  vi.stubEnv("API_URL", "http://localhost:3000/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-gerente");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listarAlertas", () => {
  it("pide GET /inventario/alertas con el Bearer", async () => {
    fetchMock.mockResolvedValue(Response.json([ALERTA]));

    await expect(listarAlertas()).resolves.toEqual({ alertas: [ALERTA] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3000/api/v1/inventario/alertas");
    expect(init?.method).toBe("GET");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-gerente");
  });

  it("sinSesion con 401, y error ante 403, 500, red o datos inválidos", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(listarAlertas()).resolves.toEqual({ sinSesion: true });

    const error = { error: "No pudimos cargar las alertas" };
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(listarAlertas()).resolves.toEqual(error);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(listarAlertas()).resolves.toEqual(error);
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(listarAlertas()).resolves.toEqual(error);
    fetchMock.mockResolvedValueOnce(Response.json([{ ...ALERTA, estado: "X" }]));
    await expect(listarAlertas()).resolves.toEqual(error);
  });
});

describe("marcarAlertaVista", () => {
  it("hace PATCH /inventario/alertas/{id}/vista", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 9, estado: "VISTA", vistaEn: "2026-11-12T12:45:00-06:00" }));

    await expect(marcarAlertaVista(9)).resolves.toEqual({ vista: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3000/api/v1/inventario/alertas/9/vista");
    expect(init?.method).toBe("PATCH");
  });

  it("409 indica que ya fue resuelta; 404, 403 y 500 devuelven un mensaje", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ statusCode: 409 }, { status: 409 }));
    await expect(marcarAlertaVista(9)).resolves.toEqual({ resuelta: true });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(marcarAlertaVista(9)).resolves.toEqual({ error: "Esta alerta ya no existe." });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(marcarAlertaVista(9)).resolves.toEqual({
      error: "No tienes permiso para realizar esta acción.",
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(marcarAlertaVista(9)).resolves.toEqual({
      error: "No pudimos marcar la alerta como vista. Intenta de nuevo.",
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(marcarAlertaVista(9)).resolves.toEqual({ sinSesion: true });
  });

  it("no llama al backend con un id inválido", async () => {
    await marcarAlertaVista(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
