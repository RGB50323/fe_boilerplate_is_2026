import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cambiarCategoriaDePlatillo,
  crearCategoria,
  deshabilitarCategoria,
  listarCategorias,
  renombrarCategoria,
} from "@/app/actions/categorias";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const obtenerSesion = vi.mocked(getSession);
const fetchMock = vi.fn();

function respuesta(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
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

describe("acciones de categorías: comunes", () => {
  it("lista con Bearer y sin cache", async () => {
    const lista = [
      {
        id: 1,
        nombre: "Entradas",
        activa: true,
        deshabilitadaEn: null,
        platillosActivos: 3,
      },
    ];
    fetchMock.mockResolvedValue(respuesta(lista));

    expect(await listarCategorias()).toEqual({ ok: true, datos: lista });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/categorias");
    expect(opciones.method).toBe("GET");
    expect(opciones.headers.Authorization).toBe("Bearer token-seguro");
    expect(opciones.cache).toBe("no-store");
  });

  it("no llama al backend sin sesión", async () => {
    obtenerSesion.mockResolvedValue(undefined);

    expect(await listarCategorias()).toMatchObject({
      ok: false,
      sinSesion: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trata un 401 como sesión expirada", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 401));

    expect(await listarCategorias()).toMatchObject({
      ok: false,
      sinSesion: true,
    });
  });

  it("devuelve el mensaje de permiso ante un 403", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 403));

    expect(await listarCategorias()).toEqual({
      ok: false,
      error: "No tienes permiso para realizar esta acción.",
    });
  });

  it("devuelve el mensaje genérico si el backend falla o no responde", async () => {
    const generico = "No pudimos completar la operación. Intenta de nuevo.";

    fetchMock.mockResolvedValueOnce(respuesta({}, 500));
    expect(await listarCategorias()).toEqual({ ok: false, error: generico });

    fetchMock.mockRejectedValueOnce(new Error("caído"));
    expect(await listarCategorias()).toEqual({ ok: false, error: generico });
  });
});

describe("crearCategoria y renombrarCategoria", () => {
  it("crea con POST y el nombre recortado", async () => {
    const creada = { id: 6, nombre: "Típicos", activa: true };
    fetchMock.mockResolvedValue(respuesta(creada, 201));

    expect(await crearCategoria("  Típicos  ")).toEqual({
      ok: true,
      datos: creada,
    });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/categorias");
    expect(opciones.method).toBe("POST");
    expect(opciones.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(opciones.body)).toEqual({ nombre: "Típicos" });
  });

  it("no llama al backend con un nombre vacío o demasiado largo", async () => {
    expect(await crearCategoria("   ")).toEqual({
      ok: false,
      error: "El nombre de la categoría es obligatorio.",
    });
    expect(await crearCategoria("x".repeat(51))).toMatchObject({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, "El nombre de la categoría es obligatorio."],
    [409, "Ya existe una categoría con ese nombre."],
  ])(
    "crear: el %i del servidor se muestra como mensaje",
    async (status, error) => {
      fetchMock.mockResolvedValue(respuesta({}, status));

      expect(await crearCategoria("Entradas")).toEqual({ ok: false, error });
    },
  );

  it("renombra con PUT sobre la categoría indicada", async () => {
    const renombrada = { id: 6, nombre: "Platos típicos", activa: true };
    fetchMock.mockResolvedValue(respuesta(renombrada));

    expect(await renombrarCategoria(6, "Platos típicos")).toEqual({
      ok: true,
      datos: renombrada,
    });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/categorias/6");
    expect(opciones.method).toBe("PUT");
    expect(JSON.parse(opciones.body)).toEqual({ nombre: "Platos típicos" });
  });

  it("renombrar: 409 y 404 del servidor se muestran como mensaje", async () => {
    fetchMock.mockResolvedValueOnce(respuesta({}, 409));
    expect(await renombrarCategoria(6, "Bebidas")).toEqual({
      ok: false,
      error: "Ya existe una categoría con ese nombre.",
    });

    fetchMock.mockResolvedValueOnce(respuesta({}, 404));
    expect(await renombrarCategoria(999, "Algo")).toEqual({
      ok: false,
      error: "La categoría no existe.",
    });
  });
});

describe("deshabilitarCategoria", () => {
  it("deshabilita con PATCH", async () => {
    const resultado = {
      id: 6,
      activa: false,
      deshabilitadaEn: "2026-11-08T20:00:00.000Z",
    };
    fetchMock.mockResolvedValue(respuesta(resultado));

    expect(await deshabilitarCategoria(6)).toEqual({
      ok: true,
      datos: resultado,
    });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/categorias/6/deshabilitar");
    expect(opciones.method).toBe("PATCH");
  });

  it("muestra el mensaje del 422 cuando tiene platillos asociados", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 422));

    expect(await deshabilitarCategoria(2)).toEqual({
      ok: false,
      error:
        "Esta categoría tiene platillos asociados. Reasígnalos antes de deshabilitarla.",
    });
  });

  it("muestra el mensaje del 409 cuando ya estaba deshabilitada", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 409));

    expect(await deshabilitarCategoria(5)).toEqual({
      ok: false,
      error: "La categoría ya está deshabilitada.",
    });
  });
});

describe("cambiarCategoriaDePlatillo", () => {
  it("cambia la categoría con PATCH y el cuerpo esperado", async () => {
    const resultado = { platilloId: 5, categoriaId: 3 };
    fetchMock.mockResolvedValue(respuesta(resultado));

    expect(await cambiarCategoriaDePlatillo(5, 3)).toEqual({
      ok: true,
      datos: resultado,
    });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/platillos/5/categoria");
    expect(opciones.method).toBe("PATCH");
    expect(JSON.parse(opciones.body)).toEqual({ categoriaId: 3 });
  });

  it("muestra el mensaje del 422 si la categoría destino está deshabilitada", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 422));

    expect(await cambiarCategoriaDePlatillo(5, 5)).toEqual({
      ok: false,
      error: "La categoría destino está deshabilitada.",
    });
  });
});
