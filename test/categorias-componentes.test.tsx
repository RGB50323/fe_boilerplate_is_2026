import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DialogoDeshabilitar } from "@/components/categorias/dialogo-deshabilitar";
import { FormularioCategoria } from "@/components/categorias/formulario-categoria";
import { PanelPlatillos } from "@/components/categorias/panel-platillos";
import { TablaCategorias } from "@/components/categorias/tabla-categorias";
import type { Categoria } from "@/lib/categorias";

const mocks = vi.hoisted(() => ({
  listarPlatillosDeCategoria: vi.fn(),
  cambiarCategoriaDePlatillo: vi.fn(),
}));

vi.mock("@/app/actions/categorias", () => mocks);

const entradas: Categoria = {
  id: 1,
  nombre: "Entradas",
  activa: true,
  deshabilitadaEn: null,
  platillosActivos: 2,
};
const bebidas: Categoria = {
  id: 3,
  nombre: "Bebidas",
  activa: true,
  deshabilitadaEn: null,
  platillosActivos: 1,
};
const temporada: Categoria = {
  id: 5,
  nombre: "Temporada",
  activa: false,
  deshabilitadaEn: "2026-11-01T00:00:00.000Z",
  platillosActivos: 0,
};

beforeEach(() => {
  mocks.listarPlatillosDeCategoria.mockReset();
  mocks.cambiarCategoriaDePlatillo.mockReset();
});

