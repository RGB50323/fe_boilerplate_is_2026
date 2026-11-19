import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  crearInsumo,
  listarInsumos,
  listarMovimientos,
  registrarMovimiento,
} from "@/app/actions/inventario";
import { getSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));

const fetchMock = vi.fn<typeof fetch>();
const QUESO = { id: 5, nombre: "Queso con loroco", unidad: "lb", cantidad: 12.5, minimo: 10, estado: "NORMAL" };
const VALORES_INSUMO = { nombre: "Lechuga", unidad: "lb", minimo: "4" };
const SALIDA = { tipo: "SALIDA" as const, cantidad: "3", motivo: "Uso en cocina" };

function json(cuerpo: unknown, status = 200) {
  return Response.json(cuerpo, { status });
}

function llamada(indice = 0) {
  const [url, init] = fetchMock.mock.calls[indice];
  return {
    url: String(url),
    metodo: init?.method,
    cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined,
    auth: new Headers(init?.headers).get("Authorization"),
  };
}

beforeEach(() => {
  vi.stubEnv("API_URL", "http://localhost:3000/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-gerente");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listarInsumos", () => {
  it("pide GET /inventario/insumos con la búsqueda codificada", async () => {
    fetchMock.mockResolvedValue(json([QUESO]));

    await expect(listarInsumos("queso & loroco")).resolves.toEqual({ insumos: [QUESO] });
    expect(llamada()).toMatchObject({
      url: "http://localhost:3000/api/v1/inventario/insumos?q=queso%20%26%20loroco",
      metodo: "GET",
      auth: "Bearer token-gerente",
    });

    await listarInsumos("  ");
    expect(llamada(1).url).toBe("http://localhost:3000/api/v1/inventario/insumos");
  });

  it("devuelve sinSesion, o error ante 403, 500, red o datos inválidos", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(listarInsumos()).resolves.toEqual({ sinSesion: true });

    const error = { error: "No pudimos cargar el inventario" };
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(listarInsumos()).resolves.toEqual(error);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(listarInsumos()).resolves.toEqual(error);
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(listarInsumos()).resolves.toEqual(error);
    fetchMock.mockResolvedValueOnce(json([{ ...QUESO, unidad: "toneladas" }]));
    await expect(listarInsumos()).resolves.toEqual(error);
  });
});

