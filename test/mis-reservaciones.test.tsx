import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MisReservacionesView } from "@/app/perfil/reservaciones/mis-reservaciones-view";
import { listarMisReservaciones } from "@/app/actions/confirmacion-reserva";
vi.mock("@/app/actions/confirmacion-reserva", () => ({
  listarMisReservaciones: vi.fn(),
}));
const reserva = {
  reservacionId: "R-000045",
  estado: "CONFIRMADA" as const,
  mesaId: 3,
  mesa: 2,
  sucursalId: 1,
  sucursal: "Centro",
  fecha: "2030-11-09",
  hora: "19:00",
  personas: 4,
};
beforeEach(() => {
  vi.mocked(listarMisReservaciones).mockReset();
});
it("muestra carga mientras espera y después el resumen", async () => {
  let resolver!: (
    r: Awaited<ReturnType<typeof listarMisReservaciones>>,
  ) => void;
  vi.mocked(listarMisReservaciones).mockImplementation(
    () =>
      new Promise((r) => {
        resolver = r;
      }),
  );
  render(<MisReservacionesView />);
  expect(screen.getByText("Cargando tus reservaciones…")).toBeVisible();
  await act(async () =>
    resolver({
      datos: { datos: [reserva], pagina: 1, total: 1, totalPaginas: 1 },
    }),
  );
  expect(screen.getByText("R-000045")).toBeVisible();
  expect(screen.getByText("Confirmada")).toBeVisible();
  expect(screen.getByText("Centro")).toBeVisible();
});
it("permite reservar cuando el historial está vacío", async () => {
  vi.mocked(listarMisReservaciones).mockResolvedValue({
    datos: { datos: [], pagina: 1, total: 0, totalPaginas: 0 },
  });
  render(<MisReservacionesView />);
  expect(
    await screen.findByRole("link", { name: "Reservar una mesa" }),
  ).toHaveAttribute("href", "/reservas");
});
it("una sesión vencida lleva a login con retorno al perfil", async () => {
  vi.mocked(listarMisReservaciones).mockResolvedValue({
    error: "Tu sesión expiró.",
    sinSesion: true,
  });
  render(<MisReservacionesView />);
  expect(
    await screen.findByRole("link", { name: "Iniciar sesión" }),
  ).toHaveAttribute("href", "/login?next=%2Fperfil%2Freservaciones");
});
it("un rechazo de red muestra Reintentar y se recupera", async () => {
  vi.mocked(listarMisReservaciones)
    .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    .mockResolvedValueOnce({
      datos: { datos: [reserva], pagina: 1, total: 1, totalPaginas: 1 },
    });
  render(<MisReservacionesView />);
  fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("R-000045")).toBeVisible();
  expect(listarMisReservaciones).toHaveBeenCalledTimes(2);
});
it("cambia de página usando el componente de paginación común", async () => {
  vi.mocked(listarMisReservaciones)
    .mockResolvedValueOnce({
      datos: { datos: [reserva], pagina: 1, total: 11, totalPaginas: 2 },
    })
    .mockResolvedValueOnce({
      datos: {
        datos: [{ ...reserva, reservacionId: "R-000046" }],
        pagina: 2,
        total: 11,
        totalPaginas: 2,
      },
    });
  render(<MisReservacionesView />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Página siguiente" }),
  );
  expect(await screen.findByText("R-000046")).toBeVisible();
  expect(listarMisReservaciones).toHaveBeenLastCalledWith(2);
});
