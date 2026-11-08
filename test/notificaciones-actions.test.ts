import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listarNotificaciones,
  marcarNotificacionLeida,
} from "@/app/actions/notificaciones";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const obtenerSesion = vi.mocked(getSession);
const fetchMock = vi.fn();
const notificacion = {
  id: 7,
  titulo: "Mesa confirmada",
  mensaje: "Tu reservación está lista",
  moduloOrigen: "RESERVACIONES",
  referencia: { tipo: "RESERVA", id: 12 },
  leida: false,
  creadaEn: "2026-11-07T15:30:00.000Z",
};

function respuesta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  obtenerSesion.mockReset();
  obtenerSesion.mockResolvedValue("token-seguro");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("acciones de notificaciones", () => {
  it("lista con Bearer, página y sin cache", async () => {
    const lista = { datos: [notificacion], total: 1, pagina: 2, noLeidas: 1 };
    fetchMock.mockResolvedValue(respuesta(lista));

    expect(await listarNotificaciones(2)).toEqual(lista);
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/notificaciones");
    expect(url.searchParams.get("pagina")).toBe("2");
    expect(opciones.headers.Authorization).toBe("Bearer token-seguro");
    expect(opciones.cache).toBe("no-store");
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });

  it("no consulta sin sesión", async () => {
    obtenerSesion.mockResolvedValue(undefined);
    expect(await listarNotificaciones(1)).toEqual({ sinSesion: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trata un 401 como sesión ausente", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 401));
    expect(await listarNotificaciones(1)).toEqual({ sinSesion: true });
  });

  it.each([
    [respuesta({}, 500), "HTTP 500"],
    [
      respuesta({ datos: [], total: "1", pagina: 1, noLeidas: 0 }),
      "contrato inválido",
    ],
  ])("devuelve el mensaje acordado ante %s", async (response) => {
    fetchMock.mockResolvedValue(response);
    expect(await listarNotificaciones(1)).toEqual({
      error: "No pudimos cargar tus notificaciones",
    });
  });

  it("marca la ruta acordada con PATCH y Bearer", async () => {
    const marcada = {
      id: 7,
      leida: true as const,
      leidaEn: "2026-11-07T15:31:00.000Z",
    };
    fetchMock.mockResolvedValue(respuesta(marcada));

    expect(await marcarNotificacionLeida(7)).toEqual(marcada);
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/notificaciones/7/leida");
    expect(opciones.method).toBe("PATCH");
    expect(opciones.headers.Authorization).toBe("Bearer token-seguro");
  });
});
