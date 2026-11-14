import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/lib/session";
import {
  crearPlatillo,
  deshabilitarPlatillo,
  editarPlatillo,
  habilitarPlatillo,
  listarPlatillos,
  obtenerPlatillo,
  subirImagenPlatillo,
} from "@/app/actions/platillos";
import { IMAGEN_MAX_BYTES, type ValoresPlatillo } from "@/lib/platillos";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const fetchMock = vi.fn();

const API = "http://api.test/api/v1";

const valores: ValoresPlatillo = {
  nombre: "Pupusa revuelta",
  descripcion: "Con queso",
  precio: "1.25",
  categoriaId: "2",
  disponibilidad: "40",
  imagenUrl: "/uploads/platillos/p.png",
};

const platilloApi = {
  id: 10,
  nombre: "Pupusa revuelta",
  descripcion: "Con queso",
  imagenUrl: "/uploads/platillos/p.png",
  categoriaId: 2,
  categoriaNombre: "Platos típicos",
  precio: 1.25,
  disponibilidad: 40,
  activo: true,
};

const paginaApi = {
  pagina: 1,
  totalPaginas: 1,
  total: 1,
  datos: [platilloApi],
};

function respuesta(status: number, cuerpo: unknown = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => cuerpo,
  };
}

function imagen(tipo = "image/png", bytes = 10) {
  return new File([new Uint8Array(bytes)], "foto.png", { type: tipo });
}

function formulario(archivo?: File) {
  const datos = new FormData();
  if (archivo) datos.append("imagen", archivo);
  return datos;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.mocked(getSession).mockReset();
  vi.mocked(getSession).mockResolvedValue("token-123");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", API);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("listarPlatillos", () => {
  it("devuelve la página con la URL completa de la imagen", async () => {
    fetchMock.mockResolvedValue(respuesta(200, paginaApi));

    const resultado = await listarPlatillos(1);

    expect(resultado).toEqual({
      ok: true,
      datos: {
        pagina: 1,
        totalPaginas: 1,
        total: 1,
        datos: [
          {
            ...platilloApi,
            imagenSrc: "http://api.test/uploads/platillos/p.png",
          },
        ],
      },
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${API}/sucursales/1/platillos?pagina=1`,
    );
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer token-123",
    );
  });

  it("envía la página y la búsqueda recortada", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ...paginaApi, pagina: 2 }));

    await listarPlatillos(1, 2, "  pupusa ");

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("pagina")).toBe("2");
    expect(url.searchParams.get("q")).toBe("pupusa");
  });

  it("no envía la búsqueda si está vacía", async () => {
    fetchMock.mockResolvedValue(respuesta(200, paginaApi));

    await listarPlatillos(1, 1, "   ");

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.has("q")).toBe(false);
  });

  it("deja imagenSrc en null cuando el platillo no tiene imagen", async () => {
    fetchMock.mockResolvedValue(
      respuesta(200, {
        ...paginaApi,
        datos: [{ ...platilloApi, imagenUrl: null }],
      }),
    );

    const resultado = await listarPlatillos(1);

    expect(resultado.ok && resultado.datos.datos[0].imagenSrc).toBeNull();
  });

  it("no consulta al backend si no hay sesión", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);

    const resultado = await listarPlatillos(1);

    expect(resultado).toMatchObject({ ok: false, sinSesion: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marca sinSesion cuando el backend responde 401", async () => {
    fetchMock.mockResolvedValue(respuesta(401));

    expect(await listarPlatillos(1)).toMatchObject({
      ok: false,
      sinSesion: true,
    });
  });

  it("avisa que no hay permiso con 403", async () => {
    fetchMock.mockResolvedValue(respuesta(403));

    expect(await listarPlatillos(1)).toEqual({
      ok: false,
      error: "No tienes permiso para realizar esta acción.",
    });
  });

  it("devuelve un error genérico con 500", async () => {
    fetchMock.mockResolvedValue(respuesta(500));

    expect(await listarPlatillos(1)).toEqual({
      ok: false,
      error: "No pudimos completar la operación. Intenta de nuevo.",
    });
  });

  it("devuelve un error genérico si falla la red", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new Error("sin red"));

    expect(await listarPlatillos(1)).toEqual({
      ok: false,
      error: "No pudimos completar la operación. Intenta de nuevo.",
    });
  });
});

describe("obtenerPlatillo", () => {
  it("devuelve el platillo con la URL completa de la imagen", async () => {
    fetchMock.mockResolvedValue(respuesta(200, platilloApi));

    const resultado = await obtenerPlatillo(10);

    expect(resultado).toEqual({
      ok: true,
      datos: {
        ...platilloApi,
        imagenSrc: "http://api.test/uploads/platillos/p.png",
      },
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${API}/platillos/10`);
  });

  it("traduce el 404", async () => {
    fetchMock.mockResolvedValue(respuesta(404));

    expect(await obtenerPlatillo(99)).toEqual({
      ok: false,
      error: "El platillo no existe.",
    });
  });

  it("marca sinSesion con 401", async () => {
    fetchMock.mockResolvedValue(respuesta(401));

    expect(await obtenerPlatillo(10)).toMatchObject({
      ok: false,
      sinSesion: true,
    });
  });
});

