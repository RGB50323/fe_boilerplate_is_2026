import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Paginacion } from "@/components/ui/paginacion";

// H32. Paginación reutilizable para backend y frontend (frontend).
// AC1, AC2 y AC3 se prueban en el backend: src/common/paginacion/h32-paginacion.spec.ts.

describe("H32. Paginación reutilizable para backend y frontend", () => {
  it("AC4: deshabilita la flecha del extremo y no se muestra con una sola página", () => {
    const { rerender } = render(
      <Paginacion pagina={1} totalPaginas={3} onCambiar={() => {}} />,
    );
    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Página siguiente" }),
    ).toBeEnabled();

    rerender(<Paginacion pagina={3} totalPaginas={3} onCambiar={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Página siguiente" }),
    ).toBeDisabled();

    rerender(<Paginacion pagina={1} totalPaginas={1} onCambiar={() => {}} />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("AC5: con teclado se cambia de página y se anuncia la página actual", () => {
    const onCambiar = vi.fn();
    render(<Paginacion pagina={2} totalPaginas={3} onCambiar={onCambiar} />);

    const siguiente = screen.getByRole("button", { name: "Página siguiente" });
    siguiente.focus();
    expect(siguiente).toHaveFocus();
    fireEvent.click(siguiente);
    expect(onCambiar).toHaveBeenCalledWith(3);

    const anuncio = screen.getByText("Página 2 de 3");
    expect(anuncio).toHaveAttribute("aria-live", "polite");
  });
});
