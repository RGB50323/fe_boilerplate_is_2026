import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarReporteCalificaciones } from "@/app/actions/resenas";
import { ReporteCalificacionesView } from "@/app/admin/calificaciones/reporte-view";
import { errorRango } from "@/lib/resenas";

vi.mock("@/app/actions/resenas", () => ({
  consultarReporteCalificaciones: vi.fn(),
}));
const reemplazar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: reemplazar, push: vi.fn() }),
}));

const reporte = {
  sucursal: "Centro",
  promedio: 4.3,
  total: 6,
  distribucion: { 1: 0, 2: 1, 3: 0, 4: 1, 5: 4 },
  desde: null,
  hasta: null,
};

beforeEach(() => {
  vi.mocked(consultarReporteCalificaciones).mockReset();
  reemplazar.mockReset();
  vi.mocked(consultarReporteCalificaciones).mockResolvedValue({ reporte });
});

describe("errorRango", () => {
  it("solo falla si la fecha final es anterior a la inicial", () => {
    expect(errorRango("2026-11-10", "2026-11-01")).toBe(
      "La fecha final no puede ser anterior a la inicial.",
    );
    expect(errorRango("2026-11-10", "2026-11-10")).toBeNull();
    expect(errorRango("", "2026-11-01")).toBeNull();
  });
});

describe("reporte de calificaciones (LB-97)", () => {
  it("muestra de la sucursal el promedio con un decimal, el total y la distribución", async () => {
    render(<ReporteCalificacionesView />);
    expect(
      await screen.findByRole("heading", { name: "Calificaciones — Centro" }),
    ).toBeVisible();
    expect(screen.getByText("4.3")).toBeVisible();
    expect(screen.getByText("6 reseñas")).toBeVisible();
    expect(screen.getByLabelText("5 estrellas: 4")).toBeInTheDocument();
    expect(screen.getByLabelText("2 estrellas: 1")).toBeInTheDocument();
    expect(consultarReporteCalificaciones).toHaveBeenCalledWith("", "");
  });

  it("aplica el rango de fechas", async () => {
    render(<ReporteCalificacionesView />);
    await screen.findByText("4.3");
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-11-01" },
    });
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "2026-11-15" },
    });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Aplicar" })),
    );
    expect(consultarReporteCalificaciones).toHaveBeenLastCalledWith(
      "2026-11-01",
      "2026-11-15",
    );
  });

  it("con la fecha final anterior no genera el reporte y avisa", async () => {
    render(<ReporteCalificacionesView />);
    await screen.findByText("4.3");
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-11-15" },
    });
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "2026-11-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(
      screen.getByText("La fecha final no puede ser anterior a la inicial."),
    ).toBeVisible();
    expect(consultarReporteCalificaciones).toHaveBeenCalledTimes(1);
  });

  it("sin reseñas en el periodo lo indica", async () => {
    vi.mocked(consultarReporteCalificaciones).mockResolvedValue({
      reporte: {
        ...reporte,
        promedio: null,
        total: 0,
        distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    });
    render(<ReporteCalificacionesView />);
    expect(
      await screen.findByText("Sin reseñas en el periodo seleccionado"),
    ).toBeVisible();
  });

  it("muestra el mensaje de permiso si el backend lo rechaza", async () => {
    vi.mocked(consultarReporteCalificaciones).mockResolvedValue({
      error: "No tienes permiso para ver esta sección",
    });
    render(<ReporteCalificacionesView />);
    expect(
      await screen.findByText("No tienes permiso para ver esta sección"),
    ).toBeVisible();
  });

  it("sin sesión lleva al login", async () => {
    vi.mocked(consultarReporteCalificaciones).mockResolvedValue({
      sinSesion: true,
    });
    render(<ReporteCalificacionesView />);
    await act(async () => undefined);
    expect(reemplazar).toHaveBeenCalledWith("/login");
  });
});
