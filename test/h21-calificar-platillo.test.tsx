import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarPendientesResena, publicarResena } from "@/app/actions/resenas";
import { PendientesResena } from "@/components/resenas/pendientes-resena";

// H21. Calificar un platillo que pedí (frontend).
// AC1, AC2, AC3 y AC5 se prueban en el backend:
// src/resenas/services/h21-calificar-platillo.spec.ts.

vi.mock("@/app/actions/resenas", () => ({
  listarPendientesResena: vi.fn(),
  publicarResena: vi.fn(),
}));
const reemplazar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: reemplazar, push: vi.fn() }),
}));

const pupusas = {
  pedidoId: 121,
  numero: "S1-000121",
  sucursal: "Centro",
  platilloId: 10,
  nombre: "Pupusas",
  disponibleHasta: "2026-11-22T18:00:00.000Z",
};

async function abrirFormulario() {
  render(<PendientesResena />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Calificar Pupusas" }),
  );
  return screen.getByRole("dialog");
}

describe("H21. Calificar un platillo que pedí", () => {
  beforeEach(() => {
    vi.mocked(listarPendientesResena)
      .mockReset()
      .mockResolvedValue({ pendientes: [pupusas] });
    vi.mocked(publicarResena).mockReset();
    reemplazar.mockReset();
  });

  it("AC4: muestra el contador y no permite publicar más de 500 caracteres", async () => {
    const dialogo = await abrirFormulario();
    fireEvent.click(within(dialogo).getByLabelText("5 estrellas"));
    const comentario = within(dialogo).getByLabelText("Comentario (opcional)");

    fireEvent.change(comentario, { target: { value: "a".repeat(501) } });

    expect(within(dialogo).getByText(/501\/500/)).toBeVisible();
    expect(
      within(dialogo).getByRole("button", { name: "Publicar reseña" }),
    ).toBeDisabled();
  });

  it("AC6: sin sesión pide iniciar sesión", async () => {
    vi.mocked(publicarResena).mockResolvedValue({
      ok: false,
      error: "Tu sesión expiró.",
      sinSesion: true,
    });
    const dialogo = await abrirFormulario();
    fireEvent.click(within(dialogo).getByLabelText("5 estrellas"));
    await act(async () =>
      fireEvent.click(
        within(dialogo).getByRole("button", { name: "Publicar reseña" }),
      ),
    );

    expect(reemplazar).toHaveBeenCalledWith("/login?next=%2Fpedidos");
  });
});