describe("FormularioCategoria", () => {
  it("no guarda y avisa que el nombre es obligatorio si está vacío", async () => {
    const onGuardar = vi.fn();
    render(
      <FormularioCategoria abierto onCerrar={vi.fn()} onGuardar={onGuardar} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(
      await screen.findByText("El nombre de la categoría es obligatorio."),
    ).toBeInTheDocument();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it("guarda con el nombre recortado", async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(
      <FormularioCategoria abierto onCerrar={vi.fn()} onGuardar={onGuardar} />,
    );

    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "  Típicos  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    await waitFor(() => expect(onGuardar).toHaveBeenCalledWith("Típicos"));
  });

  it("muestra el error 409 del servidor", async () => {
    const onGuardar = vi
      .fn()
      .mockResolvedValue("Ya existe una categoría con ese nombre.");
    render(
      <FormularioCategoria abierto onCerrar={vi.fn()} onGuardar={onGuardar} />,
    );

    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "Entradas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(
      await screen.findByText("Ya existe una categoría con ese nombre."),
    ).toBeInTheDocument();
  });

  it("muestra el estado de carga mientras guarda", async () => {
    let terminar!: (mensaje?: string) => void;
    const onGuardar = vi.fn().mockReturnValue(
      new Promise<string | undefined>((resolver) => {
        terminar = resolver;
      }),
    );
    render(
      <FormularioCategoria abierto onCerrar={vi.fn()} onGuardar={onGuardar} />,
    );

    fireEvent.change(screen.getByLabelText("Nombre *"), {
      target: { value: "Típicos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(
      await screen.findByRole("button", { name: "Guardando..." }),
    ).toBeDisabled();

    await act(async () => terminar(undefined));
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeEnabled();
  });

  it("al renombrar muestra el nombre actual", () => {
    render(
      <FormularioCategoria
        abierto
        categoria={{ id: 6, nombre: "Típicos" }}
        onCerrar={vi.fn()}
        onGuardar={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Nombre *")).toHaveValue("Típicos");
    expect(screen.getByText("Renombrar categoría")).toBeInTheDocument();
  });
});

describe("DialogoDeshabilitar", () => {
  it("no muestra nada si no hay categoría", () => {
    render(
      <DialogoDeshabilitar
        categoria={null}
        onCerrar={vi.fn()}
        onConfirmar={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pide confirmación indicando la categoría", () => {
    render(
      <DialogoDeshabilitar
        categoria={{ id: 2, nombre: "Entradas" }}
        onCerrar={vi.fn()}
        onConfirmar={vi.fn()}
      />,
    );

    expect(
      screen.getByText("¿Deshabilitar esta categoría?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/dejará de mostrarse/)).toBeInTheDocument();
  });

  it("muestra el error 422 del servidor", async () => {
    const mensaje =
      "Esta categoría tiene platillos asociados. Reasígnalos antes de deshabilitarla.";
    const onConfirmar = vi.fn().mockResolvedValue(mensaje);
    render(
      <DialogoDeshabilitar
        categoria={{ id: 2, nombre: "Entradas" }}
        onCerrar={vi.fn()}
        onConfirmar={onConfirmar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
  });

  it("muestra el estado de carga mientras deshabilita", async () => {
    const onConfirmar = vi.fn().mockReturnValue(new Promise(() => {}));
    render(
      <DialogoDeshabilitar
        categoria={{ id: 2, nombre: "Entradas" }}
        onCerrar={vi.fn()}
        onConfirmar={onConfirmar}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(
      await screen.findByRole("button", { name: "Deshabilitando..." }),
    ).toBeDisabled();
  });
});

describe("PanelPlatillos", () => {
  it("muestra el estado de carga y luego los platillos", async () => {
    mocks.listarPlatillosDeCategoria.mockResolvedValue({
      ok: true,
      datos: [{ id: 5, nombre: "Pupusa revuelta" }],
    });
    render(
      <PanelPlatillos
        categoria={entradas}
        destinos={[entradas, bebidas]}
        onCerrar={vi.fn()}
        onCambio={vi.fn()}
      />,
    );

    expect(screen.getByText("Cargando platillos...")).toBeInTheDocument();
    expect(await screen.findByText("Pupusa revuelta")).toBeInTheDocument();
  });

  it("avisa cuando la categoría no tiene platillos activos", async () => {
    mocks.listarPlatillosDeCategoria.mockResolvedValue({ ok: true, datos: [] });
    render(
      <PanelPlatillos
        categoria={entradas}
        destinos={[entradas, bebidas]}
        onCerrar={vi.fn()}
        onCambio={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("Esta categoría no tiene platillos activos."),
    ).toBeInTheDocument();
  });

  it("muestra el error si no se pueden cargar", async () => {
    mocks.listarPlatillosDeCategoria.mockResolvedValue({
      ok: false,
      error: "La categoría no existe.",
    });
    render(
      <PanelPlatillos
        categoria={entradas}
        destinos={[entradas, bebidas]}
        onCerrar={vi.fn()}
        onCambio={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("La categoría no existe."),
    ).toBeInTheDocument();
  });

  it("mueve un platillo a otra categoría y lo quita de la lista", async () => {
    mocks.listarPlatillosDeCategoria.mockResolvedValue({
      ok: true,
      datos: [
        { id: 5, nombre: "Pupusa revuelta" },
        { id: 8, nombre: "Alitas BBQ" },
      ],
    });
    mocks.cambiarCategoriaDePlatillo.mockResolvedValue({
      ok: true,
      datos: { platilloId: 5, categoriaId: 3 },
    });
    const onCambio = vi.fn();
    render(
      <PanelPlatillos
        categoria={entradas}
        destinos={[entradas, bebidas]}
        onCerrar={vi.fn()}
        onCambio={onCambio}
      />,
    );
    await screen.findByText("Pupusa revuelta");

    fireEvent.change(
      screen.getByLabelText("Mover Pupusa revuelta a otra categoría"),
      { target: { value: "3" } },
    );

    await waitFor(() =>
      expect(mocks.cambiarCategoriaDePlatillo).toHaveBeenCalledWith(5, 3),
    );
    await waitFor(() =>
      expect(screen.queryByText("Pupusa revuelta")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Alitas BBQ")).toBeInTheDocument();
    expect(onCambio).toHaveBeenCalledTimes(1);
  });

  it("muestra el error del servidor si no se puede mover", async () => {
    mocks.listarPlatillosDeCategoria.mockResolvedValue({
      ok: true,
      datos: [{ id: 5, nombre: "Pupusa revuelta" }],
    });
    mocks.cambiarCategoriaDePlatillo.mockResolvedValue({
      ok: false,
      error: "La categoría destino está deshabilitada.",
    });
    const onCambio = vi.fn();
    render(
      <PanelPlatillos
        categoria={entradas}
        destinos={[entradas, bebidas]}
        onCerrar={vi.fn()}
        onCambio={onCambio}
      />,
    );
    await screen.findByText("Pupusa revuelta");

    fireEvent.change(
      screen.getByLabelText("Mover Pupusa revuelta a otra categoría"),
      { target: { value: "3" } },
    );

    expect(
      await screen.findByText("La categoría destino está deshabilitada."),
    ).toBeInTheDocument();
    expect(screen.getByText("Pupusa revuelta")).toBeInTheDocument();
    expect(onCambio).not.toHaveBeenCalled();
  });
});

describe("TablaCategorias", () => {
  it("no muestra Deshabilitar en las categorías ya deshabilitadas", () => {
    render(
      <TablaCategorias
        categorias={[entradas, temporada]}
        onVer={vi.fn()}
        onRenombrar={vi.fn()}
        onDeshabilitar={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Deshabilitar Entradas" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Deshabilitar Temporada" }),
    ).not.toBeInTheDocument();
  });
});
