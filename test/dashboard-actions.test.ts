import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { consultarDashboard, consultarVentas } from "@/app/actions/dashboard";
import { GET as exportar } from "@/app/dashboard/exportar/route";
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
const paginaApi = { items: [], total: 0, pagina: 2, porPagina: 20 };
const rangoOctubre = {
  ...FILTROS_INICIALES,
  periodo: "rango" as const,
  desde: "2026-10-01",
  hasta: "2026-10-31",
};

beforeEach(() => {
  mocks.getSession.mockReset().mockResolvedValue("token-123");
  mocks.getUsuarioActual.mockReset().mockResolvedValue(gerente);
  vi.stubEnv("API_URL", "http://api.test/api/v1");
});

describe("consultarDashboard", () => {
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
    expect(r).toMatchObject({ motivo: "rango-invalido" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envía el rango, la sucursal, el día y el token al backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(respuestaApi));
    vi.stubGlobal("fetch", fetchMock);

    const r = await consultarDashboard({ ...rangoOctubre, sucursalId: "2", dia: "5" });

    expect(r).toEqual({ dashboard: respuestaApi });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "http://api.test/api/v1/dashboard/ventas?desde=2026-10-01&hasta=2026-10-31&sucursalId=2&diaSemana=5",
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

describe("consultarVentas", () => {
  it("pide la página al backend con el rango y la sucursal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(paginaApi));
    vi.stubGlobal("fetch", fetchMock);

    const r = await consultarVentas({ ...rangoOctubre, sucursalId: "1", dia: "5" }, 2);

    expect(r).toEqual({ ventas: paginaApi });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://api.test/api/v1/dashboard/ventas/detalle?desde=2026-10-01&hasta=2026-10-31&sucursalId=1&pagina=2&porPagina=20",
    );
  });

  it("rechaza una página no válida", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await consultarVentas(rangoOctubre, 0)).toMatchObject({ motivo: "error" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no consulta si el usuario no es gerente general", async () => {
    mocks.getUsuarioActual.mockResolvedValue(mesero);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await consultarVentas(rangoOctubre, 1)).toMatchObject({ motivo: "sin-acceso" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con datos de prueba pagina de 20 en 20, de la más reciente a la más antigua", async () => {
    vi.stubEnv("DASHBOARD_DATOS_PRUEBA", "true");
    const r = await consultarVentas(rangoOctubre, 1);
    const items = r.ventas!.items;
    expect(items).toHaveLength(20);
    expect(r.ventas!.total).toBeGreaterThan(20);
    expect(items[0].fecha >= items[19].fecha).toBe(true);
  });
});

// Response.text() descarta el BOM, así que se lee el cuerpo conservándolo.
const textoConBom = async (res: Response) =>
  new TextDecoder("utf-8", { ignoreBOM: true }).decode(await res.arrayBuffer());

describe("GET /dashboard/exportar", () => {
  const pedir = (qs: string) =>
    exportar(new NextRequest(`http://localhost/dashboard/exportar?${qs}`));

  it("descarga el CSV del backend como archivo", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("Fecha,Hora\r\n08/11/2026,12:05", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await pedir("periodo=rango&desde=2026-10-01&hasta=2026-10-31&sucursal=2");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="ventas-confirmadas_2026-10-01_2026-10-31.csv"',
    );
    expect(await textoConBom(res)).toBe("﻿Fecha,Hora\r\n08/11/2026,12:05");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://api.test/api/v1/dashboard/ventas/exportar?desde=2026-10-01&hasta=2026-10-31&sucursalId=2",
    );
  });

  it("responde 403 a quien no es gerente general", async () => {
    mocks.getUsuarioActual.mockResolvedValue(mesero);
    const res = await pedir("periodo=mes");
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ motivo: "sin-acceso" });
  });

  it("responde 400 si el rango no es válido", async () => {
    const res = await pedir("periodo=rango&desde=2026-10-31&hasta=2026-10-01");
    expect(res.status).toBe(400);
  });

  it("con datos de prueba genera el CSV sin llamar al backend", async () => {
    vi.stubEnv("DASHBOARD_DATOS_PRUEBA", "true");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await pedir("periodo=rango&desde=2026-10-01&hasta=2026-10-02");
    const lineas = (await textoConBom(res)).split("\r\n");
    expect(lineas[0]).toBe(
      "﻿Fecha,Hora,Pedido,Sucursal,Tipo,Artículos,Subtotal,Descuentos,Venta",
    );
    expect(lineas.length).toBeGreaterThan(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
