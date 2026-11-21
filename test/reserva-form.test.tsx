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
function montar(valores = inicial) {
  return render(
    <ReservaForm
      inicial={valores}
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
  sessionStorage.clear();
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
  expect(enlace.getAttribute("href")).toContain("buscar=1");
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

it("restaura el contacto tras 401 y login, sin incluirlo en la URL, y lo borra al confirmar", async () => {
  vi.mocked(confirmarReservacion).mockResolvedValueOnce({
    error: "Sesión vencida",
    sinSesion: true,
  });
  const vista = montar();
  fireEvent.change(screen.getByLabelText("Nombre completo"), {
    target: { value: "Beatriz Pérez" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar reservación" }),
  );
  const enlace = await screen.findByRole("link", {
    name: "Iniciar sesión para continuar",
  });
  expect(enlace.getAttribute("href")).not.toContain("Beatriz");
  expect(enlace.getAttribute("href")).not.toContain("correo.com");
  vista.unmount();
  montar({ ...inicial, nombre: "", telefono: "", correo: "" });
  expect(screen.getByLabelText("Nombre completo")).toHaveValue("Beatriz Pérez");
  expect(screen.getByLabelText("Teléfono")).toHaveValue(inicial.telefono);
  expect(screen.getByLabelText("Correo electrónico")).toHaveValue(
    inicial.correo,
  );
  vi.mocked(confirmarReservacion).mockResolvedValueOnce({ reserva });
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar reservación" }),
  );
  expect(await screen.findByText("R-000045")).toBeVisible();
  expect(sessionStorage.getItem("losburle:contacto-reserva")).toBeNull();
});
it("no restaura un borrador vencido ni el contacto de otra selección", async () => {
  vi.mocked(confirmarReservacion).mockResolvedValue({
    error: "Sesión vencida",
    sinSesion: true,
  });
  const vista = montar();
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar reservación" }),
  );
  await screen.findByRole("link", { name: "Iniciar sesión para continuar" });
  vista.unmount();
  const otra = montar({
    ...inicial,
    hora: "18:00",
    nombre: "",
    telefono: "",
    correo: "",
  });
  expect(screen.getByLabelText("Nombre completo")).toHaveValue("");
  otra.unmount();
  vi.setSystemTime(new Date("2030-11-01T12:31:00Z"));
  montar({ ...inicial, nombre: "", telefono: "", correo: "" });
  expect(screen.getByLabelText("Nombre completo")).toHaveValue("");
});
