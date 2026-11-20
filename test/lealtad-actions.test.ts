import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as lealtad from "@/app/actions/lealtad";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("API_URL", "https://api.example.test/api/v1");
  vi.mocked(getSession).mockResolvedValue("token-de-prueba");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("contratos HTTP de lealtad", () => {
  it("usa el cliente autenticado para consultas y mutaciones", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const datos = {
      nombre: "Limonada", descripcion: null, costoPuntos: 30, activo: true,
      vigenteDesde: "2026-11-20T15:00:00.000Z", vigenteHasta: "2026-11-21T15:00:00.000Z",
    };
    const operaciones = [
      [() => lealtad.consultarPuntos(), "lealtad/puntos", "GET", undefined],
      [() => lealtad.consultarCatalogo(), "lealtad/beneficios", "GET", undefined],
      [() => lealtad.adquirirCupon(2, "clave-1"), "lealtad/canjes", "POST", { beneficioId: 2, claveIdempotencia: "clave-1" }],
      [() => lealtad.consultarCupon("cupon/2"), "lealtad/cupones/cupon%2F2", "GET", undefined],
      [() => lealtad.utilizarCupon("cupon/2"), "lealtad/cupones/cupon%2F2/utilizar", "PATCH", undefined],
      [() => lealtad.consultarBeneficiosAdministrativos(), "lealtad/admin/beneficios", "GET", undefined],
      [() => lealtad.guardarBeneficio(datos), "lealtad/admin/beneficios", "POST", datos],
      [() => lealtad.guardarBeneficio(datos, 2), "lealtad/admin/beneficios/2", "PATCH", datos],
      [() => lealtad.deshabilitarBeneficio(2), "lealtad/admin/beneficios/2", "DELETE", undefined],
      [() => lealtad.consultarRegla(), "lealtad/admin/regla", "GET", undefined],
      [() => lealtad.guardarRegla(3), "lealtad/admin/regla", "PUT", { puntosPorDolar: 3 }],
    ] as const;

    for (const [operar, ruta, method, cuerpo] of operaciones) {
      expect((await operar()).ok).toBe(true);
      expect(fetchMock).toHaveBeenLastCalledWith(new URL(`https://api.example.test/api/v1/${ruta}`), expect.objectContaining({
        method,
        headers: expect.objectContaining({ Authorization: "Bearer token-de-prueba" }),
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      }));
    }
  });

  it.each([
    [404, /No encontramos/],
    [409, /utilizado/],
    [410, /expirado/],
  ])("devuelve el estado %i al verificar o utilizar un cupón", async (estado, mensaje) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({}, { status: estado })));
    for (const operar of [lealtad.consultarCupon, lealtad.utilizarCupon]) {
      expect(await operar("codigo")).toMatchObject({ ok: false, estado, error: expect.stringMatching(mensaje) });
    }
  });

  it("requiere la sesión y delega permisos al backend", async () => {
    const fetchMock = vi.fn(async () => Response.json({}, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(getSession).mockResolvedValueOnce(undefined);
    expect(await lealtad.consultarRegla()).toMatchObject({ ok: false, sinSesion: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await lealtad.guardarRegla(3)).toMatchObject({ ok: false, error: expect.stringMatching(/permiso/) });
  });
});

