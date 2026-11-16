import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CarritoLlevar } from "@/components/menu/carrito-llevar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/actions/pedidos", () => ({ crearPedidoLlevar: vi.fn() }));

const platillo = {
  id: 10,
  nombre: "Hamburguesa",
  descripcion: null,
  precio: 8.99,
  imagenUrl: null,
  disponibilidad: 3,
};

it("la barra indica que se puede abrir y luego ocultar", () => {
  render(
    <CarritoLlevar
      sucursalId={1}
      lineas={[{ platillo, cantidad: 1, nota: "" }]}
      onCambiarCantidad={vi.fn()}
      onCambiarNota={vi.fn()}
      onQuitar={vi.fn()}
    />,
  );
  const barra = screen.getByRole("button", { name: /Tu pedido para llevar/ });
  expect(barra).toHaveTextContent("Ver pedido");
  expect(barra).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(barra);
  expect(barra).toHaveTextContent("Ocultar");
  expect(barra).toHaveAttribute("aria-expanded", "true");
});
