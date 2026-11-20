import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/dashboard/page";
import ComparativoPage from "@/app/dashboard/comparativo/page";

// Las páginas del dashboard consultan las sucursales al backend
// (listarSucursales) y se las pasan a las vistas; no usan una lista fija.
const mocks = vi.hoisted(() => ({
  motivoSinAcceso: vi.fn(),
  listarSucursales: vi.fn(),
}));

vi.mock("@/lib/dashboard-acceso", () => ({ motivoSinAcceso: mocks.motivoSinAcceso }));
vi.mock("@/app/actions/reservaciones", () => ({
  listarSucursales: mocks.listarSucursales,
}));
vi.mock("@/app/dashboard/dashboard-view", () => ({
  DashboardView: ({ sucursales }: { sucursales: { id: number; nombre: string }[] }) => (
    <p>General: {sucursales.map((s) => `${s.id}-${s.nombre}`).join(", ")}</p>
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
