import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ReservasPage from "@/app/reservas/page";
import {
  consultarDisponibilidad,
  listarSucursales,
} from "@/app/actions/reservaciones";
import { DisponibilidadForm } from "@/app/reservas/disponibilidad-form";
vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "fuente", className: "fuente" }),
}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/app/actions/reservaciones", () => ({
  listarSucursales: vi.fn(),
  consultarDisponibilidad: vi.fn(),
}));
vi.mock("@/app/reservas/disponibilidad-view", () => ({
  DisponibilidadView: (props: Parameters<typeof DisponibilidadForm>[0]) => (
    <DisponibilidadForm {...props} />
  ),
}));
const filtros = {
  sucursalId: "1",
  fecha: "2030-11-09",
  hora: "19:00",
  personas: "4",
};
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2030-11-01T12:00:00Z"));
  vi.mocked(consultarDisponibilidad).mockReset();
  vi.mocked(listarSucursales).mockResolvedValue({
    sucursales: [
      {
        id: 1,
        nombre: "Centro",
        horarios: [{ diaSemana: 6, apertura: "08:00", cierre: "23:00" }],
      },
    ],
  });
});
it("al volver de 409 busca y muestra mesas actualizadas sin pulsar Buscar", async () => {
  vi.mocked(consultarDisponibilidad).mockResolvedValue({
    mesas: [{ mesaId: 9, numero: 9, capacidad: 4, zona: null }],
  });
  render(
    await ReservasPage({
      searchParams: Promise.resolve({ ...filtros, buscar: "1" }),
    }),
  );
  expect(screen.getByRole("heading", { name: "Mesa 9" })).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "Mesa 3" }),
  ).not.toBeInTheDocument();
  expect(
    Object.fromEntries(vi.mocked(consultarDisponibilidad).mock.calls[0][0]),
  ).toEqual(filtros);
  expect(consultarDisponibilidad).toHaveBeenCalledTimes(1);
});
it("muestra el resultado vacío de la consulta automática", async () => {
  vi.mocked(consultarDisponibilidad).mockResolvedValue({ mesas: [] });
  render(
    await ReservasPage({
      searchParams: Promise.resolve({ ...filtros, buscar: "1" }),
    }),
  );
  expect(
    screen.getByText(/No hay mesas disponibles para la fecha/),
  ).toBeVisible();
});
it("permite reintentar si la consulta automática falla", async () => {
  vi.mocked(consultarDisponibilidad).mockResolvedValue({
    mesas: [],
    error: "Error de conexión",
  });
  render(
    await ReservasPage({
      searchParams: Promise.resolve({ ...filtros, buscar: "1" }),
    }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Error de conexión");
  expect(
    screen.getByRole("button", { name: "Intentar de nuevo" }),
  ).toBeVisible();
});
it("mantiene la búsqueda manual al entrar normalmente", async () => {
  render(await ReservasPage({ searchParams: Promise.resolve({}) }));
  expect(consultarDisponibilidad).not.toHaveBeenCalled();
  expect(
    screen.getByText("Encontrá el lugar para tu próxima visita"),
  ).toBeVisible();
});
