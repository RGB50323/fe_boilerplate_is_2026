import { beforeEach, expect, it, vi } from "vitest";
import {
  obtenerReservacion,
  modificarReservacion,
} from "@/app/actions/edicion-reserva";
import { getSession } from "@/lib/session";
import { retornoLogin } from "@/lib/retorno-login";
vi.mock("@/lib/session", () => ({ getSession: vi.fn() }));
const fetchMock = vi.fn();
const reserva = {
  reservacionId: "R-000045",
  estado: "CONFIRMADA",
  mesaId: 3,
  mesa: 2,
  sucursalId: 1,
  sucursal: "Centro",
  fecha: "2099-11-09",
  hora: "14:00",
  personas: 2,
  capacidad: 4,
  version: "2026-11-15T12:00:00.000Z",
  modificadaEn: null,
  horarios: [{ diaSemana: 1, apertura: "08:00", cierre: "23:00" }],
};
const campos = {
  fecha: reserva.fecha,
  hora: reserva.hora,
  personas: "2",
  mesaId: 3,
  version: reserva.version,
};
beforeEach(() => {
  vi.stubEnv("API_URL", "http://backend.test/api/v1");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.mocked(getSession).mockResolvedValue("token-personal");
});
it("envía PATCH autenticado con solo los campos editables y versión", async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(reserva)));
  expect(await modificarReservacion(reserva.reservacionId, campos)).toEqual({
    reserva,
  });
  const [url, opciones] = fetchMock.mock.calls[0];
  expect(String(url)).toBe("http://backend.test/api/v1/reservaciones/R-000045");
  expect(opciones.method).toBe("PATCH");
  expect(opciones.headers.Authorization).toBe("Bearer token-personal");
  expect(JSON.parse(opciones.body)).toEqual({ ...campos, personas: 2 });
});
it("no permite rutas inyectadas ni campos inválidos", async () => {
  expect(await obtenerReservacion("../usuarios")).toHaveProperty("error");
  expect(
    await modificarReservacion(reserva.reservacionId, {
      ...campos,
      personas: "0",
    }),
  ).toHaveProperty("errores.personas");
  expect(fetchMock).not.toHaveBeenCalled();
});
it("devuelve errores por campo y solicita login cuando vence la sesión", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ errores: { hora: "Horario no válido." } }), {
      status: 400,
    }),
  );
  expect(
    await modificarReservacion(reserva.reservacionId, campos),
  ).toHaveProperty("errores.hora", "Horario no válido.");
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
  expect(
    await modificarReservacion(reserva.reservacionId, campos),
  ).toHaveProperty("sinSesion", true);
});
it("ante 409 carga automáticamente las alternativas sin perder los filtros", async () => {
  const mesas = [{ mesaId: 4, numero: 4, capacidad: 4, zona: null }];
  fetchMock
    .mockResolvedValueOnce(
      Response.json({ codigo: "MESA_NO_DISPONIBLE" }, { status: 409 }),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify(mesas)));
  expect(
    await modificarReservacion(reserva.reservacionId, campos),
  ).toHaveProperty("alternativas", mesas);
  expect(String(fetchMock.mock.calls[1][0])).toContain(
    "mesas-disponibles?fecha=2099-11-09&hora=14%3A00&personas=2",
  );
});
it("una edición concurrente exige recargar sin sugerir sobrescribirla", async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ codigo: "RESERVA_MODIFICADA" }, { status: 409 }),
  );
  expect(
    await modificarReservacion(reserva.reservacionId, campos),
  ).toHaveProperty("recargar", true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("el retorno de login admite solo rutas de edición internas", () => {
  expect(retornoLogin("/perfil/reservaciones/R-000045/editar")).toBe(
    "/perfil/reservaciones/R-000045/editar",
  );
  expect(retornoLogin("//evil.test/perfil/reservaciones/R-1/editar")).toBe(
    "/menu",
  );
});

it("rechaza horarios y mesas con datos inválidos de la API", async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({
      ...reserva,
      horarios: [{ diaSemana: 1, apertura: "99:99", cierre: "24:00" }],
    }),
  );
  expect(await obtenerReservacion(reserva.reservacionId)).toHaveProperty(
    "error",
  );
  fetchMock
    .mockResolvedValueOnce(
      Response.json({ codigo: "MESA_NO_DISPONIBLE" }, { status: 409 }),
    )
    .mockResolvedValueOnce(
      Response.json([{ mesaId: 3, numero: 3, capacidad: 4, zona: 123 }]),
    );
  const resultado = await modificarReservacion(reserva.reservacionId, campos);
  expect(resultado).toHaveProperty("error");
  expect(resultado.alternativas).toBeUndefined();
});
