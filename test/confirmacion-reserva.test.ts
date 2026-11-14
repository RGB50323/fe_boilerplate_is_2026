import { beforeEach, describe, expect, it, vi } from "vitest";
import { validarReserva, rutaReserva } from "@/lib/confirmacion-reserva";
import { retornoLogin } from "@/lib/retorno-login";
import { confirmarReservacion } from "@/app/actions/confirmacion-reserva";
import { getSession } from "@/lib/session";
vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const entrada = {
  mesaId: "3",
  sucursalId: "1",
  fecha: "2030-11-09",
  hora: "19:00",
  personas: "4",
  nombre: " Ana López ",
  telefono: "7123-4567",
  correo: "ana@correo.com",
};
const reserva = {
  reservacionId: "R-000045",
  estado: "CONFIRMADA",
  mesaId: 3,
  mesa: 2,
  sucursalId: 1,
  sucursal: "Centro",
  fecha: entrada.fecha,
  hora: entrada.hora,
  personas: 4,
};
const fetchMock = vi.fn();
const datos = () => {
  const f = new FormData();
  Object.entries(entrada).forEach(([k, v]) => f.set(k, v));
  return f;
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2030-11-01T12:00:00Z"));
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-personal");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
describe("validación y navegación H10", () => {
  it("acepta contacto válido y rechaza capacidad excedida", () => {
    expect(validarReserva(entrada, 4)).toEqual({});
    expect(validarReserva(entrada, 2)).toHaveProperty("personas");
  });
  it("marca todos los contactos vacíos o inválidos", () => {
    expect(
      validarReserva({
        ...entrada,
        nombre: " ",
        telefono: "123",
        correo: "mal",
      }),
    ).toMatchObject({
      nombre: expect.any(String),
      telefono: expect.any(String),
      correo: expect.any(String),
    });
  });
  it("rechaza fecha pasada y hora fuera del horario", () => {
    expect(validarReserva({ ...entrada, fecha: "2020-01-01" })).toHaveProperty(
      "fecha",
    );
    expect(
      validarReserva(entrada, 4, [
        { diaSemana: 6, apertura: "08:00", cierre: "20:00" },
      ]),
    ).toHaveProperty("hora");
  });
  it("conserva la selección en una ruta interna", () => {
    const ruta = rutaReserva({
      mesaId: 3,
      sucursalId: 1,
      fecha: entrada.fecha,
      hora: entrada.hora,
      personas: 4,
    });
    expect(retornoLogin(ruta)).toBe(ruta);
    expect(new URL(ruta, "https://test.local").searchParams.get("mesaId")).toBe(
      "3",
    );
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/login",
    "/reservas/nueva/../../login",
  ])("evita redirigir a %s", (ruta) =>
    expect(retornoLogin(ruta)).toBe("/menu"),
  );
});
describe("confirmación autenticada", () => {
  it("manda token y contrato permitido; nunca envía propietario ni sucursal", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(reserva), { status: 201 }),
    );
    const f = datos();
    f.set("clienteId", "otra-cuenta");
    expect(await confirmarReservacion(f)).toEqual({ reserva });
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/api/v1/reservaciones");
    expect(opciones.headers.Authorization).toBe("Bearer token-personal");
    const body = JSON.parse(opciones.body);
    expect(body).not.toHaveProperty("clienteId");
    expect(body).not.toHaveProperty("sucursalId");
    expect(body.nombre).toBe("Ana López");
    expect(body.personas).toBe(4);
  });
  it("sin sesión no realiza la petición", async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    expect(await confirmarReservacion(datos())).toMatchObject({
      sinSesion: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("convierte 401 en solicitud de login", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 401 }));
    expect(await confirmarReservacion(datos())).toMatchObject({
      sinSesion: true,
    });
  });
  it("conserva errores 400 por campo", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ errores: { correo: "Correo inválido" } }), {
        status: 400,
      }),
    );
    expect(await confirmarReservacion(datos())).toMatchObject({
      errores: { correo: "Correo inválido" },
    });
  });
  it.each([404, 409])("permite elegir otra mesa ante %s", async (estado) => {
    fetchMock.mockResolvedValue(new Response("", { status: estado }));
    expect(await confirmarReservacion(datos())).toMatchObject({
      sinDisponibilidad: true,
    });
  });
  it("no confirma si la API entrega un contrato incompleto", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ estado: "CONFIRMADA" }), { status: 201 }),
    );
    expect(await confirmarReservacion(datos())).toMatchObject({
      error: expect.stringContaining("Mis reservaciones"),
    });
  });
  it("maneja fallos de red", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await confirmarReservacion(datos())).toMatchObject({
      error: expect.any(String),
    });
  });
});
