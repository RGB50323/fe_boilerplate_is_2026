import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarPendientesResena, publicarResena } from "@/app/actions/resenas";
import { PendientesResena } from "@/components/resenas/pendientes-resena";

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
const yuca = { ...pupusas, platilloId: 11, nombre: "Yuca frita" };

beforeEach(() => {
  vi.mocked(listarPendientesResena).mockReset();
  vi.mocked(publicarResena).mockReset();
  reemplazar.mockReset();
  vi.mocked(listarPendientesResena).mockResolvedValue({
    pendientes: [pupusas, yuca],
  });
});

async function abrirFormulario(nombre = "Pupusas") {
  render(<PendientesResena />);
  fireEvent.click(
    await screen.findByRole("button", { name: `Calificar ${nombre}` }),
  );
  return screen.getByRole("dialog");
}

describe("pendientes de reseñar (LB-80)", () => {
  it("lista los platillos que todavía puedo calificar", async () => {
    render(<PendientesResena />);
    expect(
      await screen.findByRole("heading", { name: "Califica lo que pediste" }),
    ).toBeVisible();
    expect(screen.getByText("Pupusas")).toBeVisible();
    expect(screen.getByText("Yuca frita")).toBeVisible();
  });

  it("no muestra nada si no hay pendientes", async () => {
    vi.mocked(listarPendientesResena).mockResolvedValue({ pendientes: [] });
    render(<PendientesResena />);
    await act(async () => undefined);
    expect(screen.queryByText("Califica lo que pediste")).toBeNull();
  });
});

describe("formulario de calificación (LB-79)", () => {
  it("no deja publicar sin estrellas", async () => {
    const dialogo = await abrirFormulario();
    expect(
      within(dialogo).getByRole("button", { name: "Publicar reseña" }),
    ).toBeDisabled();
  });

  it("muestra el contador y bloquea más de 500 caracteres", async () => {
    const dialogo = await abrirFormulario();
    fireEvent.click(within(dialogo).getByLabelText("5 estrellas"));
    const comentario = within(dialogo).getByLabelText("Comentario (opcional)");

    fireEvent.change(comentario, { target: { value: "Muy rica" } });
    expect(within(dialogo).getByText("8/500")).toBeVisible();

    fireEvent.change(comentario, { target: { value: "a".repeat(501) } });
    expect(within(dialogo).getByText(/501\/500/)).toBeVisible();
    expect(comentario).toHaveAttribute("aria-invalid", "true");
    expect(
      within(dialogo).getByRole("button", { name: "Publicar reseña" }),
    ).toBeDisabled();
  });

  it("publica, avisa y quita el platillo de la lista", async () => {
    vi.mocked(publicarResena).mockResolvedValue({
      ok: true,
      mensaje: "Reseña publicada correctamente",
    });
    const dialogo = await abrirFormulario();
    fireEvent.click(within(dialogo).getByLabelText("4 estrellas"));
    fireEvent.change(within(dialogo).getByLabelText("Comentario (opcional)"), {
      target: { value: "Rica" },
    });
    await act(async () =>
      fireEvent.click(
        within(dialogo).getByRole("button", { name: "Publicar reseña" }),
      ),
    );

    expect(publicarResena).toHaveBeenCalledWith({
      pedidoId: 121,
      platilloId: 10,
      estrellas: 4,
      comentario: "Rica",
    });
    expect(
      await screen.findByText("Reseña publicada correctamente"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Calificar Pupusas" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Calificar Yuca frita" }),
    ).toBeVisible();
  });

  it("si ya lo reseñó lo indica y lo quita", async () => {
    vi.mocked(publicarResena).mockResolvedValue({
      ok: false,
      yaResenado: true,
      error: "Ya reseñaste este platillo en este pedido.",
    });
    const dialogo = await abrirFormulario();
    fireEvent.click(within(dialogo).getByLabelText("3 estrellas"));
    await act(async () =>
      fireEvent.click(
        within(dialogo).getByRole("button", { name: "Publicar reseña" }),
      ),
    );
    expect(
      await screen.findByText("Ya reseñaste este platillo en este pedido."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Calificar Pupusas" }),
    ).toBeNull();
  });

  it("muestra el error del plazo dentro del formulario", async () => {
    vi.mocked(publicarResena).mockResolvedValue({
      ok: false,
      error: "Solo puedes calificar pedidos pagados en los últimos 7 días.",
    });
    const dialogo = await abrirFormulario();
    fireEvent.click(within(dialogo).getByLabelText("5 estrellas"));
    await act(async () =>
      fireEvent.click(
        within(dialogo).getByRole("button", { name: "Publicar reseña" }),
      ),
    );
    expect(
      within(dialogo).getByText(
        "Solo puedes calificar pedidos pagados en los últimos 7 días.",
      ),
    ).toBeVisible();
  });

  it("sin sesión lleva a iniciar sesión", async () => {
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
