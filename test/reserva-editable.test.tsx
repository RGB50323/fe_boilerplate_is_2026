import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ResumenReserva } from "@/components/reservaciones/resumen-reserva";
import { EditarReservaForm } from "@/app/perfil/reservaciones/[id]/editar/editar-reserva-form";
import {
  puedeModificarReserva,
  type DetalleReserva,
} from "@/lib/edicion-reserva";
const reserva: DetalleReserva = {
  reservacionId: "R-000045",
  estado: "CONFIRMADA",
  mesaId: 3,
  mesa: 2,
  sucursalId: 1,
  sucursal: "Centro",
  fecha: "2000-01-01",
  hora: "14:00",
  personas: 2,
  capacidad: 4,
  version: "2026-11-15T12:00:00.000Z",
  modificadaEn: null,
  horarios: [],
};
it("oculta el botón en reservas pasadas", () => {
  render(<ResumenReserva reserva={reserva} permitirEdicion />);
  expect(
    screen.queryByRole("link", { name: "Modificar reservación" }),
  ).not.toBeInTheDocument();
});
it("permite editar reservas confirmadas futuras", () => {
  render(
    <ResumenReserva
      reserva={{ ...reserva, fecha: "2099-01-01" }}
      permitirEdicion
    />,
  );
  expect(
    screen.getByRole("link", { name: "Modificar reservación" }),
  ).toBeVisible();
});
it("bloquea también el acceso directo al formulario de una reserva pasada", () => {
  render(
    <EditarReservaForm
      ahoraInicial={new Date().toISOString()}
      reserva={reserva}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "todavía no haya comenzado",
  );
  expect(
    screen.queryByRole("button", { name: "Guardar cambios" }),
  ).not.toBeInTheDocument();
});
it("usa la hora de El Salvador y cierra la edición exactamente al inicio", () => {
  const datos = { ...reserva, fecha: "2030-11-09", hora: "14:00" };
  expect(puedeModificarReserva(datos, new Date("2030-11-09T19:59:59Z"))).toBe(
    true,
  );
  expect(puedeModificarReserva(datos, new Date("2030-11-09T20:00:00Z"))).toBe(
    false,
  );
  expect(
    puedeModificarReserva(
      { ...datos, estado: "CANCELADA" },
      new Date("2030-11-09T19:00:00Z"),
    ),
  ).toBe(false);
});