describe("crearPlatillo", () => {
  it("envía el platillo con los números ya convertidos", async () => {
    fetchMock.mockResolvedValue(respuesta(201, platilloApi));

    const resultado = await crearPlatillo(1, valores);

    expect(resultado.ok).toBe(true);
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${API}/sucursales/1/platillos`);
    expect(opciones.method).toBe("POST");
    expect(opciones.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(opciones.body)).toEqual({
      nombre: "Pupusa revuelta",
      descripcion: "Con queso",
      precio: 1.25,
      categoriaId: 2,
      disponibilidad: 40,
      imagenUrl: "/uploads/platillos/p.png",
    });
  });

  it("no llama al backend si el formulario es inválido", async () => {
    const resultado = await crearPlatillo(1, { ...valores, nombre: "" });

    expect(resultado).toEqual({
      ok: false,
      error: "El nombre del platillo es obligatorio.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, "Revisa los campos del formulario."],
    [404, "La categoría o el platillo ya no existe."],
    [409, "Ya existe un platillo con ese nombre."],
    [422, "La categoría seleccionada está deshabilitada."],
  ])("traduce el %i del backend", async (status, mensaje) => {
    fetchMock.mockResolvedValue(respuesta(status));

    expect(await crearPlatillo(1, valores)).toEqual({
      ok: false,
      error: mensaje,
    });
  });
});

describe("editarPlatillo", () => {
  it("edita con PUT y devuelve el platillo", async () => {
    fetchMock.mockResolvedValue(respuesta(200, platilloApi));

    const resultado = await editarPlatillo(10, valores);

    expect(resultado.ok).toBe(true);
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${API}/platillos/10`);
    expect(opciones.method).toBe("PUT");
  });

  it("no llama al backend si el formulario es inválido", async () => {
    const resultado = await editarPlatillo(10, { ...valores, precio: "0" });

    expect(resultado).toEqual({
      ok: false,
      error: "El precio debe ser mayor a 0.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("traduce el 409 de nombre duplicado", async () => {
    fetchMock.mockResolvedValue(respuesta(409));

    expect(await editarPlatillo(10, valores)).toEqual({
      ok: false,
      error: "Ya existe un platillo con ese nombre.",
    });
  });

  it("marca sinSesion con 401", async () => {
    fetchMock.mockResolvedValue(respuesta(401));

    expect(await editarPlatillo(10, valores)).toMatchObject({
      ok: false,
      sinSesion: true,
    });
  });
});

describe("deshabilitarPlatillo", () => {
  it("deshabilita con PATCH", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { id: 10, activo: false }));

    const resultado = await deshabilitarPlatillo(10);

    expect(resultado).toEqual({ ok: true, datos: { id: 10, activo: false } });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${API}/platillos/10/deshabilitar`);
    expect(opciones.method).toBe("PATCH");
  });

  it.each([
    [404, "El platillo no existe."],
    [409, "El platillo ya está deshabilitado."],
  ])("traduce el %i", async (status, mensaje) => {
    fetchMock.mockResolvedValue(respuesta(status));

    expect(await deshabilitarPlatillo(10)).toEqual({
      ok: false,
      error: mensaje,
    });
  });
});

describe("habilitarPlatillo", () => {
  it("habilita con PATCH", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { id: 10, activo: true }));

    const resultado = await habilitarPlatillo(10);

    expect(resultado).toEqual({ ok: true, datos: { id: 10, activo: true } });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${API}/platillos/10/habilitar`);
    expect(opciones.method).toBe("PATCH");
  });

  it.each([
    [404, "El platillo o su categoría ya no existe."],
    [409, "El platillo ya está habilitado."],
    [422, "La categoría del platillo está deshabilitada. Habilítala primero."],
  ])("traduce el %i", async (status, mensaje) => {
    fetchMock.mockResolvedValue(respuesta(status));

    expect(await habilitarPlatillo(10)).toEqual({ ok: false, error: mensaje });
  });

  it("avisa que no hay permiso con 403", async () => {
    fetchMock.mockResolvedValue(respuesta(403));

    expect(await habilitarPlatillo(10)).toEqual({
      ok: false,
      error: "No tienes permiso para realizar esta acción.",
    });
  });
});

