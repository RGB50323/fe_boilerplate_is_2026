import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarOcupacion } from "@/app/actions/ocupacion";
import { SIN_PERMISO_OCUPACION } from "@/lib/ocupacion";
import { getSession } from "@/lib/session";
import { obtenerUsuarioActual } from "@/lib/usuario";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/usuario", () => ({ obtenerUsuarioActual: vi.fn() }));

const fetchMock = vi.fn();
const ocupacion = {
  fecha: "2026-11-20",
  sucursalId: 1,
  sucursal: "Centro",
  mesasActivas: 10,
  calculable: true,
  bloques: [
    {
      horaInicio: "08:00",
      horaFin: "09:00",
      mesasReservadas: 2,
      mesasDisponibles: 8,
      porcentajeOcupacion: 20,
    },
  ],
};

const respuesta = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-seguro");
  vi.mocked(obtenerUsuarioActual).mockResolvedValue({
    id: "user-1",
    email: "gerente@centro.com",
    rol: "GERENTE",
    sucursalId: 1,
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("consultarOcupacion", () => {
  it("pide la ocupación de la sucursal del gerente con fecha y Bearer", async () => {
    fetchMock.mockResolvedValue(respuesta(ocupacion));
    const res = await consultarOcupacion("2026-11-20");
    expect(res).toEqual({ ocupacion });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "http://backend.test/api/v1/sucursales/1/ocupacion?fecha=2026-11-20",
    );
    expect(init.headers.Authorization).toBe("Bearer token-seguro");
  });

  it("rechaza si la fecha no tiene formato YYYY-MM-DD", async () => {
    const res = await consultarOcupacion("20-11-2026");
    expect(res).toEqual({ error: "La fecha debe tener formato YYYY-MM-DD." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza si el usuario no es GERENTE", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({
      id: "u-2",
      email: "cliente@correo.com",
      rol: "CLIENTE",
      sucursalId: null,
    });

    const res = await consultarOcupacion("2026-11-20");
    expect(res).toEqual({ error: SIN_PERMISO_OCUPACION });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza si el gerente no tiene sucursal asignada", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({
      id: "u-3",
      email: "gerente@correo.com",
      rol: "GERENTE",
      sucursalId: null,
    });

    const res = await consultarOcupacion("2026-11-20");
    expect(res).toEqual({ error: SIN_PERMISO_OCUPACION });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("403 del backend devuelve el mensaje de permiso", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 403));
    const res = await consultarOcupacion("2026-11-20");
    expect(res).toEqual({ error: SIN_PERMISO_OCUPACION });
  });

  it("sin sesión lo indica", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
    const res = await consultarOcupacion("2026-11-20");
    expect(res).toEqual({ sinSesion: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