describe("crearInsumo", () => {
  it("hace POST con nombre, unidad y mínimo numérico y devuelve el insumo con cantidad 0", async () => {
    fetchMock.mockResolvedValue(json({ id: 9, nombre: "Lechuga", unidad: "lb", minimo: 4 }, 201));

    await expect(crearInsumo(VALORES_INSUMO)).resolves.toEqual({
      insumo: { id: 9, nombre: "Lechuga", unidad: "lb", cantidad: 0, minimo: 4, estado: "BAJO" },
    });
    expect(llamada()).toMatchObject({
      url: "http://localhost:3000/api/v1/inventario/insumos",
      metodo: "POST",
      cuerpo: { nombre: "Lechuga", unidad: "lb", minimo: 4 },
    });
  });

  it("no llama al backend si la validación local falla", async () => {
    await expect(crearInsumo({ nombre: "", unidad: "lb", minimo: "1" })).resolves.toEqual({
      error: "Revisa los campos del formulario.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("400 devuelve el error de cada campo; 409 marca el nombre duplicado", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ statusCode: 400, errores: { unidad: "unidad debe ser lb, kg, l o unidad", otro: "x" } }, 400),
    );
    await expect(crearInsumo(VALORES_INSUMO)).resolves.toEqual({
      errores: { unidad: "unidad debe ser lb, kg, l o unidad" },
    });

    fetchMock.mockResolvedValueOnce(json({ statusCode: 400, message: "Bad Request" }, 400));
    await expect(crearInsumo(VALORES_INSUMO)).resolves.toEqual({ error: "Revisa los campos del formulario." });

    fetchMock.mockResolvedValueOnce(json({ statusCode: 409, message: "duplicado" }, 409));
    await expect(crearInsumo(VALORES_INSUMO)).resolves.toEqual({
      errores: { nombre: "Ya existe un insumo con ese nombre en la sucursal" },
    });
  });

  it("403 y 500 devuelven un mensaje breve", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(crearInsumo(VALORES_INSUMO)).resolves.toEqual({
      error: "No tienes permiso para realizar esta acción.",
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(crearInsumo(VALORES_INSUMO)).resolves.toEqual({
      error: "No pudimos guardar el insumo. Intenta de nuevo.",
    });
  });
});

describe("registrarMovimiento", () => {
  it("hace POST /inventario/insumos/{id}/movimientos y devuelve las cantidades", async () => {
    fetchMock.mockResolvedValue(json({ movimientoId: 88, cantidadAnterior: "12.500", cantidadActual: "9.500" }, 201));

    await expect(registrarMovimiento(5, SALIDA)).resolves.toEqual({
      movimiento: { movimientoId: 88, cantidadAnterior: 12.5, cantidadActual: 9.5 },
    });
    expect(llamada()).toMatchObject({
      url: "http://localhost:3000/api/v1/inventario/insumos/5/movimientos",
      metodo: "POST",
      cuerpo: { tipo: "SALIDA", cantidad: 3, motivo: "Uso en cocina" },
    });
  });

  it("422 indica que se superó la existencia o el máximo; 400 marca la cantidad", async () => {
    fetchMock.mockResolvedValueOnce(json({ statusCode: 422 }, 422));
    await expect(registrarMovimiento(5, SALIDA)).resolves.toEqual({ limiteExcedido: true });

    fetchMock.mockResolvedValueOnce(json({ statusCode: 400, errores: { cantidad: "debe ser positiva" } }, 400));
    await expect(registrarMovimiento(5, SALIDA)).resolves.toEqual({
      errores: { cantidad: "Ingresa una cantidad mayor a 0." },
    });

    fetchMock.mockResolvedValueOnce(json({ statusCode: 400, errores: { motivo: "motivo es obligatorio" } }, 400));
    await expect(registrarMovimiento(5, SALIDA)).resolves.toEqual({
      errores: { motivo: "motivo es obligatorio" },
    });
  });

  it("404, 500 y validación local", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(registrarMovimiento(5, SALIDA)).resolves.toEqual({ error: "Este insumo ya no existe." });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(registrarMovimiento(5, SALIDA)).resolves.toEqual({
      error: "No pudimos registrar el movimiento. Intenta de nuevo.",
    });

    fetchMock.mockClear();
    await registrarMovimiento(5, { ...SALIDA, cantidad: "0" });
    await registrarMovimiento(0, SALIDA);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("listarMovimientos", () => {
  it("pide la página del historial", async () => {
    fetchMock.mockResolvedValue(
      json({
        pagina: 2,
        totalPaginas: 2,
        total: 11,
        datos: [{ id: 1, fecha: "2026-11-12", hora: "09:15", usuario: "Ana", tipo: "ENTRADA", cantidad: 10, motivo: "Compra" }],
      }),
    );

    const resultado = await listarMovimientos(5, 2);
    expect(llamada().url).toBe("http://localhost:3000/api/v1/inventario/insumos/5/movimientos?pagina=2");
    expect(resultado).toMatchObject({ historial: { pagina: 2, totalPaginas: 2, datos: [{ id: 1, usuario: "Ana" }] } });
  });

  it("sinSesion, 404 y errores", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(listarMovimientos(5)).resolves.toEqual({ sinSesion: true });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(listarMovimientos(5)).resolves.toEqual({ error: "Este insumo ya no existe." });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(listarMovimientos(5)).resolves.toEqual({ error: "No pudimos cargar el historial" });
    fetchMock.mockResolvedValueOnce(json({ datos: "x" }));
    await expect(listarMovimientos(5)).resolves.toEqual({ error: "No pudimos cargar el historial" });
  });
});
