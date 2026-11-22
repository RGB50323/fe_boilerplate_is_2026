import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarReporteCalificaciones } from "@/app/actions/resenas";
import { ReporteCalificacionesView } from "@/app/admin/calificaciones/reporte-view";
import { errorRango } from "@/lib/resenas";

// H23. Promedio de calificación de mi sucursal (frontend).
// AC1, AC2 y el alcance por sucursal se prueban en el backend:
// src/resenas/services/h23-reporte-calificaciones.spec.ts.

vi.mock("@/app/actions/resenas", () => ({
  consultarReporteCalificaciones: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe("H23. Promedio de calificación de mi sucursal", () => {
  beforeEach(() => vi.mocked(consultarReporteCalificaciones).mockReset());

  it("AC3: con la fecha final anterior a la inicial muestra el mensaje", () => {
    expect(errorRango("2026-11-21", "2026-11-01")).toBe(
      "La fecha final no puede ser anterior a la inicial.",
    );
    expect(errorRango("2026-11-01", "2026-11-21")).toBeFalsy();
  });

  it("AC4: un periodo sin reseñas muestra “Sin reseñas en el periodo seleccionado”", async () => {
    vi.mocked(consultarReporteCalificaciones).mockResolvedValue({
      reporte: {
        sucursal: "Centro",
        promedio: null,
        total: 0,
        distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        desde: null,
        hasta: null,
      },
    });
    render(<ReporteCalificacionesView />);

    expect(
      await screen.findByText("Sin reseñas en el periodo seleccionado"),
    ).toBeVisible();
  });

  it("AC5: otro rol ve “No tienes permiso para ver esta sección”", async () => {
    vi.mocked(consultarReporteCalificaciones).mockResolvedValue({
      error: "No tienes permiso para ver esta sección",
    });
    render(<ReporteCalificacionesView />);

    expect(
      await screen.findByText("No tienes permiso para ver esta sección"),
    ).toBeVisible();
  });
});
