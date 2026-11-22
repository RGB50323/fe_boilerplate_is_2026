import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarModeracion, ocultarResena } from "@/app/actions/resenas";
import { ModeracionView } from "@/app/admin/resenas/moderacion-view";

// H24. Ocultar una reseña inapropiada (frontend).
// AC1, AC2, AC4, AC5 y AC6 se prueban en el backend:
// src/resenas/services/h24-ocultar-resena.spec.ts.

vi.mock("@/app/actions/resenas", () => ({
  listarModeracion: vi.fn(),
  ocultarResena: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const visible = {
  id: 28,
  platillo: "Hamburguesa",
  estrellas: 5,
  comentario: "Rica, como siempre.",
  fecha: "2026-11-17",
  cliente: "Ana L.",
  estado: "VISIBLE" as const,
  ocultacion: null,
};

describe("H24. Ocultar una reseña inapropiada", () => {
  beforeEach(() => {
    vi.mocked(listarModeracion)
      .mockReset()
      .mockResolvedValue({
        pagina: { pagina: 1, totalPaginas: 1, total: 1, datos: [visible] },
      } as never);
    vi.mocked(ocultarResena).mockReset();
  });

  it("AC3: sin motivo elegido el botón Confirmar sigue deshabilitado", async () => {
    render(<ModeracionView />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Ocultar reseña de Hamburguesa de Ana L.",
      }),
    );
    const dialogo = screen.getByRole("dialog");
    const confirmar = within(dialogo).getByRole("button", {
      name: "Confirmar",
    });

    expect(confirmar).toBeDisabled();
    fireEvent.click(confirmar);
    expect(ocultarResena).not.toHaveBeenCalled();
    fireEvent.click(within(dialogo).getByLabelText("Spam"));
    expect(confirmar).toBeEnabled();
  });
});
