import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import PanelGerenteLayout from "@/app/admin/platillos/layout";

vi.mock("next/font/google", () => ({ Fraunces: () => ({ className: "" }) }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/inventario/contador-alertas", () => ({
  ContadorAlertas: () => null,
}));
vi.mock("@/components/notificaciones/campana-notificaciones", () => ({
  CampanaNotificaciones: () => null,
}));

it("el logo Los Burle lleva a la página principal", () => {
  render(<PanelGerenteLayout>contenido</PanelGerenteLayout>);
  expect(screen.getByRole("link", { name: "Los Burle" })).toHaveAttribute(
    "href",
    "/menu",
  );
});

it("la navegación lleva a todas las secciones del gerente", () => {
  render(<PanelGerenteLayout>contenido</PanelGerenteLayout>);
  const nav = screen.getByRole("navigation", { name: "Panel de gerente" });
  expect(
    within(nav)
      .getAllByRole("link")
      .map((a) => [a.textContent, a.getAttribute("href")]),
  ).toEqual([
    ["Ocupación", "/admin/ocupacion"],
    ["Calificaciones", "/admin/calificaciones"],
    ["Moderar reseñas", "/admin/resenas"],
    ["Inventario", "/admin/inventario"],
    ["Platillos", "/admin/platillos"],
    ["Cocina", "/cocina"],
    ["Dashboard", "/dashboard"],
    ["Ver menú", "/menu"],
  ]);
});
