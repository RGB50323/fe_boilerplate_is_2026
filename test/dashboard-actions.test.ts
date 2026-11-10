import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarDashboard } from "@/app/actions/dashboard";
import { FILTROS_INICIALES } from "@/lib/dashboard";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUsuarioActual: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  ROL_GERENTE_GENERAL: "GERENTE_GENERAL",
  getSession: mocks.getSession,
  getUsuarioActual: mocks.getUsuarioActual,
}));

const gerente = {
  estado: "ok",
  usuario: { id: "1", email: "gerente@losburle.com", rol: "GERENTE_GENERAL" },
};
const mesero = {
  estado: "ok",
  usuario: { id: "2", email: "mesero@losburle.com", rol: "MESERO" },
};
const respuestaApi = {
  desde: "2026-10-01",
  hasta: "2026-10-31",
  sucursales: [],
  platillos: [],
  horariosPico: [],
};
const rangoOctubre = {
  ...FILTROS_INICIALES,
  periodo: "rango" as const,
  desde: "2026-10-01",
  hasta: "2026-10-31",
};

describe("consultarDashboard", () => {
  beforeEach(() => {
    mocks.getSession.mockReset().mockResolvedValue("token-123");
    mocks.getUsuarioActual.mockReset().mockResolvedValue(gerente);
    vi.stubEnv("API_URL", "http://api.test");
  });

  it("no consulta al backend si el usuario no es gerente general", async () => {
    mocks.getUsuarioActual.mockResolvedValue(mesero);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await consultarDashboard(FILTROS_INICIALES)).toEqual({
      error: "No tenés acceso al dashboard de ventas.",
      motivo: "sin-acceso",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no consulta si el rango no es válido", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const r = await consultarDashboard({ ...rangoOctubre, hasta: "2026-09-01" });
    expect(r.error).toBe("El rango de fechas no es válido.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envía el rango, la sucursal, el día y el token al backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(respuestaApi));
    vi.stubGlobal("fetch", fetchMock);

    const r = await consultarDashboard({ ...rangoOctubre, sucursalId: "2", dia: "5" });

    expect(r).toEqual({ dashboard: respuestaApi });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "http://api.test/dashboard/ventas?desde=2026-10-01&hasta=2026-10-31&sucursalId=2&diaSemana=5",
    );
    expect(init.headers).toEqual({ Authorization: "Bearer token-123" });
  });

  it("traduce un 403 del backend a sin acceso", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    expect(await consultarDashboard(rangoOctubre)).toMatchObject({ motivo: "sin-acceso" });
  });

  it("traduce un 401 del backend a sesión expirada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    expect(await consultarDashboard(rangoOctubre)).toMatchObject({ motivo: "sin-sesion" });
  });

  it("devuelve un error genérico si el backend falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    expect(await consultarDashboard(rangoOctubre)).toEqual({
      error: "No pudimos cargar el dashboard",
      motivo: "error",
    });
  });

  it("con datos de prueba responde sin llamar al backend", async () => {
    vi.stubEnv("DASHBOARD_DATOS_PRUEBA", "true");
    mocks.getUsuarioActual.mockResolvedValue({ estado: "error" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const r = await consultarDashboard(rangoOctubre);
    expect(r.dashboard?.sucursales.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("los datos de prueba nunca se usan en producción", async () => {
    vi.stubEnv("DASHBOARD_DATOS_PRUEBA", "true");
    vi.stubEnv("NODE_ENV", "production");
    mocks.getUsuarioActual.mockResolvedValue({ estado: "error" });

    expect(await consultarDashboard(rangoOctubre)).toMatchObject({ motivo: "error" });
  });
});
