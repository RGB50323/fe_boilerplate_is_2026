import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardSinAcceso } from "@/app/dashboard/sin-acceso";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/font/google", () => ({
  Fraunces: () => ({ className: "font-test" }),
}));
vi.mock("@/app/actions/auth", () => ({ logout: vi.fn() }));

describe("DashboardSinAcceso", () => {
  it("en el dashboard indica que entran el gerente general y los gerentes de sucursal", () => {
    render(<DashboardSinAcceso motivo="sin-acceso" />);

    expect(screen.getByText("No tenés acceso al dashboard de ventas")).toBeInTheDocument();
    expect(
      screen.getByText("Esta sección es para el gerente general y los gerentes de sucursal."),
    ).toBeInTheDocument();
  });

  it("en el comparativo indica que es solo para el gerente general", () => {
    render(<DashboardSinAcceso motivo="sin-acceso" soloGerenteGeneral />);

    expect(screen.getByText("Esta sección es solo para el gerente general.")).toBeInTheDocument();
  });
});
