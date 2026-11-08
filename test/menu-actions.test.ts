import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarMenu } from "@/app/actions/menu";
import { FILTROS_VACIOS } from "@/lib/menu";

const menu = {
  sucursalId: 1,
  categorias: [
    {
      id: 2,
      nombre: "Platillos principales",
      platillos: [
        {
          id: 5,
          nombre: "Pupusa revuelta",
          descripcion: "Maíz con queso",
          precio: 1.25,
          imagenUrl: null,
          disponibilidad: 40,
        },
      ],
    },
  ],
};

const respuesta = (cuerpo: unknown, ok = true, status = 200) =>
  vi.fn().mockResolvedValue({ ok, status, json: async () => cuerpo });

describe("consultarMenu", () => {
  beforeEach(() => {
    vi.stubEnv("API_URL", "http://localhost:3000/api/v1");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("devuelve el menú cuando el backend responde bien", async () => {
    vi.stubGlobal("fetch", respuesta(menu));
    expect(await consultarMenu(1, FILTROS_VACIOS)).toEqual({ menu });
  });

  it("llama a /sucursales/{id}/menu y envía solo los filtros con valor", async () => {
    const fetchMock = respuesta(menu);
    vi.stubGlobal("fetch", fetchMock);

    await consultarMenu(2, { q: "pupu", categoriaId: "", precioMin: "1", precioMax: "5" });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://localhost:3000/api/v1/sucursales/2/menu?q=pupu&precioMin=1&precioMax=5",
    );
  });

  it("sin filtros no agrega query", async () => {
    const fetchMock = respuesta(menu);
    vi.stubGlobal("fetch", fetchMock);

    await consultarMenu(1, FILTROS_VACIOS);

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://localhost:3000/api/v1/sucursales/1/menu",
    );
  });

  it("no llama al backend si los filtros son inválidos", async () => {
    const fetchMock = respuesta(menu);
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await consultarMenu(1, { ...FILTROS_VACIOS, precioMin: "10", precioMax: "5" });

    expect(resultado.error).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 404, 500])("devuelve el error genérico si el backend responde %s", async (status) => {
    vi.stubGlobal("fetch", respuesta({}, false, status));
    expect(await consultarMenu(1, FILTROS_VACIOS)).toEqual({ error: "No pudimos cargar el menú" });
  });

  it("devuelve error si la respuesta no tiene la forma esperada", async () => {
    vi.stubGlobal("fetch", respuesta({ algo: "raro" }));
    expect(await consultarMenu(1, FILTROS_VACIOS)).toEqual({ error: "No pudimos cargar el menú" });
  });

  it("devuelve error si el backend no responde", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("caído")));
    expect(await consultarMenu(1, FILTROS_VACIOS)).toEqual({ error: "No pudimos cargar el menú" });
  });

  it("devuelve error si falta API_URL", async () => {
    vi.stubEnv("API_URL", "");
    vi.stubGlobal("fetch", respuesta(menu));
    expect(await consultarMenu(1, FILTROS_VACIOS)).toEqual({ error: "No pudimos cargar el menú" });
  });
});