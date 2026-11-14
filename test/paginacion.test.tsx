import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Paginacion } from "@/components/ui/paginacion";

const anterior = () => screen.getByRole("button", { name: /Anterior/ });
const siguiente = () => screen.getByRole("button", { name: /Siguiente/ });

describe("Paginacion", () => {
  it("en la primera página deshabilita Anterior", () => {
    render(<Paginacion pagina={1} totalPaginas={3} onCambiar={() => {}} />);
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(anterior()).toBeDisabled();
    expect(siguiente()).toBeEnabled();
  });

  it("en una página intermedia permite ir a ambos lados", () => {
    const onCambiar = vi.fn();
    render(<Paginacion pagina={2} totalPaginas={3} onCambiar={onCambiar} />);
    fireEvent.click(anterior());
    fireEvent.click(siguiente());
    expect(onCambiar.mock.calls).toEqual([[1], [3]]);
  });

  it("en la última página deshabilita Siguiente", () => {
    render(<Paginacion pagina={3} totalPaginas={3} onCambiar={() => {}} />);
    expect(siguiente()).toBeDisabled();
    expect(anterior()).toBeEnabled();
  });

  it.each([0, 1])("con %s páginas no se muestra", (totalPaginas) => {
    render(
      <Paginacion
        pagina={1}
        totalPaginas={totalPaginas}
        onCambiar={() => {}}
      />,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("deshabilitado bloquea ambos botones", () => {
    render(
      <Paginacion
        pagina={2}
        totalPaginas={3}
        onCambiar={() => {}}
        deshabilitado
      />,
    );
    expect(anterior()).toBeDisabled();
    expect(siguiente()).toBeDisabled();
  });

  it("usa la etiqueta indicada y anuncia la página", () => {
    render(
      <Paginacion
        pagina={1}
        totalPaginas={2}
        onCambiar={() => {}}
        etiqueta="Paginación de reseñas"
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "Paginación de reseñas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});
