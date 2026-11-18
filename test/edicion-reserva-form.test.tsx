import { renderToString } from "react-dom/server";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { EditarReservaForm } from "@/app/perfil/reservaciones/[id]/editar/editar-reserva-form";
import {
  modificarReservacion,
  consultarMesasAlternativas,
} from "@/app/actions/edicion-reserva";
import type { DetalleReserva, ResultadoEdicion } from "@/lib/edicion-reserva";
vi.mock("@/app/actions/edicion-reserva", () => ({
  modificarReservacion: vi.fn(),
  consultarMesasAlternativas: vi.fn(),
}));
const reserva: DetalleReserva = {
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
  horarios: Array.from({ length: 7 }, (_, diaSemana) => ({
    diaSemana,
    apertura: "08:00",
    cierre: "23:00",
  })),
};
beforeEach(() => {
  vi.mocked(modificarReservacion).mockReset();
  vi.mocked(consultarMesasAlternativas).mockReset();
});
const guardar = () =>
  fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
it("busca una mesa mayor y permite guardar con más personas", async () => {
  vi.mocked(consultarMesasAlternativas).mockResolvedValue({
    alternativas: [{ mesaId: 7, numero: 7, capacidad: 6, zona: null }],
  });
  vi.mocked(modificarReservacion).mockResolvedValue({
    reserva: { ...reserva, mesaId: 7, mesa: 7, personas: 6 },
  });
  render(
    <EditarReservaForm
      ahoraInicial={new Date().toISOString()}
      reserva={reserva}
    />,
  );
  fireEvent.change(screen.getByLabelText("Personas"), {
    target: { value: "6" },
  });
  guardar();
  fireEvent.click(
    await screen.findByRole("button", { name: "Mesa 7 · 6 personas" }),
  );
  expect(modificarReservacion).not.toHaveBeenCalled();
  expect(consultarMesasAlternativas).toHaveBeenCalledWith(
    reserva.reservacionId,
    expect.objectContaining({ personas: "6" }),
  );
  guardar();
  await screen.findByRole("status");
  expect(modificarReservacion).toHaveBeenLastCalledWith(
    reserva.reservacionId,
    expect.objectContaining({ personas: "6", mesaId: 7 }),
  );
});
it("deshabilita el formulario mientras guarda y muestra la confirmación actualizada", async () => {
  let resolver!: (r: ResultadoEdicion) => void;
  vi.mocked(modificarReservacion).mockImplementation(
    () =>
      new Promise((r) => {
        resolver = r;
      }),
  );
  render(
    <EditarReservaForm
      ahoraInicial={new Date().toISOString()}
      reserva={reserva}
    />,
  );
  guardar();
  expect(screen.getByLabelText("Fecha")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Guardando cambios…" }),
  ).toBeDisabled();
  await act(async () => resolver({ reserva: { ...reserva, personas: 3 } }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "se modificó correctamente",
  );
  expect(
    screen.queryByRole("button", { name: "Guardar cambios" }),
  ).not.toBeInTheDocument();
});
it("permite elegir una alternativa y reintentar manteniendo versión y filtros", async () => {
  vi.mocked(modificarReservacion)
    .mockResolvedValueOnce({
      error: "Mesa ocupada.",
      alternativas: [{ mesaId: 7, numero: 7, capacidad: 4, zona: null }],
    })
    .mockResolvedValueOnce({ reserva: { ...reserva, mesaId: 7, mesa: 7 } });
  render(
    <EditarReservaForm
      ahoraInicial={new Date().toISOString()}
      reserva={reserva}
    />,
  );
  guardar();
  fireEvent.click(
    await screen.findByRole("button", { name: "Mesa 7 · 4 personas" }),
  );
  expect(screen.queryByText("Mesa ocupada.")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Personas"), {
    target: { value: "3" },
  });
  guardar();
  await screen.findByRole("status");
  expect(modificarReservacion).toHaveBeenLastCalledWith(reserva.reservacionId, {
    fecha: reserva.fecha,
    hora: reserva.hora,
    personas: "3",
    mesaId: 7,
    version: reserva.version,
  });
});
it("no ofrece edición de una reserva cancelada", () => {
  render(
    <EditarReservaForm
      ahoraInicial={new Date().toISOString()}
      reserva={{ ...reserva, estado: "CANCELADA" }}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Solo podés modificar una reservación confirmada",
  );
  expect(
    screen.queryByRole("button", { name: "Guardar cambios" }),
  ).not.toBeInTheDocument();
});
it("un conflicto de versión bloquea guardar y ofrece recargar", async () => {
  vi.mocked(modificarReservacion).mockResolvedValue({
    error: "La reservación cambió.",
    recargar: true,
  });
  render(
    <EditarReservaForm
      ahoraInicial={new Date().toISOString()}
      reserva={reserva}
    />,
  );
  guardar();
  expect(
    await screen.findByRole("link", { name: "Recargar datos actuales" }),
  ).toHaveAttribute("href", "/perfil/reservaciones/R-000045/editar");
  expect(screen.getByLabelText("Fecha")).toBeDisabled();
});

it("bloquea nuevos envíos cuando vence la sesión", async () => {
  vi.mocked(modificarReservacion).mockResolvedValue({
    sinSesion: true,
    error: "Iniciá sesión.",
  });
  render(
    <EditarReservaForm
      ahoraInicial={new Date().toISOString()}
      reserva={reserva}
    />,
  );
  guardar();
  await screen.findByRole("link", { name: "Iniciar sesión" });
  expect(
    screen.getByRole("button", { name: "Guardar cambios" }),
  ).toBeDisabled();
  expect(screen.getByLabelText("Fecha")).toBeDisabled();
  fireEvent.submit(screen.getByRole("form", { name: "Modificar reservación" }));
  expect(modificarReservacion).toHaveBeenCalledTimes(1);
});

it("permite volver a la mesa original tras cambiar los filtros de una alternativa", async () => {
  vi.mocked(consultarMesasAlternativas).mockResolvedValue({
    alternativas: [{ mesaId: 7, numero: 7, capacidad: 6, zona: null }],
  });
  vi.mocked(modificarReservacion).mockResolvedValue({ reserva });
  render(
    <EditarReservaForm
      ahoraInicial={new Date().toISOString()}
      reserva={reserva}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Buscar otra mesa" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Mesa 7 · 6 personas" }),
  );
  fireEvent.change(screen.getByLabelText("Hora"), {
    target: { value: "15:00" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Volver a la mesa original" }),
  );
  guardar();
  await screen.findByRole("status");
  expect(modificarReservacion).toHaveBeenCalledWith(
    reserva.reservacionId,
    expect.objectContaining({ mesaId: reserva.mesaId, hora: "15:00" }),
  );
});

it("mantiene el mismo render inicial aunque el reloj cruce el inicio de la reserva", () => {
  vi.useFakeTimers();
  const inicial = "2099-11-09T19:59:59.900Z";
  vi.setSystemTime(new Date(inicial));
  const servidor = renderToString(
    <EditarReservaForm reserva={reserva} ahoraInicial={inicial} />,
  );
  vi.setSystemTime(new Date("2099-11-09T20:00:00.100Z"));
  const cliente = renderToString(
    <EditarReservaForm reserva={reserva} ahoraInicial={inicial} />,
  );
  expect(cliente).toBe(servidor);
  render(<EditarReservaForm reserva={reserva} ahoraInicial={inicial} />);
  expect(
    screen.getByRole("button", { name: "Guardar cambios" }),
  ).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1000));
  expect(
    screen.queryByRole("button", { name: "Guardar cambios" }),
  ).not.toBeInTheDocument();
});
