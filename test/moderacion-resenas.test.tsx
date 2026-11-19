import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarModeracion, ocultarResena } from "@/app/actions/resenas";
import { ModeracionView } from "@/app/admin/resenas/moderacion-view";

vi.mock("@/app/actions/resenas", () => ({
  listarModeracion: vi.fn(),
  ocultarResena: vi.fn(),
}));
const reemplazar = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: reemplazar, push: vi.fn() }),
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
const oculta = {
  ...visible,
  id: 9,
  platillo: "Pupusas",
  comentario: null,
  estado: "OCULTA" as const,
  ocultacion: {
    por: "Gabriel Gerente",
    fecha: "2026-11-09",
    hora: "23:25",
    motivo: "OFENSIVO" as const,
  },
};
const pagina = (datos: unknown[], extra = {}) => ({
  pagina: { pagina: 1, totalPaginas: 1, total: datos.length, datos, ...extra },
});

beforeEach(() => {
  vi.mocked(listarModeracion).mockReset();
  vi.mocked(ocultarResena).mockReset();
  reemplazar.mockReset();
  vi.mocked(listarModeracion).mockResolvedValue(
    pagina([visible, oculta]) as never,
  );
});

async function abrirModal() {
  render(<ModeracionView />);
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Ocultar reseña de Hamburguesa de Ana L.",
    }),
  );
  return screen.getByRole("dialog");
}

describe("lista de moderación (LB-103)", () => {
  it("muestra platillo, estrellas, comentario, fecha y estado", async () => {
    render(<ModeracionView />);
    const fila = await screen.findByRole("listitem", {
      name: "Reseña de Hamburguesa",
    });
    expect(within(fila).getByText("Rica, como siempre.")).toBeVisible();
    expect(within(fila).getByText("5 de 5 estrellas")).toBeInTheDocument();
    expect(within(fila).getByText("17 nov 2026")).toBeVisible();
    expect(within(fila).getByText("Visible")).toBeVisible();
    expect(listarModeracion).toHaveBeenCalledWith(1, undefined);
  });

  it("la oculta muestra quién, cuándo y el motivo, sin botón Ocultar", async () => {
    render(<ModeracionView />);
    const fila = await screen.findByRole("listitem", {
      name: "Reseña de Pupusas",
    });
    expect(
      within(fila).getByText(
        "Ocultada por Gabriel Gerente el 9 nov 2026 a las 23:25 · Motivo: Ofensivo",
      ),
    ).toBeVisible();
    expect(within(fila).queryByRole("button", { name: /Ocultar/ })).toBeNull();
  });

  it("filtra Visibles y Ocultas", async () => {
    render(<ModeracionView />);
    await screen.findByText("Rica, como siempre.");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Ocultas" })),
    );
    expect(listarModeracion).toHaveBeenLastCalledWith(1, "OCULTA");
    expect(screen.getByRole("button", { name: "Ocultas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Visibles" })),
    );
    expect(listarModeracion).toHaveBeenLastCalledWith(1, "VISIBLE");
  });

  it("pagina de 10 en 10", async () => {
    vi.mocked(listarModeracion).mockResolvedValue(
      pagina([visible], { totalPaginas: 2, total: 11 }) as never,
    );
    render(<ModeracionView />);
    await screen.findByText("Rica, como siempre.");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Página siguiente" })),
    );
    expect(listarModeracion).toHaveBeenLastCalledWith(2, undefined);
  });

  it("otro rol ve el mensaje de permiso", async () => {
    vi.mocked(listarModeracion).mockResolvedValue({
      error: "No tienes permiso para ver esta sección",
    });
    render(<ModeracionView />);
    expect(
      await screen.findByText("No tienes permiso para ver esta sección"),
    ).toHaveAttribute("role", "alert");
  });
});

describe("ocultar reseña (LB-103)", () => {
  it("Confirmar queda deshabilitado hasta elegir motivo", async () => {
    const dialogo = await abrirModal();
    const confirmar = within(dialogo).getByRole("button", {
      name: "Confirmar",
    });
    expect(confirmar).toBeDisabled();
    fireEvent.click(within(dialogo).getByLabelText("Spam"));
    expect(confirmar).toBeEnabled();
  });

  it("oculta, avisa y actualiza la fila", async () => {
    vi.mocked(ocultarResena).mockResolvedValue({
      ok: true,
      resena: {
        ...visible,
        estado: "OCULTA",
        ocultacion: {
          por: "Gabriel Gerente",
          fecha: "2026-11-18",
          hora: "21:25",
          motivo: "SPAM",
        },
      },
    });
    const dialogo = await abrirModal();
    fireEvent.click(within(dialogo).getByLabelText("Spam"));
    await act(async () =>
      fireEvent.click(
        within(dialogo).getByRole("button", { name: "Confirmar" }),
      ),
    );
    expect(ocultarResena).toHaveBeenCalledWith(28, "SPAM");
    expect(await screen.findByText("Reseña ocultada")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    const fila = screen.getByRole("listitem", {
      name: "Reseña de Hamburguesa",
    });
    expect(within(fila).getByText("Oculta")).toBeVisible();
    expect(within(fila).getByText(/Motivo: Spam/)).toBeVisible();
  });

  it('si ya estaba oculta muestra "Esta reseña ya estaba oculta."', async () => {
    vi.mocked(ocultarResena).mockResolvedValue({
      ok: false,
      yaOculta: true,
      error: "Esta reseña ya estaba oculta.",
    });
    const dialogo = await abrirModal();
    fireEvent.click(within(dialogo).getByLabelText("Ofensivo"));
    await act(async () =>
      fireEvent.click(
        within(dialogo).getByRole("button", { name: "Confirmar" }),
      ),
    );
    expect(
      await screen.findByText("Esta reseña ya estaba oculta."),
    ).toBeVisible();
    // Recarga la lista para mostrar el estado real
    expect(listarModeracion).toHaveBeenCalledTimes(2);
  });

  it("otro error se muestra dentro del modal", async () => {
    vi.mocked(ocultarResena).mockResolvedValue({
      ok: false,
      error: "Esta reseña ya no existe.",
    });
    const dialogo = await abrirModal();
    fireEvent.click(within(dialogo).getByLabelText("No relacionado"));
    await act(async () =>
      fireEvent.click(
        within(dialogo).getByRole("button", { name: "Confirmar" }),
      ),
    );
    expect(
      within(dialogo).getByText("Esta reseña ya no existe."),
    ).toBeVisible();
  });
});
