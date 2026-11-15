import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearPedidoLlevar } from "@/app/actions/pedidos";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const fetchMock = vi.fn();
const items = [{ platilloId: 10, cantidad: 2, nota: "sin cebolla" }];

beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-cliente");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("crearPedidoLlevar", () => {
  it("envía el pedido LLEVAR con token y devuelve el resultado", async () => {
    const creado = { pedidoId: 121, estado: "PENDIENTE_PAGO", total: 17.98 };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(creado), { status: 201 }));

    expect(await crearPedidoLlevar(1, "  Ana López ", items)).toEqual({
      ok: true,
      datos: creado,
    });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/pedidos");
    expect(opciones.method).toBe("POST");
    expect(opciones.headers.Authorization).toBe("Bearer token-cliente");
    expect(JSON.parse(opciones.body)).toEqual({
      tipo: "LLEVAR",
      sucursalId: 1,
      nombreCliente: "Ana López",
      items,
    });
  });

  it("omite la nota cuando no hay", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
    await crearPedidoLlevar(1, "Ana López", [{ platilloId: 10, cantidad: 1, nota: null }]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.items[0]).toEqual({ platilloId: 10, cantidad: 1 });
  });

  it.each([
    [400, "Ingresa tu nombre completo."],
    [404, "La sucursal o un platillo ya no existe."],
    [422, "Algunos platillos ya no están disponibles."],
  ])("traduce el %s", async (estado, mensaje) => {
    fetchMock.mockResolvedValue(new Response("", { status: estado }));
    expect(await crearPedidoLlevar(1, "Ana López", items)).toEqual({
      ok: false,
      error: mensaje,
    });
  });

  it("sin sesión no hace la petición", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    expect(await crearPedidoLlevar(1, "Ana López", items)).toMatchObject({
      ok: false,
      sinSesion: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un 401 pide iniciar sesión", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 401 }));
    expect(await crearPedidoLlevar(1, "Ana López", items)).toMatchObject({
      ok: false,
      sinSesion: true,
    });
  });

  it("maneja fallos de red sin lanzar", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await crearPedidoLlevar(1, "Ana López", items)).toMatchObject({
      ok: false,
    });
  });
});