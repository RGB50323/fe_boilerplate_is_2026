import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buscarPlatillosBeneficio,
  deshabilitarBeneficio,
  guardarBeneficio,
  listarBeneficios,
  obtenerBeneficio,
} from "@/app/actions/beneficios";
import { validarBeneficio } from "@/lib/beneficios";
import { retornoLogin } from "@/lib/retorno-login";
import { rolesRequeridosPara } from "@/lib/roles";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSession }));

const datos = {
  platilloId: 15,
  costoPuntos: 150,
  vigenteDesde: "2026-11-25",
  vigenteHasta: "2026-11-25",
};
const respuesta = {
  id: 9,
  ...datos,
  nombre: "Hamburguesa clásica",
  descripcion: null,
  estado: "PROGRAMADO",
  creadoEn: "2026-11-20T16:00:00.000Z",
  modificadoEn: null,
  deshabilitadoEn: null,
  platillo: { id: 15, nombre: "Hamburguesa clásica", descripcion: null },
};
const fetchApi = vi.fn();

beforeEach(() => {
  vi.stubEnv("API_URL", "http://localhost:3000/api/v1");
  vi.stubGlobal("fetch", fetchApi);
  fetchApi.mockReset();
  getSession.mockResolvedValue("sesion-de-prueba");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("acciones H20", () => {
  it("consume los parámetros de listado, búsqueda y detalle de la API", async () => {
    fetchApi.mockImplementation(() =>
      Promise.resolve(
        Response.json({ datos: [], pagina: 2, total: 0, totalPaginas: 0 }),
      ),
    );
    await listarBeneficios(2, "SIN_PLATILLO");
    await buscarPlatillosBeneficio(3, "  A & B  ");
    fetchApi.mockResolvedValueOnce(Response.json(respuesta));
    await expect(obtenerBeneficio(9)).resolves.toEqual({
      ok: true,
      datos: respuesta,
    });
    expect(fetchApi.mock.calls.map(([url]) => (url as URL).href)).toEqual([
      "http://localhost:3000/api/v1/beneficios?pagina=2&estado=SIN_PLATILLO",
      "http://localhost:3000/api/v1/beneficios/platillos?pagina=3&buscar=A+%26+B",
      "http://localhost:3000/api/v1/beneficios/9",
    ]);
    expect(fetchApi.mock.calls[0]?.[1]).toMatchObject({
      cache: "no-store",
      headers: { Authorization: "Bearer sesion-de-prueba" },
    });
  });

  it("envía exclusivamente el DTO y conserva los días exactos", async () => {
    fetchApi.mockImplementation(() =>
      Promise.resolve(Response.json(respuesta)),
    );
    await guardarBeneficio({ ...datos, nombre: "Inyectado" } as typeof datos);
    await guardarBeneficio(datos, 9);
    await deshabilitarBeneficio(9);
    expect(
      fetchApi.mock.calls.map(([url, init]) => [
        String(url),
        init.method,
        init.body,
      ]),
    ).toEqual([
      [
        "http://localhost:3000/api/v1/beneficios",
        "POST",
        JSON.stringify(datos),
      ],
      [
        "http://localhost:3000/api/v1/beneficios/9",
        "PATCH",
        JSON.stringify(datos),
      ],
      [
        "http://localhost:3000/api/v1/beneficios/9/deshabilitar",
        "PATCH",
        undefined,
      ],
    ]);
  });

  it.each([
    [400, "Revisa los datos de la solicitud."],
    [401, "Tu sesión expiró. Inicia sesión de nuevo."],
    [403, "No tienes permiso para realizar esta acción."],
    [404, "El platillo ya no existe."],
    [409, "Este beneficio ya fue deshabilitado y no puede modificarse."],
  ])("conserva el mensaje para HTTP %i", async (estado, error) => {
    fetchApi.mockResolvedValueOnce(
      Response.json(
        { errores: { costoPuntos: "Costo inválido." } },
        { status: estado },
      ),
    );
    const resultado = await guardarBeneficio(datos);
    expect(resultado).toMatchObject({ ok: false, error });
    if (estado === 400)
      expect(resultado).toMatchObject({
        errores: { costoPuntos: "Costo inválido." },
      });
    if (estado === 401) expect(resultado).toMatchObject({ sinSesion: true });
    if (estado === 409) expect(resultado).toMatchObject({ estado: 409 });
  });

  it("informa problemas de conexión y rechaza datos inválidos antes de llamar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      guardarBeneficio({ ...datos, costoPuntos: 0 }),
    ).resolves.toMatchObject({ ok: false, estado: 400 });
    expect(fetchApi).not.toHaveBeenCalled();
    fetchApi.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(listarBeneficios()).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining("conectar"),
    });
  });
});

it.each([0, -5, 1.2, 2_147_483_648])("valida el costo %s", (costoPuntos) => {
  expect(validarBeneficio({ ...datos, costoPuntos })).toHaveProperty(
    "costoPuntos",
  );
});

it("valida fechas faltantes, inexistentes e invertidas y admite el mismo día", () => {
  expect(validarBeneficio(datos)).toEqual({});
  expect(
    validarBeneficio({
      ...datos,
      vigenteDesde: "",
      vigenteHasta: "2026-02-30",
    }),
  ).toMatchObject({
    vigenteDesde: expect.any(String),
    vigenteHasta: expect.any(String),
  });
  expect(
    validarBeneficio({ ...datos, vigenteHasta: "2026-11-24" }),
  ).toHaveProperty("vigenteHasta");
});

it("registra el acceso directo de gerencia y el regreso seguro desde login", () => {
  expect(rolesRequeridosPara("/admin/beneficios")).toEqual([
    "GERENTE",
    "GERENTE_GENERAL",
  ]);
  expect(retornoLogin("/admin/beneficios")).toBe("/admin/beneficios");
  expect(retornoLogin("//otra-pagina.test/admin/beneficios")).toBe("/menu");
});
