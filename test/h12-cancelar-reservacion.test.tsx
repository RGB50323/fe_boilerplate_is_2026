import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResumenReserva } from "@/components/reservaciones/resumen-reserva";
import { cancelarReservacion } from "@/app/actions/cancelacion-reserva";

// H12. Cancelar reservación de mesa (frontend).
// AC3, AC4 y AC5 se prueban en el backend:
// src/reservaciones/services/h12-cancelar-reservacion.spec.ts.

vi.mock("@/app/actions/cancelacion-reserva", () => ({ cancelarReservacion: vi.fn() }));

const reserva = {
  reservacionId: "R-000045",
  estado: "CONFIRMADA" as const,
  mesaId: 3,
  mesa: 2,
  sucursalId: 1,
  sucursal: "Centro",
  fecha: "2099-11-09",
  hora: "19:00",
  personas: 4,
};

describe("H12. Cancelar reservación de mesa", () => {
  beforeEach(() => vi.mocked(cancelarReservacion).mockReset());

  it("AC1: al elegir cancelar muestra los datos de la reservación y pide confirmar", async () => {
    render(<ResumenReserva reserva={reserva} permitirEdicion />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar reservación" }));

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent("R-000045");
    expect(dialogo).toHaveTextContent("Centro");
    expect(screen.getByRole("button", { name: "Confirmar cancelación" })).toBeVisible();
    expect(cancelarReservacion).not.toHaveBeenCalled();
  });

  it("AC2: si decide conservarla, cierra la confirmación sin cambios", async () => {
    render(<ResumenReserva reserva={reserva} permitirEdicion />);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar reservación" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Conservar reservación" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cancelarReservacion).not.toHaveBeenCalled();
    expect(screen.getByText("Confirmada")).toBeVisible();
  });
});
