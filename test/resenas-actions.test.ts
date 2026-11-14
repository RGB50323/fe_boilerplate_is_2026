import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarResenas } from "@/app/actions/resenas";

const datos = {
  promedio: 4.6,
  total: 23,
  distribucion: { 1: 0, 2: 1, 3: 2, 4: 5, 5: 15 },
  pagina: 2,
  totalPaginas: 3,
  resenas: [
    {
      id: 1,
      estrellas: 5,
      comentario: "Rico",
      fecha: "2026-10-28",
      cliente: "Ana L.",
    },
  ],
};

const respuesta = (cuerpo: unknown, ok = true, status = 200) =>
  vi.fn().mockResolvedValue({ ok, status, json: async () => cuerpo });

describe("consultarResenas", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", "http://localhost:3000/api/v1");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("llama a /platillos/{id}/resenas con la página y devuelve los datos", async () => {
    const fetchMock = respuesta(datos);
    vi.stubGlobal("fetch", fetchMock);

    expect(await consultarResenas(7, 2)).toEqual({ datos });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://localhost:3000/api/v1/platillos/7/resenas?pagina=2",
    );
  });

  it("con 404 indica que el platillo ya no está disponible", async () => {
    vi.stubGlobal("fetch", respuesta({}, false, 404));
    expect(await consultarResenas(7, 1)).toEqual({
      error: "Este platillo ya no está disponible.",
    });
  });

  it("con error del servidor devuelve el mensaje genérico", async () => {
    vi.stubGlobal("fetch", respuesta({}, false, 500));
    expect(await consultarResenas(7, 1)).toEqual({
      error: "No pudimos cargar las reseñas",
    });
  });

  it("rechaza una respuesta con forma inválida", async () => {
    vi.stubGlobal("fetch", respuesta({ foo: 1 }));
    expect(await consultarResenas(7, 1)).toEqual({
      error: "No pudimos cargar las reseñas",
    });
  });

  it.each([
    [0, 1],
    [7, 0],
    [1.5, 1],
  ])("no llama al backend con platillo %s y página %s", async (id, pagina) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await consultarResenas(id, pagina)).error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
