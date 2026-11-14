import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ReservaForm } from "@/app/reservas/nueva/reserva-form";
import {
  confirmarReservacion,
  type ConfirmacionResultado,
} from "@/app/actions/confirmacion-reserva";
vi.mock("@/app/actions/confirmacion-reserva", () => ({
  confirmarReservacion: vi.fn(),
}));
const inicial = {
  mesaId: "3",
  sucursalId: "1",
  fecha: "2030-11-09",
  hora: "19:00",
  personas: "4",
  nombre: "Ana López",
  telefono: "7123-4567",
  correo: "ana@correo.com",
};
const reserva = {
  reservacionId: "R-000045",
  estado: "CONFIRMADA" as const,
  mesaId: 3,
  mesa: 2,
  sucursalId: 1,
  sucursal: "Centro",
  fecha: inicial.fecha,
  hora: inicial.hora,
  personas: 4,
};
function montar() {
  return render(
    <ReservaForm
      inicial={inicial}
      mesa={{ mesaId: 3, numero: 2, capacidad: 4, zona: null }}
      sucursal={{
        id: 1,
        nombre: "Centro",
        horarios: [{ diaSemana: 6, apertura: "08:00", cierre: "23:00" }],
      }}
    />,
  );
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2030-11-01T12:00:00Z"));
  vi.mocked(confirmarReservacion).mockReset();
});
it("muestra errores bajo los campos sin enviar datos inválidos", async () => {
  montar();
  fireEvent.change(screen.getByLabelText("Teléfono"), {
    target: { value: "123" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar reservación" }),
  );
  expect(
    screen.getByText("Ingresá un teléfono con formato ####-####."),
  ).toBeVisible();
  expect(confirmarReservacion).not.toHaveBeenCalled();
});
it("deshabilita el formulario mientras confirma y evita envíos repetidos", async () => {
  let resolver!: (r: ConfirmacionResultado) => void;
  vi.mocked(confirmarReservacion).mockImplementation(
    () =>
      new Promise((r) => {
        resolver = r;
      }),
  );
  montar();
  fireEvent.submit(screen.getByRole("form", { name: "Confirmar reservación" }));
  fireEvent.submit(screen.getByRole("form", { name: "Confirmar reservación" }));
  expect(confirmarReservacion).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Confirmando…" })).toBeDisabled();
  await act(async () => resolver({ reserva }));
  expect(screen.getByText("R-000045")).toBeVisible();
  expect(screen.getByText("Confirmada")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Confirmar reservación" }),
  ).not.toBeInTheDocument();
});
it("ante 409 ofrece elegir otra mesa conservando los criterios", async () => {
  vi.mocked(confirmarReservacion).mockResolvedValue({
    error: "Mesa ocupada",
    sinDisponibilidad: true,
  });
  montar();
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar reservación" }),
  );
  const enlace = await screen.findByRole("link", {
    name: "Elegir otra mesa disponible",
  });
  expect(enlace).toHaveAttribute(
    "href",
    expect.stringContaining("fecha=2030-11-09"),
  );
});
it("ante 401 permite login con la selección para regresar", async () => {
  vi.mocked(confirmarReservacion).mockResolvedValue({
    error: "Iniciá sesión",
    sinSesion: true,
  });
  montar();
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar reservación" }),
  );
  expect(
    await screen.findByRole("link", { name: "Iniciar sesión para continuar" }),
  ).toHaveAttribute("href", expect.stringContaining("/login?next="));
});
it("un rechazo de la Server Action termina la carga y permite verificar mis reservas", async () => {
  vi.mocked(confirmarReservacion).mockRejectedValue(
    new TypeError("Failed to fetch"),
  );
  montar();
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar reservación" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Mis reservaciones",
  );
  expect(
    screen.getByRole("button", { name: "Confirmar reservación" }),
  ).toBeEnabled();
});
