import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consultarDisponibilidad,
  listarSucursales,
} from "@/app/actions/reservaciones";
const fetchMock = vi.fn();
function datos() {
  const form = new FormData();
  Object.entries({
    sucursalId: "1",
    fecha: "2026-11-09",
    hora: "19:00",
    personas: "4",
  }).forEach(([k, v]) => form.set(k, v));
  return form;
}
function respuesta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
describe("acciones de disponibilidad", () => {
  it("consulta la ruta pública acordada sin token y sin cache", async () => {
    const mesas = [{ mesaId: 3, numero: 3, capacidad: 4, zona: null }];
    fetchMock.mockResolvedValue(respuesta(mesas));
    expect(await consultarDisponibilidad(datos())).toEqual({ mesas });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/sucursales/1/mesas-disponibles");
    expect(url.searchParams.get("personas")).toBe("4");
    expect(opciones.cache).toBe("no-store");
    expect(opciones.headers).toBeUndefined();
  });
  it("no llama al backend con personas inválidas", async () => {
    const form = datos();
    form.set("personas", "0");
    expect(
      (await consultarDisponibilidad(form)).errores?.personas,
    ).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("acepta la respuesta vacía", async () => {
    fetchMock.mockResolvedValue(respuesta([]));
    expect(await consultarDisponibilidad(datos())).toEqual({ mesas: [] });
  });
  it.each(["fecha", "hora", "personas", "sucursalId"])(
    "conserva el error estructurado de %s",
    async (campo) => {
      fetchMock.mockResolvedValue(
        respuesta(
          { message: "Inválido", errores: { [campo]: "Corregir campo" } },
          400,
        ),
      );
      expect(await consultarDisponibilidad(datos())).toEqual({
        mesas: [],
        errores: { [campo]: "Corregir campo" },
      });
    },
  );
  it("asocia el id inválido con el selector de sucursal", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ errores: { id: "ID inválido" } }, 400),
    );
    expect((await consultarDisponibilidad(datos())).errores).toEqual({
      sucursalId: "ID inválido",
    });
  });
  it("muestra sucursal inexistente junto al selector", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ errores: { sucursalId: "No existe" } }, 404),
    );
    expect((await consultarDisponibilidad(datos())).errores?.sucursalId).toBe(
      "No existe",
    );
  });
  it("conserva una respuesta antigua sin campos como error general", async () => {
    fetchMock.mockResolvedValue(
      respuesta({ message: ["Error anterior"] }, 400),
    );
    expect((await consultarDisponibilidad(datos())).error).toBe(
      "Error anterior",
    );
  });
  it.each([401, 500, 503])("maneja HTTP %i", async (status) => {
    fetchMock.mockResolvedValue(respuesta({}, status));
    expect((await consultarDisponibilidad(datos())).error).toBeDefined();
  });
  it.each([
    new TypeError("Network"),
    new DOMException("Timeout", "TimeoutError"),
  ])("maneja conexión o timeout", async (error) => {
    fetchMock.mockRejectedValue(error);
    expect((await consultarDisponibilidad(datos())).error).toBeDefined();
  });
  it("rechaza un contrato de mesas inválido", async () => {
    fetchMock.mockResolvedValue(respuesta([{ id: 3 }]));
    expect((await consultarDisponibilidad(datos())).error).toBeDefined();
  });
});
describe("sucursales", () => {
  it("recibe sucursales y horarios públicos", async () => {
    const sucursales = [
      {
        id: 9,
        nombre: "Sucursal real",
        horarios: [{ diaSemana: 0, apertura: "08:00", cierre: "18:00" }],
      },
    ];
    fetchMock.mockResolvedValue(respuesta(sucursales));
    expect(await listarSucursales()).toEqual({ sucursales });
    expect(fetchMock.mock.calls[0][0].pathname).toBe("/api/v1/sucursales");
  });
  it("acepta que no haya sucursales", async () => {
    fetchMock.mockResolvedValue(respuesta([]));
    expect(await listarSucursales()).toEqual({ sucursales: [] });
  });
  it.each([
    [
      {
        id: 1,
        nombre: "Centro",
        horarios: [{ diaSemana: 7, apertura: "08:00", cierre: "18:00" }],
      },
    ],
    [
      {
        id: 1,
        nombre: "Centro",
        horarios: [{ diaSemana: 0, apertura: "25:00", cierre: "18:00" }],
      },
    ],
  ])("rechaza horarios malformados", async (sucursal) => {
    fetchMock.mockResolvedValue(respuesta([sucursal]));
    expect((await listarSucursales()).error).toBeDefined();
  });
  it("informa fallo del servidor", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 500));
    expect((await listarSucursales()).error).toBeDefined();
  });
  it("informa fallo de red", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network"));
    expect((await listarSucursales()).error).toBeDefined();
  });
});
