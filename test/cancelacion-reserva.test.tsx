import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ResumenReserva } from "@/components/reservaciones/resumen-reserva";
import { cancelarReservacion } from "@/app/actions/cancelacion-reserva";

vi.mock("@/app/actions/cancelacion-reserva", () => ({ cancelarReservacion: vi.fn() }));
const reserva = {
  reservacionId: "R-000045", estado: "CONFIRMADA" as const, mesaId: 3,
  mesa: 2, sucursalId: 1, sucursal: "Centro", fecha: "2099-11-09", hora: "19:00", personas: 4,
};
beforeEach(() => vi.mocked(cancelarReservacion).mockReset());
it("permite conservar la reserva sin enviar ninguna solicitud", async () => {
  render(<ResumenReserva reserva={reserva} permitirEdicion />);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar reservación" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent("R-000045");
  fireEvent.click(screen.getByRole("button", { name: "Conservar reservación" }));
  expect(cancelarReservacion).not.toHaveBeenCalled();
  expect(screen.getByText("Confirmada")).toBeVisible();
});
it("actualiza el estado y elimina las acciones después de cancelar", async () => {
  vi.mocked(cancelarReservacion).mockResolvedValue({ reserva: { ...reserva, estado: "CANCELADA" } });
  render(<ResumenReserva reserva={reserva} permitirEdicion />);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar reservación" }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar cancelación" }));
  expect(await screen.findByText(/Tu reservación fue cancelada/)).toBeVisible();
  expect(screen.getByText("Cancelada")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Cancelar reservación" })).not.toBeInTheDocument();
});
it.each([{ ...reserva, fecha: "2000-01-01" }, { ...reserva, estado: "CANCELADA" as const }])(
  "no permite cancelar una reserva pasada o cancelada", (datos) => {
    render(<ResumenReserva reserva={datos} permitirEdicion />);
    expect(screen.queryByRole("button", { name: "Cancelar reservación" })).not.toBeInTheDocument();
  },
);
it("conserva el estado y ofrece login si la sesión vence", async () => {
  vi.mocked(cancelarReservacion).mockResolvedValue({ error: "Iniciá sesión.", sinSesion: true });
  render(<ResumenReserva reserva={reserva} permitirEdicion />);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar reservación" }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar cancelación" }));
  expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Confirmar cancelación" })).toBeDisabled();
  expect(screen.getByText("Confirmada")).toBeInTheDocument();
});
