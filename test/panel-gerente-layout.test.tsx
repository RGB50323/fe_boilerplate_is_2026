import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import PanelGerenteLayout from "@/app/admin/platillos/layout";

vi.mock("next/font/google", () => ({ Fraunces: () => ({ className: "" }) }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

it("el logo Los Burle lleva a la página principal", () => {
  render(<PanelGerenteLayout>contenido</PanelGerenteLayout>);
  expect(screen.getByRole("link", { name: "Los Burle" })).toHaveAttribute(
    "href",
    "/menu",
  );
});