describe("subirImagenPlatillo", () => {
  it("sube la imagen y devuelve la URL para mostrarla", async () => {
    fetchMock.mockResolvedValue(
      respuesta(201, { imagenUrl: "/uploads/platillos/nueva.png" }),
    );

    const resultado = await subirImagenPlatillo(formulario(imagen()));

    expect(resultado).toEqual({
      ok: true,
      datos: {
        imagenUrl: "/uploads/platillos/nueva.png",
        imagenSrc: "http://api.test/uploads/platillos/nueva.png",
      },
    });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${API}/platillos/imagen`);
    expect(opciones.method).toBe("POST");
    expect(opciones.body).toBeInstanceOf(FormData);
    expect(opciones.headers["Content-Type"]).toBeUndefined();
  });

  it("pide seleccionar una imagen si no viene archivo", async () => {
    expect(await subirImagenPlatillo(formulario())).toEqual({
      ok: false,
      error: "Selecciona una imagen.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza formatos que no son JPG ni PNG sin llamar al backend", async () => {
    expect(await subirImagenPlatillo(formulario(imagen("image/gif")))).toEqual({
      ok: false,
      error: "La imagen debe ser JPG o PNG.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechaza imágenes de más de 2 MB sin llamar al backend", async () => {
    const grande = imagen("image/png", IMAGEN_MAX_BYTES + 1);

    expect(await subirImagenPlatillo(formulario(grande))).toEqual({
      ok: false,
      error: "La imagen no puede superar los 2 MB.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, "Selecciona una imagen."],
    [413, "La imagen no puede superar los 2 MB."],
    [415, "La imagen debe ser JPG o PNG."],
  ])("traduce el %i del backend", async (status, mensaje) => {
    fetchMock.mockResolvedValue(respuesta(status));

    expect(await subirImagenPlatillo(formulario(imagen()))).toEqual({
      ok: false,
      error: mensaje,
    });
  });

  it("marca sinSesion con 401", async () => {
    fetchMock.mockResolvedValue(respuesta(401));

    expect(await subirImagenPlatillo(formulario(imagen()))).toMatchObject({
      ok: false,
      sinSesion: true,
    });
  });
});
