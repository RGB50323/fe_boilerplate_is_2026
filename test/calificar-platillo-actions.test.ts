import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarPendientesResena, publicarResena } from "@/app/actions/resenas";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const obtenerSesion = vi.mocked(getSession);
const fetchMock = vi.fn();
const pendiente = {
  pedidoId: 121,
  numero: "S1-000121",
  sucursal: "Centro",
  platilloId: 10,
  nombre: "Pupusas",
  disponibleHasta: "2026-11-22T18:00:00.000Z",
};
const datos = { pedidoId: 121, platilloId: 10, estrellas: 4, comentario: "" };

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

describe("listarPendientesResena", () => {
  it("devuelve los platillos pendientes con Bearer", async () => {
    fetchMock.mockResolvedValue(respuesta([pendiente]));
    await expect(listarPendientesResena()).resolves.toEqual({
      pendientes: [pendiente],
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://backend.test/api/v1/resenas/pendientes");
    expect(init.headers.Authorization).toBe("Bearer token-seguro");
  });

  it("sin sesión no consulta al backend", async () => {
    obtenerSesion.mockResolvedValue(undefined);
    await expect(listarPendientesResena()).resolves.toEqual({
      sinSesion: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("una respuesta inválida da error", async () => {
    fetchMock.mockResolvedValue(respuesta([{ pedidoId: "x" }]));
    await expect(listarPendientesResena()).resolves.toHaveProperty("error");
  });
});

describe("publicarResena", () => {
  it("envía estrellas y el comentario recortado", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ mensaje: "Reseña publicada correctamente" }, 201),
    );
    await expect(
      publicarResena({ ...datos, comentario: "  Rica  " }),
    ).resolves.toEqual({ ok: true, mensaje: "Reseña publicada correctamente" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://backend.test/api/v1/resenas");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      pedidoId: 121,
      platilloId: 10,
      estrellas: 4,
      comentario: "Rica",
    });
  });

  it("no envía el comentario vacío", async () => {
    fetchMock.mockResolvedValue(respuesta({ mensaje: "ok" }, 201));
    await publicarResena(datos);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty(
      "comentario",
    );
  });

  it("no llama al backend con más de 500 caracteres o sin estrellas", async () => {
    await expect(
      publicarResena({ ...datos, comentario: "a".repeat(501) }),
    ).resolves.toMatchObject({ ok: false });
    await expect(publicarResena({ ...datos, estrellas: 0 })).resolves.toEqual({
      ok: false,
      error: "Elige de 1 a 5 estrellas.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("409 indica que ya lo reseñó", async () => {
    fetchMock.mockResolvedValue(respuesta({ message: "dup" }, 409));
    await expect(publicarResena(datos)).resolves.toMatchObject({
      ok: false,
      yaResenado: true,
      error: "Ya reseñaste este platillo en este pedido.",
    });
  });

  it("422 explica el plazo de 7 días", async () => {
    fetchMock.mockResolvedValue(respuesta({ message: "plazo" }, 422));
    await expect(publicarResena(datos)).resolves.toMatchObject({
      ok: false,
      error: "Solo puedes calificar pedidos pagados en los últimos 7 días.",
    });
  });

  it("sin sesión pide iniciar sesión", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 401));
    await expect(publicarResena(datos)).resolves.toMatchObject({
      ok: false,
      sinSesion: true,
    });
  });
});
