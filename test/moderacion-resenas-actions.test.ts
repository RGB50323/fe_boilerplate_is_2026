import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarModeracion, ocultarResena } from "@/app/actions/resenas";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const fetchMock = vi.fn();
const resena = {
  id: 28,
  platillo: "Hamburguesa",
  estrellas: 5,
  comentario: null,
  fecha: "2026-11-17",
  cliente: "Ana L.",
  estado: "VISIBLE",
  ocultacion: null,
};

function respuesta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-seguro");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listarModeracion", () => {
  it("pide la página y el estado", async () => {
    const datos = { pagina: 2, totalPaginas: 2, total: 11, datos: [resena] };
    fetchMock.mockResolvedValue(respuesta(datos));
    await expect(listarModeracion(2, "OCULTA")).resolves.toEqual({
      pagina: datos,
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://backend.test/api/v1/resenas/moderacion?pagina=2&estado=OCULTA",
    );
  });

  it("403 da el mensaje de permiso", async () => {
    fetchMock.mockResolvedValue(respuesta({}, 403));
    await expect(listarModeracion(1)).resolves.toEqual({
      error: "No tienes permiso para ver esta sección",
    });
  });

  it("respuesta inválida da error", async () => {
    fetchMock.mockResolvedValue(respuesta({ datos: [{ id: "x" }] }));
    await expect(listarModeracion(1)).resolves.toHaveProperty("error");
  });
});

describe("ocultarResena", () => {
  it("manda PATCH con el motivo", async () => {
    const oculta = {
      ...resena,
      estado: "OCULTA",
      ocultacion: {
        por: "G",
        fecha: "2026-11-18",
        hora: "21:25",
        motivo: "SPAM",
      },
    };
    fetchMock.mockResolvedValue(respuesta(oculta));
    await expect(ocultarResena(28, "SPAM")).resolves.toEqual({
      ok: true,
      resena: oculta,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://backend.test/api/v1/resenas/28/ocultar");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ motivo: "SPAM" });
  });

  it("409 indica que ya estaba oculta", async () => {
    fetchMock.mockResolvedValue(respuesta({ message: "x" }, 409));
    await expect(ocultarResena(28, "SPAM")).resolves.toMatchObject({
      ok: false,
      yaOculta: true,
      error: "Esta reseña ya estaba oculta.",
    });
  });

  it("sin motivo válido no llama al backend", async () => {
    await expect(ocultarResena(28, "OTRO" as never)).resolves.toEqual({
      ok: false,
      error: "Elige un motivo.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
