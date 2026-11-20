import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/dashboard/page";
import ComparativoPage from "@/app/dashboard/comparativo/page";

// Las páginas del dashboard consultan las sucursales al backend
// (listarSucursales) y se las pasan a las vistas; no usan una lista fija.
const mocks = vi.hoisted(() => ({
  motivoSinAcceso: vi.fn(),
  listarSucursales: vi.fn(),
  getUsuarioActual: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  ROL_GERENTE: "GERENTE",
  ROL_GERENTE_GENERAL: "GERENTE_GENERAL",
  getUsuarioActual: mocks.getUsuarioActual,
}));

vi.mock("@/lib/dashboard-acceso", () => ({ motivoSinAcceso: mocks.motivoSinAcceso }));
vi.mock("@/app/actions/reservaciones", () => ({
  listarSucursales: mocks.listarSucursales,
}));
vi.mock("@/app/dashboard/dashboard-view", () => ({
  DashboardView: ({
    sucursales,
    sucursalFija,
  }: {
    sucursales: { id: number; nombre: string }[];
    sucursalFija?: { nombre: string };
  }) => (
    <p>
      General: {sucursales.map((s) => `${s.id}-${s.nombre}`).join(", ")}
      {sucursalFija && ` (fija: ${sucursalFija.nombre})`}
    </p>
  ),
}));
vi.mock("@/app/dashboard/comparativo/comparativo-view", () => ({
  ComparativoView: ({ sucursales }: { sucursales: { id: number; nombre: string }[] }) => (
    <p>Comparativo: {sucursales.map((s) => `${s.id}-${s.nombre}`).join(", ")}</p>
  ),
}));
vi.mock("@/app/dashboard/sin-acceso", () => ({
  DashboardSinAcceso: ({ motivo }: { motivo: string }) => <p>Sin acceso: {motivo}</p>,
}));

const sucursales = [
  { id: 7, nombre: "Soyapango", horarios: [] },
  { id: 25, nombre: "San Miguel", horarios: [] },
];

const paginas = [
  { nombre: "General", Pagina: DashboardPage },
  { nombre: "Comparativo", Pagina: ComparativoPage },
];

describe.each(paginas)("página $nombre del dashboard", ({ nombre, Pagina }) => {
  beforeEach(() => {
    mocks.motivoSinAcceso.mockReset().mockResolvedValue(null);
    mocks.listarSucursales.mockReset().mockResolvedValue({ sucursales });
    mocks.getUsuarioActual.mockReset().mockResolvedValue({
      estado: "ok",
      usuario: { id: "1", email: "g@example.com", rol: "GERENTE_GENERAL", sucursalId: null },
    });
  });

  it("pasa a la vista las sucursales del backend", async () => {
    render(await Pagina());
    expect(mocks.listarSucursales).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(`${nombre}: 7-Soyapango, 25-San Miguel`),
    ).toBeInTheDocument();
  });

  it("si no puede cargar las sucursales muestra el error", async () => {
    mocks.listarSucursales.mockResolvedValue({
      sucursales: [],
      error: "No pudimos cargar las sucursales y sus horarios.",
    });
    render(await Pagina());
    expect(screen.getByText("Sin acceso: error")).toBeInTheDocument();
  });

  it("sin acceso no consulta las sucursales", async () => {
    mocks.motivoSinAcceso.mockResolvedValue("sin-acceso");
    render(await Pagina());
    expect(screen.getByText("Sin acceso: sin-acceso")).toBeInTheDocument();
    expect(mocks.listarSucursales).not.toHaveBeenCalled();
  });
});

describe("dashboard del gerente de sucursal", () => {
  beforeEach(() => {
    mocks.motivoSinAcceso.mockReset().mockResolvedValue(null);
    mocks.listarSucursales.mockReset().mockResolvedValue({ sucursales });
    mocks.getUsuarioActual.mockReset().mockResolvedValue({
      estado: "ok",
      usuario: { id: "3", email: "g@example.com", rol: "GERENTE", sucursalId: 25 },
    });
  });

  it("la vista general queda fija en su sucursal", async () => {
    render(await DashboardPage());
    expect(screen.getByText(/\(fija: San Miguel\)/)).toBeInTheDocument();
  });

  it("el comparativo solo admite al gerente general", async () => {
    await ComparativoPage();
    expect(mocks.motivoSinAcceso).toHaveBeenCalledWith(["GERENTE_GENERAL"]);
  });
});
