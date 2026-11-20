import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EncabezadoDashboard } from "@/components/ui/dashboard/encabezado-dashboard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/app/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));

describe("EncabezadoDashboard", () => {
  it("muestra la pestaña Comparativo al gerente general", () => {
    render(<EncabezadoDashboard vista="general" titulo="Dashboard" consultaPeriodo="" />);
    expect(screen.getByRole("link", { name: "Comparativo" })).toBeInTheDocument();
  });

  it("sin comparativo oculta la pestaña", () => {
    render(
      <EncabezadoDashboard
        vista="general"
        titulo="Dashboard"
        consultaPeriodo=""
        conComparativo={false}
      />,
    );
    expect(screen.queryByRole("link", { name: "Comparativo" })).not.toBeInTheDocument();
  });
});
