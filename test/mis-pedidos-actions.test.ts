import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarMisPedidos } from "@/app/actions/pedidos";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const fetchMock = vi.fn();
const lista = { datos: [], pagina: 2, totalPaginas: 2, total: 11 };

beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-cliente");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listarMisPedidos", () => {
  it("pide la página indicada con el token", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(lista), { status: 200 }));
    expect(await listarMisPedidos(2)).toEqual({ ok: true, datos: lista });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/pedidos/mios");
    expect(url.searchParams.get("pagina")).toBe("2");
    expect(opciones.headers.Authorization).toBe("Bearer token-cliente");
  });

  it("usa la página 1 por defecto", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(lista), { status: 200 }));
    await listarMisPedidos();
    expect(fetchMock.mock.calls[0][0].searchParams.get("pagina")).toBe("1");
  });

  it.each([0, -1, 1.5])("rechaza la página %s sin llamar al servidor", async (pagina) => {
    expect(await listarMisPedidos(pagina)).toEqual({
      ok: false,
      error: "Página inválida.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin sesión no hace la petición", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    expect(await listarMisPedidos()).toMatchObject({ ok: false, sinSesion: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maneja fallos de red sin lanzar", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await listarMisPedidos()).toMatchObject({ ok: false });
  });
});