import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarReporteCalificaciones } from "@/app/actions/resenas";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const fetchMock = vi.fn();
const reporte = {
  sucursal: "Centro",
  promedio: 4,
  total: 2,
  distribucion: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
  desde: "2026-11-01",
  hasta: "2026-11-15",
};
const respuesta = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-seguro");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("consultarReporteCalificaciones", () => {
  it("pide el reporte con el rango y Bearer", async () => {
    fetchMock.mockResolvedValue(respuesta(reporte));
    await expect(
      consultarReporteCalificaciones("2026-11-01", "2026-11-15"),
    ).resolves.toEqual({ reporte });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "http://backend.test/api/v1/resenas/reporte?desde=2026-11-01&hasta=2026-11-15",
    );
    expect(init.headers.Authorization).toBe("Bearer token-seguro");
  });

  it("sin rango no manda parámetros", async () => {
    fetchMock.mockResolvedValue(respuesta(reporte));
    await consultarReporteCalificaciones("", "");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://backend.test/api/v1/resenas/reporte",
    );
  });

  it("no consulta si la fecha final es anterior", async () => {
    await expect(
      consultarReporteCalificaciones("2026-11-15", "2026-11-01"),
    ).resolves.toEqual({
      error: "La fecha final no puede ser anterior a la inicial.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("403 da el mensaje de la sección", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 403));
    await expect(consultarReporteCalificaciones("", "")).resolves.toEqual({
      error: "No tienes permiso para ver esta sección",
    });
  });

  it("sin sesión lo indica", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 401));
    await expect(consultarReporteCalificaciones("", "")).resolves.toEqual({
      sinSesion: true,
    });
  });
});
